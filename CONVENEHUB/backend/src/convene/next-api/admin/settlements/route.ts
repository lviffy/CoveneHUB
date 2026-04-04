import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Decimal from 'decimal.js';

interface Profile {
  role: string;
}

interface Event {
  event_id: string;
  title: string;
  status: string;
  ticket_price: number;
  convene_commission_percentage: number;
  settlement_status: string | null;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
}

interface Booking {
  booking_id: string;
  tickets_count: number;
  total_amount: number;
  payment_status: string;
}

interface SettlementResult {
  success: boolean;
  error?: string;
  settlement_id?: string;
  event_id?: string;
}

/**
 * POST /api/admin/settlements
 * Mark an event as settled (paid to movie team)
 * 
 * Required: CONVENEHUB team role
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify CONVENEHUB team role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<Profile>();

    if (profileError || !profile || profile.role !== 'eon_team') {
      return NextResponse.json(
        { error: 'Forbidden - CONVENEHUB team access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      event_id,
      transaction_reference,
      transfer_date,
      payment_method = 'bank_transfer',
      notes = '',
    } = body;

    // Validate required fields
    if (!event_id || !transaction_reference || !transfer_date) {
      return NextResponse.json(
        { error: 'Missing required fields: event_id, transaction_reference, transfer_date' },
        { status: 400 }
      );
    }

    // Validate transaction_reference length (max 100 characters)
    if (transaction_reference.length > 100) {
      return NextResponse.json(
        { error: 'Transaction reference too long (max 100 characters)' },
        { status: 400 }
      );
    }

    // Validate notes length (max 1000 characters)
    if (notes && notes.length > 1000) {
      return NextResponse.json(
        { error: 'Notes too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    // Validate payment method whitelist
    const validPaymentMethods = ['bank_transfer', 'upi', 'check', 'cash', 'other'];
    if (!validPaymentMethods.includes(payment_method)) {
      return NextResponse.json(
        { error: 'Invalid payment method. Must be one of: bank_transfer, upi, check, cash, other' },
        { status: 400 }
      );
    }

    // Validate date format
    const transferDate = new Date(transfer_date);
    if (isNaN(transferDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid transfer_date format' },
        { status: 400 }
      );
    }

    // Prevent future dates (allow up to today)
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (transferDate > today) {
      return NextResponse.json(
        { error: 'Transfer date cannot be in the future' },
        { status: 400 }
      );
    }

    // Fetch event and calculate financials
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('event_id, title, status, ticket_price, convene_commission_percentage, settlement_status')
      .eq('event_id', event_id)
      .single<Event>();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Verify event is eligible for settlement
    if (!['ended', 'in_progress'].includes(event.status)) {
      return NextResponse.json(
        { error: 'Event must be completed or ended to settle' },
        { status: 400 }
      );
    }

    if (event.ticket_price <= 0) {
      return NextResponse.json(
        { error: 'Cannot settle free events' },
        { status: 400 }
      );
    }

    if (event.settlement_status === 'settled') {
      return NextResponse.json(
        { error: 'Event already settled' },
        { status: 400 }
      );
    }

    // Fetch confirmed bookings with successful payments
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        booking_id,
        tickets_count,
        total_amount,
        payment_status
      `)
      .eq('event_id', event_id)
      .eq('booking_status', 'confirmed')
      .eq('payment_status', 'SUCCESSFUL')
      .returns<Booking[]>();

    if (bookingsError) {
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json(
        { error: 'No confirmed paid bookings found for this event' },
        { status: 400 }
      );
    }

    // Calculate financial summary with Decimal.js
    let grossRevenue = new Decimal(0);

    for (const booking of bookings) {
      if (booking.total_amount) {
        grossRevenue = grossRevenue.plus(new Decimal(booking.total_amount));
      }
    }

    // Calculate fees and commission using event-specific commission rate
    const eventCommissionPercentage = event.convene_commission_percentage || 10;
    const razorpayFees = grossRevenue.times(0.02);
    const conveneCommission = grossRevenue.times(eventCommissionPercentage / 100);
    const netPayout = grossRevenue.minus(razorpayFees).minus(conveneCommission);

    // Round to 2 decimal places
    const financials = {
      gross_revenue: parseFloat(grossRevenue.toFixed(2)),
      razorpay_fees: parseFloat(razorpayFees.toFixed(2)),
      convene_commission: parseFloat(conveneCommission.toFixed(2)),
      net_payout: parseFloat(netPayout.toFixed(2)),
    };

    // Call database function to create settlement
    const { data: rawResult, error: settlementError } = await supabase.rpc(
      'mark_event_as_settled',
      {
        p_event_id: event_id,
        p_gross_revenue: financials.gross_revenue,
        p_razorpay_fees: financials.razorpay_fees,
        p_convene_commission: financials.convene_commission,
        p_net_payout: financials.net_payout,
        p_transaction_reference: transaction_reference,
        p_transfer_date: transfer_date,
        p_payment_method: payment_method,
        p_notes: notes || null,
        p_settled_by: user.id,
      } as any
    );

    const result = rawResult as SettlementResult | null;

    if (settlementError) {
      return NextResponse.json(
        { error: 'Failed to create settlement', details: settlementError.message },
        { status: 500 }
      );
    }

    // Check if function returned success
    if (!result?.success) {
      return NextResponse.json(
        { error: result?.error || 'Failed to create settlement' },
        { status: 400 }
      );
    }

    // Return success with settlement details
    return NextResponse.json({
      success: true,
      settlement: {
        id: result.settlement_id,
        event_id: event_id,
        event_title: event.title,
        ...financials,
        transaction_reference,
        transfer_date,
        payment_method,
        notes,
        settled_by: user.id,
        settled_at: new Date().toISOString(),
      },
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/settlements?event_id={id}
 * Get settlement details for an event
 * 
 * Required: CONVENEHUB team role
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify CONVENEHUB team role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single<Profile>();

    if (profileError || !profile || profile.role !== 'eon_team') {
      return NextResponse.json(
        { error: 'Forbidden - CONVENEHUB team access required' },
        { status: 403 }
      );
    }

    // Get event_id from query params
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing event_id parameter' },
        { status: 400 }
      );
    }

    // Fetch settlement with settler profile
    const { data: settlement, error: settlementError } = await supabase
      .from('settlements')
      .select(`
        *,
        events (
          id,
          title,
          event_date,
          status
        ),
        settler:profiles!settlements_settled_by_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('event_id', eventId)
      .single();

    if (settlementError) {
      if (settlementError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Settlement not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch settlement' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      settlement,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
