import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DELETE /api/bookings/[bookingId] - Delete a pending booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const bookingId = params.bookingId;

    // Get booking details
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('booking_id, user_id, event_id, tickets_count, payment_status, booking_status')
      .eq('booking_id', bookingId)
      .single() as {
        data: {
          booking_id: string;
          user_id: string;
          event_id: string;
          tickets_count: number;
          payment_status: string;
          booking_status: string;
        } | null;
        error: any;
      };

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify user owns this booking
    if (booking.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Only allow deletion of pending bookings
    if (booking.payment_status !== 'PENDING' && booking.payment_status !== 'pending') {
      return NextResponse.json(
        { error: 'Cannot delete confirmed bookings' },
        { status: 400 }
      );
    }

    // Restore event capacity
    const { data: eventData, error: eventFetchError } = await supabase
      .from('events')
      .select('remaining')
      .eq('event_id', booking.event_id)
      .single() as { data: { remaining: number } | null; error: any };

    if (!eventFetchError && eventData) {
      const newRemaining = eventData.remaining + booking.tickets_count;
      const { error: capacityError } = await (supabase
        .from('events') as any)
        .update({ remaining: newRemaining })
        .eq('event_id', booking.event_id);

      if (capacityError) {
      }
    }

    // Delete the booking (CASCADE will delete associated records)
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('booking_id', bookingId);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete booking' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Booking deleted successfully',
      tickets_released: booking.tickets_count,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
