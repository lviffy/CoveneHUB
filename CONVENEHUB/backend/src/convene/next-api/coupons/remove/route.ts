import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/coupons/remove
 * Removes an applied coupon from a booking
 * Restores original pricing and deletes usage tracking
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing bookingId' },
        { status: 400 }
      );
    }

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, coupon_id, original_amount')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const bookingData = booking as any;
    if (bookingData.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this booking' },
        { status: 403 }
      );
    }

    if (!bookingData.coupon_id) {
      return NextResponse.json(
        { error: 'No coupon applied to this booking' },
        { status: 400 }
      );
    }

    // Remove coupon from booking (restore original pricing)
    // Type cast until Supabase types regenerated after migration
    const { error: updateError } = await (supabase
      .from('bookings') as any)
      .update({
        coupon_id: null,
        discount_amount: 0,
        total_amount: bookingData.original_amount, // Restore to original amount
      })
      .eq('id', bookingId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to remove coupon' },
        { status: 500 }
      );
    }

    // Delete usage tracking record (triggers will decrement coupon usage count)
    const { error: deleteError } = await supabase
      .from('coupon_usage')
      .delete()
      .eq('booking_id', bookingId)
      .eq('coupon_id', bookingData.coupon_id);

    if (deleteError) {
      // Not critical - booking is already updated
    }

    return NextResponse.json({
      success: true,
      message: 'Coupon removed successfully',
      newTotalAmount: bookingData.original_amount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
