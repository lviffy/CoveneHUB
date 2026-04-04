import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/coupons/validate
 * Validates a coupon code for a specific booking scenario
 * Returns discount calculation if valid, error message if invalid
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
    const { couponCode, eventId, ticketsCount, originalAmount } = body;

    // Validate required fields
    if (!couponCode || !eventId || !ticketsCount || !originalAmount) {
      return NextResponse.json(
        { error: 'Missing required fields: couponCode, eventId, ticketsCount, originalAmount' },
        { status: 400 }
      );
    }

    // Validate numeric inputs
    if (ticketsCount <= 0 || originalAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid tickets count or amount' },
        { status: 400 }
      );
    }

    // Call database validation function
    // Type cast needed until Supabase types are regenerated after migration
    const { data, error } = await supabase.rpc('validate_and_calculate_coupon' as any, {
      p_coupon_code: couponCode.trim().toUpperCase(),
      p_event_id: eventId,
      p_user_id: user.id,
      p_tickets_count: ticketsCount,
      p_original_amount: originalAmount,
    } as any);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to validate coupon' },
        { status: 500 }
      );
    }

    // Return validation result
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
