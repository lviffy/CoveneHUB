import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get user for authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Reconciliation] User authenticated:', user.id);

    // Verify user is admin
    const { data: profile, error: profileError } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null; error: any };

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    if (!profile || profile.role !== 'eon_team') {
      console.error('User is not admin:', profile?.role);
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    console.log('[Reconciliation] User is admin, fetching events...');

    // Fetch all ended or ongoing events with financial data
    const { data: events, error: eventsError } = await (supabase as any)
      .from('events')
      .select('event_id, title, date_time, status')
      .in('status', ['ended', 'in_progress'])
      .order('date_time', { ascending: false }) as { data: any[] | null; error: any };

    console.log('[Reconciliation] Events fetch result:', {
      count: events?.length,
      error: eventsError
    });

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return NextResponse.json(
        { error: 'Failed to fetch events', details: eventsError.message },
        { status: 500 }
      );
    }

    // Fetch bookings for these events
    const eventIds = (events || []).map((e: any) => e.event_id);

    console.log('[Reconciliation] Fetching bookings for events:', eventIds);

    let bookings: any[] = [];
    let checkins: any[] = [];

    if (eventIds.length > 0) {
      const { data: bookingsData, error: bookingsError } = await (supabase as any)
        .from('bookings')
        .select('booking_id, event_id, payment_status, tickets_count')
        .in('event_id', eventIds) as { data: any[] | null; error: any };

      console.log('[Reconciliation] Bookings fetch result:', {
        count: bookingsData?.length,
        error: bookingsError
      });

      if (!bookingsError && bookingsData) {
        bookings = bookingsData;
      }

      const bookingIds = bookings.map((b: any) => b.booking_id);

      console.log('[Reconciliation] Fetching checkins for bookings:', bookingIds);

      if (bookingIds.length > 0) {
        const { data: checkinsData, error: checkinsError } = await (supabase as any)
          .from('checkins')
          .select('checkin_id, booking_id')
          .in('booking_id', bookingIds) as { data: any[] | null; error: any };

        console.log('[Reconciliation] Checkins fetch result:', {
          count: checkinsData?.length,
          error: checkinsError
        });

        if (!checkinsError && checkinsData) {
          checkins = checkinsData;
        }
      }
    }

    // Process reconciliation data
    const reconciliationData = (events || []).map((event: any) => {
      const eventBookings = bookings.filter((b: any) => b.event_id === event.event_id);
      const eventCheckins = checkins.filter((c: any) => {
        return eventBookings.some((b: any) => b.booking_id === c.booking_id);
      });

      const totalBookings = eventBookings.length;
      const totalCheckins = eventCheckins.length;
      const paidBookings = eventBookings.filter((b: any) => b.payment_status === 'SUCCESSFUL' || b.payment_status === 'PAID').length;
      const freeBookings = eventBookings.filter((b: any) => !b.payment_status || b.payment_status === 'FREE').length;
      const pendingPayments = eventBookings.filter((b: any) => b.payment_status === 'PENDING').length;
      const failedPayments = eventBookings.filter((b: any) => b.payment_status === 'FAILED').length;
      const noShows = totalBookings - totalCheckins;

      // Determine reconciliation status
      let reconciliationStatus: 'matched' | 'discrepancy' | 'pending' = 'matched';
      let discrepancyReason: string | undefined;

      if (totalBookings > 0 && noShows > totalBookings * 0.2) {
        reconciliationStatus = 'discrepancy';
        discrepancyReason = 'High no-show rate (>20%)';
      } else if (pendingPayments > 0) {
        reconciliationStatus = 'pending';
        discrepancyReason = 'Pending payments to be resolved';
      }

      return {
        event_id: event.event_id,
        event_title: event.title,
        event_date: event.date_time,
        total_bookings: totalBookings,
        total_checkins: totalCheckins,
        no_shows: noShows,
        paid_bookings: paidBookings,
        free_bookings: freeBookings,
        pending_payments: pendingPayments,
        failed_payments: failedPayments,
        gross_revenue: 0,
        reconciliation_status: reconciliationStatus,
        discrepancy_reason: discrepancyReason,
        checkin_to_payment_ratio: totalBookings > 0 ? (totalCheckins / totalBookings) * 100 : 0,
      };
    });

    // Calculate summary
    const totalBookings = reconciliationData.reduce((sum: number, e: any) => sum + e.total_bookings, 0);
    const totalCheckins = reconciliationData.reduce((sum: number, e: any) => sum + e.total_checkins, 0);
    const matchedEvents = reconciliationData.filter((e: any) => e.reconciliation_status === 'matched').length;
    const discrepancyEvents = reconciliationData.filter((e: any) => e.reconciliation_status === 'discrepancy').length;
    const pendingEvents = reconciliationData.filter((e: any) => e.reconciliation_status === 'pending').length;

    // Identify discrepancy types
    const discrepancies = [];
    const highNoShowEvents = reconciliationData.filter((e: any) => e.no_shows > e.total_bookings * 0.2);
    if (highNoShowEvents.length > 0) {
      discrepancies.push({
        type: 'high_no_show',
        count: highNoShowEvents.length,
        description: 'High no-show rate detected',
      });
    }

    const pendingPaymentEvents = reconciliationData.filter((e: any) => e.pending_payments > 0);
    if (pendingPaymentEvents.length > 0) {
      discrepancies.push({
        type: 'pending_payments',
        count: pendingPaymentEvents.reduce((sum: number, e: any) => sum + e.pending_payments, 0),
        description: 'Pending payments awaiting verification',
      });
    }

    return NextResponse.json({
      events: reconciliationData,
      summary: {
        total_events: reconciliationData.length,
        matched_events: matchedEvents,
        discrepancy_events: discrepancyEvents,
        pending_events: pendingEvents,
        total_bookings: totalBookings,
        total_checkins: totalCheckins,
        overall_checkin_rate: totalBookings > 0 ? (totalCheckins / totalBookings) * 100 : 0,
        discrepancies,
      },
    });
  } catch (error: any) {
    console.error('Reconciliation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
