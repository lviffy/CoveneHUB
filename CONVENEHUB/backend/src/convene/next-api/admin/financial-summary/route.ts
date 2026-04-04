import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';
import Decimal from 'decimal.js';

// Financial constants
const RAZORPAY_FEE_PERCENTAGE = 2; // 2%

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is CONVENEHUB team member
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null; error: any };

    if (profileError || !profile || profile.role !== 'admin_team') {
      return NextResponse.json(
        { error: 'Forbidden: CONVENEHUB team access only' },
        { status: 403 }
      );
    }

    // Fetch all completed/ended events with their bookings and payments
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(`
        event_id,
        title,
        date_time,
        venue_name,
        city,
        capacity,
        ticket_price,
        convene_commission_percentage,
        status,
        settlement_status,
        bookings!inner(
          booking_id,
          tickets_count,
          total_amount,
          booking_status,
          payment_required,
          payment_status,
          booked_at
        ),
        movie_team_assignments(
          assignment_id,
          user_id,
          profiles!movie_team_assignments_user_id_fkey(
            id,
            full_name,
            role
          )
        )
      `)
      .in('status', ['ended', 'in_progress'])
      .order('date_time', { ascending: false });

    if (eventsError) {
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    // Fetch settlement details separately for settled events
    const settledEventIds = events?.filter((e: any) => e.settlement_status === 'settled').map((e: any) => e.event_id) || [];
    
    let settlementsMap = new Map();
    if (settledEventIds.length > 0) {
      const { data: settlements, error: settlementsError } = await supabase
        .from('settlements')
        .select('event_id, transaction_reference, transfer_date, payment_method, notes')
        .in('event_id', settledEventIds);
      
      if (!settlementsError && settlements) {
        settlements.forEach((settlement: any) => {
          settlementsMap.set(settlement.event_id, settlement);
        });
      } else {
      }
    }

    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No completed events found',
        events: [],
        summary: {
          total_events: 0,
          total_tickets_sold: 0,
          total_gross_revenue: 0,
          total_razorpay_fees: 0,
          total_convene_commission: 0,
          total_net_payout: 0,
        },
      });
    }

    // Calculate financials for each event
    const eventsWithFinancials = events.map((event: any) => {
      const bookings = event.bookings || [];
      
      // Filter confirmed bookings only
      const confirmedBookings = bookings.filter(
        (b: any) => b.booking_status === 'confirmed'
      );

      // Calculate totals
      const totalTicketsSold = confirmedBookings.reduce(
        (sum: number, b: any) => sum + (b.tickets_count || 0),
        0
      );

      const grossRevenue = confirmedBookings.reduce(
        (sum: number, b: any) => sum + (b.total_amount || 0),
        0
      );

      // Calculate fees using Decimal.js for precision
      // Use event-specific commission percentage
      const eventCommissionPercentage = event.convene_commission_percentage || 10;
      const grossDecimal = new Decimal(grossRevenue);
      const razorpayFees = grossDecimal.mul(RAZORPAY_FEE_PERCENTAGE).div(100);
      const conveneCommission = grossDecimal.mul(eventCommissionPercentage).div(100);
      const netPayout = grossDecimal.minus(razorpayFees).minus(conveneCommission);

      // Count payment statuses
      const paidBookings = confirmedBookings.filter(
        (b: any) => !b.payment_required || b.payment_status === 'paid'
      ).length;
      const freeBookings = confirmedBookings.filter(
        (b: any) => !b.payment_required
      ).length;

      return {
        event_id: event.event_id,
        title: event.title,
        date_time: event.date_time,
        venue_name: event.venue_name,
        city: event.city,
        capacity: event.capacity,
        ticket_price: event.ticket_price || 0,
        status: event.status,
        settlement_status: event.settlement_status,
        settlement_details: settlementsMap.has(event.event_id) ? {
          transaction_reference: settlementsMap.get(event.event_id).transaction_reference,
          transfer_date: settlementsMap.get(event.event_id).transfer_date,
          payment_method: settlementsMap.get(event.event_id).payment_method,
          notes: settlementsMap.get(event.event_id).notes,
        } : null,
        assigned_team_members: (event.movie_team_assignments || []).map((assignment: any) => ({
          id: assignment.profiles.id,
          full_name: assignment.profiles.full_name,
          role: assignment.profiles.role,
        })),
        financial_summary: {
          total_bookings: confirmedBookings.length,
          total_tickets_sold: totalTicketsSold,
          free_bookings: freeBookings,
          paid_bookings: paidBookings,
          gross_revenue: parseFloat(grossDecimal.toFixed(2)),
          razorpay_fees: parseFloat(razorpayFees.toFixed(2)),
          razorpay_fee_percentage: RAZORPAY_FEE_PERCENTAGE,
          convene_commission: parseFloat(conveneCommission.toFixed(2)),
          convene_commission_percentage: eventCommissionPercentage,
          net_payout_to_movie_team: parseFloat(netPayout.toFixed(2)),
        },
        bookings: confirmedBookings.map((b: any) => ({
          booking_id: b.booking_id,
          tickets_count: b.tickets_count,
          total_amount: b.total_amount,
          booking_status: b.booking_status,
          payment_required: b.payment_required,
          payment_status: b.payment_status,
          booked_at: b.booked_at,
        })),
      };
    });

    // Calculate overall summary
    const summary = eventsWithFinancials.reduce(
      (acc: any, event: any) => {
        const fs = event.financial_summary;
        return {
          total_events: acc.total_events + 1,
          total_bookings: acc.total_bookings + fs.total_bookings,
          total_tickets_sold: acc.total_tickets_sold + fs.total_tickets_sold,
          total_gross_revenue: acc.total_gross_revenue + fs.gross_revenue,
          total_razorpay_fees: acc.total_razorpay_fees + fs.razorpay_fees,
          total_convene_commission: acc.total_convene_commission + fs.convene_commission,
          total_net_payout: acc.total_net_payout + fs.net_payout_to_movie_team,
        };
      },
      {
        total_events: 0,
        total_bookings: 0,
        total_tickets_sold: 0,
        total_gross_revenue: 0,
        total_razorpay_fees: 0,
        total_convene_commission: 0,
        total_net_payout: 0,
      }
    );

    // Round summary values
    summary.total_gross_revenue = parseFloat(summary.total_gross_revenue.toFixed(2));
    summary.total_razorpay_fees = parseFloat(summary.total_razorpay_fees.toFixed(2));
    summary.total_convene_commission = parseFloat(summary.total_convene_commission.toFixed(2));
    summary.total_net_payout = parseFloat(summary.total_net_payout.toFixed(2));

    return NextResponse.json({
      success: true,
      events: eventsWithFinancials,
      summary,
      fee_structure: {
        razorpay_fee_percentage: RAZORPAY_FEE_PERCENTAGE,
        convene_commission_note: 'Commission percentage varies per event',
      },
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
