import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * DELETE /api/bookings/[bookingId]/cancel
 * Cancel a pending payment booking
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
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

    const { bookingId } = await params;

    // ✅ FIX: Query with BOTH booking_id AND user_id to prevent IDOR
    // This ensures we only fetch bookings the user owns - data never leaks
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('booking_id, user_id, event_id, tickets_count, booking_status, payment_status, payment_required')
      .eq('booking_id', bookingId)
      .eq('user_id', user.id)  // ✅ FIX: Filter by user in query, not after
      .single() as {
        data: {
          booking_id: string;
          user_id: string;
          event_id: string;
          tickets_count: number;
          booking_status: string;
          payment_status: string;
          payment_required: boolean;
        } | null;
        error: any;
      };

    // ✅ FIX: Generic error - don't reveal if booking exists or not
    if (fetchError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },  // Same error for "doesn't exist" and "not yours"
        { status: 404 }
      );
    }

    // ✅ REMOVED: Separate auth check - already enforced by query filter above
    // No need to check booking.user_id !== user.id because query only returns user's bookings

    // Only allow cancellation of pending payments (regardless of booking_status)
    // This handles cases where booking_status might be 'confirmed' but payment is still PENDING
    if (booking.payment_status !== 'PENDING' && booking.payment_status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending payment bookings can be cancelled. Paid bookings cannot be cancelled.' },
        { status: 400 }
      );
    }


    // For pending payments, DELETE the booking completely (not just mark as cancelled)
    // This allows users to book again without duplicate constraint issues
    
    // 1. First, delete any associated payment records
    const { error: paymentDeleteError } = await (supabase
      .from('payments') as any)
      .delete()
      .eq('booking_id', bookingId);

    if (paymentDeleteError) {
    } else {
    }

    // 2. Delete any tickets associated with the booking (shouldn't exist for pending, but just in case)
    const { error: ticketsDeleteError } = await (supabase
      .from('tickets') as any)
      .delete()
      .eq('booking_id', bookingId);

    if (ticketsDeleteError) {
    } else {
    }

    // 3. Now delete the booking itself
    const { error: deleteError } = await (supabase
      .from('bookings') as any)
      .delete()
      .eq('booking_id', bookingId);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to cancel booking' },
        { status: 500 }
      );
    }


    // Note: No need to restore capacity for pending payments since they didn't reduce capacity
    // (due to the trigger fix we just applied)

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
      tickets_released: booking.tickets_count,
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
