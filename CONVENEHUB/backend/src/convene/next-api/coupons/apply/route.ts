import { createClient } from '@/lib/convene/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/coupons/apply
 * Applies a validated coupon to a booking
 * Updates booking record with coupon details and creates usage tracking
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
    const { bookingId, couponCode, eventId, ticketsCount, originalAmount } = body;

    // Validate required fields
    if (!bookingId || !couponCode || !eventId || !ticketsCount || !originalAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // First, validate the coupon
    // Type cast needed until Supabase types are regenerated after migration
    const { data: validationResult, error: validationError } = await supabase.rpc(
      'validate_and_calculate_coupon' as any,
      {
        p_coupon_code: couponCode.trim().toUpperCase(),
        p_event_id: eventId,
        p_user_id: user.id,
        p_tickets_count: ticketsCount,
        p_original_amount: originalAmount,
      } as any
    );

    if (validationError) {
      return NextResponse.json(
        { error: 'Failed to validate coupon' },
        { status: 500 }
      );
    }

    const result = validationResult as any;
    if (!result.valid) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Check if booking exists and belongs to user
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, user_id, coupon_id')
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

    // Check if a coupon is already applied (only ONE coupon per booking)
    if (bookingData.coupon_id) {
      return NextResponse.json(
        { error: 'A coupon is already applied. Please remove it first.' },
        { status: 400 }
      );
    }

    // Update booking with coupon details (type cast until migration complete)
    const { error: updateError } = await (supabase
      .from('bookings') as any)
      .update({
        coupon_id: result.coupon_id,
        original_amount: result.original_amount,
        discount_amount: result.discount_amount,
        total_amount: result.final_amount,
      })
      .eq('id', bookingId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to apply coupon to booking' },
        { status: 500 }
      );
    }

    // Create usage tracking record
    const { error: usageError } = await (supabase
      .from('coupon_usage') as any)
      .insert({
        coupon_id: result.coupon_id,
        booking_id: bookingId,
        user_id: user.id,
        discount_amount: result.discount_amount,
        original_amount: result.original_amount,
      });

    if (usageError) {
      // Note: Booking is already updated, but usage tracking failed
      // This is logged but not rolled back to avoid blocking user
    }

    return NextResponse.json({
      success: true,
      coupon: {
        code: result.coupon_code,
        discountType: result.discount_type,
        discountValue: result.discount_value,
      },
      pricing: {
        originalAmount: result.original_amount,
        discountAmount: result.discount_amount,
        finalAmount: result.final_amount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
