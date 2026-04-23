import { NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';

// PATCH /api/bookings/[bookingId]/update-tickets - Update ticket count for existing booking
export async function PATCH(
  request: Request,
  context: { params: Promise<{ bookingId: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to update booking.' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const bookingId = params.bookingId;
    const body = await request.json();
    const { tickets_count } = body;

    if (!tickets_count || tickets_count < 1) {
      return NextResponse.json(
        { error: 'Tickets count must be at least 1' },
        { status: 400 }
      );
    }

    // Get the existing booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('booking_id, user_id, event_id, tickets_count, booking_status, checked_in')
      .eq('booking_id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const bookingData = booking as any;

    // Verify ownership
    if (bookingData.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only modify your own bookings' },
        { status: 403 }
      );
    }

    // Check if booking is cancelled
    if (bookingData.booking_status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot modify a cancelled booking' },
        { status: 400 }
      );
    }

    // Check if already checked in
    if (bookingData.checked_in) {
      return NextResponse.json(
        { error: 'Cannot modify a booking that has been checked in' },
        { status: 400 }
      );
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('capacity, status, ticket_price')
      .eq('event_id', bookingData.event_id)
      .single();

    if (eventError) {
      return NextResponse.json(
        { error: 'Event not found', details: eventError.message },
        { status: 404 }
      );
    }

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const eventData = event as any;

    // Check if event is still open for modifications
    if (eventData.status !== 'published') {
      return NextResponse.json(
        { error: 'Event is not available for booking modifications' },
        { status: 400 }
      );
    }

    // Calculate available slots
    const { data: allBookings } = await supabase
      .from('bookings')
      .select('tickets_count')
      .eq('event_id', bookingData.event_id)
      .neq('booking_status', 'cancelled')
      .neq('booking_id', bookingId); // Exclude current booking

    const totalTickets = allBookings?.reduce((sum: number, b: any) => sum + (b.tickets_count || 1), 0) ?? 0;
    const currentTicketsCount = bookingData.tickets_count || 1;
    const ticketDifference = tickets_count - currentTicketsCount;
    const availableSlots = eventData.capacity - totalTickets;

    // Only check availability if adding more tickets
    if (ticketDifference > 0 && ticketDifference > availableSlots) {
      return NextResponse.json(
        { error: `Only ${availableSlots} additional slots available. Cannot add ${ticketDifference} tickets.` },
        { status: 400 }
      );
    }

    // Calculate price difference if event is paid
    const oldAmount = (bookingData.tickets_count || 1) * (eventData.ticket_price || 0);
    const newAmount = tickets_count * (eventData.ticket_price || 0);

    // Update the booking
    const { error: updateError } = await supabase
      .from('bookings')
      // @ts-expect-error - Supabase generated types issue
      .update({
        tickets_count: tickets_count,
        total_amount: newAmount
      })
      .eq('booking_id', bookingId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update booking', details: updateError.message },
        { status: 500 }
      );
    }

    // Fetch the updated booking
    const { data: updatedBooking, error: fetchError } = await supabase
      .from('bookings')
      .select()
      .eq('booking_id', bookingId)
      .single();

    if (fetchError || !updatedBooking) {
      return NextResponse.json(
        { error: 'Failed to fetch updated booking' },
        { status: 500 }
      );
    }

    const updatedBookingData = updatedBooking as any;

    // Handle ticket creation/deletion based on count change
    // ticketDifference already calculated above
    
    if (ticketDifference > 0) {
      // Need to add more tickets
      const { data: existingTickets } = await supabase
        .from('tickets')
        .select('ticket_number')
        .eq('booking_id', bookingId)
        .order('ticket_number', { ascending: false })
        .limit(1);

      const lastTicketNumber = existingTickets && existingTickets.length > 0 
        ? (existingTickets[0] as any).ticket_number 
        : 0;

      // Create new tickets
      const newTickets = [];
      for (let i = 1; i <= ticketDifference; i++) {
        const ticketNumber = lastTicketNumber + i;
        // Generate ticket code from booking_id prefix if booking_code doesn't exist
        const bookingPrefix = updatedBookingData.booking_code || updatedBookingData.booking_id.substring(0, 8).toUpperCase();
        const ticketCode = `${bookingPrefix}-${ticketNumber}`;
        const qrNonce = Math.random().toString(36).substring(2, 18).toUpperCase();
        
        newTickets.push({
          booking_id: bookingId,
          ticket_number: ticketNumber,
          ticket_code: ticketCode,
          qr_nonce: qrNonce,
          checked_in: false,
        });
      }

      if (newTickets.length > 0) {
        // @ts-expect-error - Supabase generated types issue
        await supabase.from('tickets').insert(newTickets);
      }
    } else if (ticketDifference < 0) {
      // Need to remove tickets (remove from the end, highest ticket numbers)
      const ticketsToRemove = Math.abs(ticketDifference);
      
      // Get tickets to delete (highest ticket numbers, not checked in)
      const { data: ticketsToDelete } = await supabase
        .from('tickets')
        .select('ticket_id, checked_in')
        .eq('booking_id', bookingId)
        .order('ticket_number', { ascending: false })
        .limit(ticketsToRemove);

      if (ticketsToDelete && ticketsToDelete.length > 0) {
        // Check if any are already checked in
        const checkedInTickets = ticketsToDelete.filter((t: any) => t.checked_in);
        if (checkedInTickets.length > 0) {
          return NextResponse.json(
            { error: 'Cannot reduce tickets: some tickets are already checked in' },
            { status: 400 }
          );
        }

        // Delete the tickets
        const ticketIds = ticketsToDelete.map((t: any) => t.ticket_id);
        await supabase
          .from('tickets')
          .delete()
          .in('ticket_id', ticketIds);
      }
    }

    // Update event remaining count (recalculate total booked tickets)
    const { data: updatedAllBookings } = await supabase
      .from('bookings')
      .select('tickets_count')
      .eq('event_id', bookingData.event_id)
      .neq('booking_status', 'cancelled');

    const updatedTotalTickets = updatedAllBookings?.reduce((sum: number, b: any) => sum + (b.tickets_count || 1), 0) ?? 0;
    const newRemaining = eventData.capacity - updatedTotalTickets;

    await supabase
      .from('events')
      // @ts-expect-error - Supabase generated types issue
      .update({
        remaining: newRemaining
      })
      .eq('event_id', bookingData.event_id);

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      booking: updatedBooking,
      ticketChange: {
        old: bookingData.tickets_count,
        new: tickets_count,
        difference: ticketDifference
      },
      amountChange: {
        old: oldAmount,
        new: newAmount,
        difference: newAmount - oldAmount
      }
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
