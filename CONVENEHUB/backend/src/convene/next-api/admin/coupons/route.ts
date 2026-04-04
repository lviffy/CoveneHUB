import { createClient } from '@/lib/supabase/server';
import { checkAdminRole } from '@/lib/auth-helpers';
import { NextRequest, NextResponse } from 'next/server';
import { Coupon } from '@/types/database.types';

/**
 * GET /api/admin/coupons
 * Lists all coupons (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const { isAdmin } = await checkAdminRole();

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const supabase = await createClient();

    // Parse query parameters for filtering/sorting
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');
    const isActive = searchParams.get('is_active');
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const order = searchParams.get('order') || 'desc';

    // Build query - fetch coupons with their associated events
    let query = supabase
      .from('coupons')
      .select(`
        *,
        coupon_events (
          event_id,
          events (
            event_id,
            title
          )
        )
      `);

    // Apply filters
    if (eventId) {
      // Filter by coupon_events junction table
      query = query.eq('coupon_events.event_id', eventId);
    }
    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    // Apply sorting
    query = query.order(sortBy as any, { ascending: order === 'asc' });

    const { data: coupons, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
    }

    return NextResponse.json({ coupons: coupons as unknown as Coupon[] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/coupons
 * Creates a new coupon (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const { isAdmin, userId } = await checkAdminRole();

    if (!isAdmin || !userId) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const supabase = await createClient();

    // Parse request body
    const body = await request.json();
    const {
      code,
      discountType,
      discountValue,
      eventIds, // Now accepting array of event IDs
      usageLimit,
      perUserLimit,
      minTickets,
      validFrom,
      validUntil,
      isActive,
    } = body;

    // Validate required fields
    if (!code || !discountType || discountValue === undefined || !eventIds || eventIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: code, discountType, discountValue, eventIds' },
        { status: 400 }
      );
    }

    // Validate discount type and value
    if (!['percentage', 'fixed', 'free'].includes(discountType)) {
      return NextResponse.json({ error: 'Invalid discount type' }, { status: 400 });
    }

    if (discountType === 'percentage' && (discountValue <= 0 || discountValue > 100)) {
      return NextResponse.json({ error: 'Percentage must be between 0 and 100' }, { status: 400 });
    }

    if (discountType === 'fixed' && discountValue < 0) {
      return NextResponse.json({ error: 'Fixed discount cannot be negative' }, { status: 400 });
    }

    // Check if coupon code already exists
    const { data: existingCoupon } = await supabase
      .from('coupons')
      .select('id')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (existingCoupon) {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });
    }

    // Insert new coupon (event_id is now null, we use coupon_events table)
    const { data: newCoupon, error: insertError } = await supabase
      .from('coupons')
      .insert({
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: discountValue,
        event_id: null, // No longer using this column
        usage_limit: usageLimit || null,
        per_user_limit: perUserLimit !== undefined ? perUserLimit : 1,
        min_tickets: minTickets || 1,
        valid_from: validFrom || null,
        valid_until: validUntil || null,
        is_active: isActive !== undefined ? isActive : true,
        created_by: userId,
      } as any)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
    }

    // Insert coupon-event relationships
    const couponEventRecords = eventIds.map((eventId: string) => ({
      coupon_id: (newCoupon as any).id,
      event_id: eventId,
    }));

    const { error: couponEventsError } = await supabase
      .from('coupon_events')
      .insert(couponEventRecords);

    if (couponEventsError) {
      // Rollback: delete the coupon
      await supabase.from('coupons').delete().eq('id', (newCoupon as any).id);
      return NextResponse.json({ error: 'Failed to create coupon-event relationships' }, { status: 500 });
    }

    return NextResponse.json({ coupon: newCoupon as unknown as Coupon }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
