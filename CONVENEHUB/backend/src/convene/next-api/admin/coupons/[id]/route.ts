import { createClient } from '@/lib/supabase/server';
import { checkAdminRole } from '@/lib/auth-helpers';
import { NextRequest, NextResponse } from 'next/server';
import { Coupon } from '@/types/database.types';

/**
 * GET /api/admin/coupons/[id]
 * Get a specific coupon by ID (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAdmin } = await checkAdminRole();

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const supabase = await createClient();

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select(`
        *,
        events:event_id (
          event_id,
          title
        )
      `)
      .eq('id', params.id)
      .single();

    if (error || !coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    return NextResponse.json({ coupon: coupon as unknown as Coupon });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/coupons/[id]
 * Updates a coupon (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAdmin } = await checkAdminRole();

    if (!isAdmin) {
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

    // Build update object (only include provided fields)
    const updateData: any = {};
    
    if (code !== undefined) updateData.code = code.trim().toUpperCase();
    if (discountType !== undefined) updateData.discount_type = discountType;
    if (discountValue !== undefined) updateData.discount_value = discountValue;
    // event_id is deprecated, we use coupon_events table instead
    if (usageLimit !== undefined) updateData.usage_limit = usageLimit || null;
    if (perUserLimit !== undefined) updateData.per_user_limit = perUserLimit || null;
    if (minTickets !== undefined) updateData.min_tickets = minTickets;
    if (validFrom !== undefined) updateData.valid_from = validFrom || null;
    if (validUntil !== undefined) updateData.valid_until = validUntil || null;
    if (isActive !== undefined) updateData.is_active = isActive;

    // Validate discount if being updated
    if (discountType && discountValue !== undefined) {
      if (!['percentage', 'fixed', 'free'].includes(discountType)) {
        return NextResponse.json({ error: 'Invalid discount type' }, { status: 400 });
      }
      
      if (discountType === 'percentage' && (discountValue <= 0 || discountValue > 100)) {
        return NextResponse.json({ error: 'Percentage must be between 0 and 100' }, { status: 400 });
      }
    }

    // Update coupon (type cast needed until Supabase types regenerated)
    const { data: updatedCoupon, error: updateError } = await (supabase
      .from('coupons') as any)
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
    }

    if (!updatedCoupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });
    }

    // Update coupon-event relationships if eventIds provided
    if (eventIds && Array.isArray(eventIds) && eventIds.length > 0) {
      // Delete existing relationships
      await supabase
        .from('coupon_events')
        .delete()
        .eq('coupon_id', params.id);

      // Insert new relationships
      const couponEventRecords = eventIds.map((eventId: string) => ({
        coupon_id: parseInt(params.id),
        event_id: eventId,
      }));

      const { error: couponEventsError } = await (supabase
        .from('coupon_events') as any)
        .insert(couponEventRecords);

      if (couponEventsError) {
        return NextResponse.json({ error: 'Failed to update coupon-event relationships' }, { status: 500 });
      }
    }

    return NextResponse.json({ coupon: updatedCoupon as unknown as Coupon });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/coupons/[id]
 * Deletes a coupon (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAdmin } = await checkAdminRole();

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const supabase = await createClient();

    // Check if coupon is being used
    const { data: usageCount } = await supabase
      .from('coupon_usage')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', params.id);

    // Soft delete: deactivate instead of hard delete if coupon has usage
    if (usageCount && (usageCount as any).count > 0) {
      const { error: deactivateError } = await (supabase
        .from('coupons') as any)
        .update({ is_active: false })
        .eq('id', params.id);

      if (deactivateError) {
        return NextResponse.json({ error: 'Failed to deactivate coupon' }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Coupon has been deactivated (cannot delete coupons with usage history)',
      });
    }

    // Hard delete if no usage
    const { error: deleteError } = await supabase
      .from('coupons')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
