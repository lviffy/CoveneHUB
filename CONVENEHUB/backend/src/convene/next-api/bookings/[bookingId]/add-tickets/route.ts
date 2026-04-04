import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/bookings/[bookingId]/add-tickets
 * 
 * Adds additional tickets to an existing booking
 * 
 * Requirements:
 * - User must own the booking
 * - Booking must not be cancelled
 * - Booking must have successful payment (for paid events)
 * - Maximum 10 tickets per booking
 * - Event must have available capacity
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const supabase = await createClient();
    const { bookingId } = await params;
    
    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to add tickets.' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { additional_tickets } = body;

    // Validate input
    if (!additional_tickets || additional_tickets < 1) {
      return NextResponse.json(
        { error: 'Additional tickets must be at least 1' },
        { status: 400 }
      );
    }

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    console.log(`[ADD-TICKETS] User ${user.id} requesting ${additional_tickets} tickets for booking ${bookingId}`);

    // Get booking and event details first
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        events (
          event_id,
          title,
          ticket_price,
          venue_name,
          date_time,
          remaining,
          status
        )
      `)
      .eq('booking_id', bookingId)
      .eq('user_id', user.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found or you do not have permission to modify it' },
        { status: 404 }
      );
    }

    // Validate booking status
    if ((booking as any).booking_status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot add tickets to a cancelled booking' },
        { status: 400 }
      );
    }

    if ((booking as any).payment_required && 
        (booking as any).payment_status !== 'SUCCESSFUL' && 
        (booking as any).payment_status !== 'NOT_REQUIRED') {
      return NextResponse.json(
        { error: 'Please complete the payment for your existing booking before adding more tickets' },
        { status: 400 }
      );
    }

    const event = (booking as any)?.events;
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Validate event status
    if (event.status !== 'published' && event.status !== 'checkin_open') {
      return NextResponse.json(
        { error: 'Event is no longer accepting bookings' },
        { status: 400 }
      );
    }

    // Check capacity
    if (event.remaining < additional_tickets) {
      return NextResponse.json(
        { error: `Only ${event.remaining} slots remaining` },
        { status: 400 }
      );
    }

    // For FREE events, add tickets immediately
    if (event.ticket_price === 0) {
      const { data, error } = await (supabase.rpc as any)('add_tickets_to_booking', {
        p_booking_id: bookingId,
        p_user_id: user.id,
        p_additional_tickets: additional_tickets
      });

      if (error) {
        console.error('[ADD-TICKETS] Database error:', error);
        throw error;
      }

      const result = (data as any[])[0];
      
      return NextResponse.json({
        success: true,
        payment_required: false,
        booking: {
          booking_id: result.booking_id,
          booking_code: result.booking_code,
          new_tickets_count: result.new_tickets_count,
          new_total_amount: result.new_total_amount,
          tickets_added: result.new_tickets_created
        },
        message: `Successfully added ${additional_tickets} ticket${additional_tickets > 1 ? 's' : ''} to your booking!`
      });
    }

    // For PAID events, return payment info WITHOUT creating tickets yet
    const additionalAmount = event.ticket_price * additional_tickets;
    
    return NextResponse.json({
      success: true,
      payment_required: true,
      additional_amount: additionalAmount,
      additional_tickets: additional_tickets,
      booking: {
        booking_id: bookingId,
        booking_code: (booking as any).booking_code,
        current_tickets: (booking as any).tickets_count
      },
      event: event,
      message: `Please complete payment of ₹${additionalAmount.toFixed(2)} to add ${additional_tickets} ticket${additional_tickets > 1 ? 's' : ''}.`
    });

  } catch (error: any) {
    console.error('[ADD-TICKETS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while adding tickets' },
      { status: 500 }
    );
  }
}
