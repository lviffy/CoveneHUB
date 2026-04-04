import { NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';
import Razorpay from 'razorpay';
import Decimal from 'decimal.js';

/**
 * POST /api/bookings/[bookingId]/add-tickets/create-payment
 * 
 * Creates a Razorpay order for additional tickets
 * This is used when adding tickets to an existing booking on a paid event
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const supabase = await createClient();
    const { bookingId } = await params;

    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { additional_tickets, additional_amount } = body;

    if (!additional_tickets || additional_tickets < 1) {
      return NextResponse.json(
        { error: 'Invalid ticket count' },
        { status: 400 }
      );
    }

    if (!additional_amount || additional_amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Verify booking exists and user owns it
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        events (
          event_id,
          title,
          ticket_price,
          date_time,
          venue_name
        )
      `)
      .eq('booking_id', bookingId)
      .single() as { data: any; error: any };

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (booking.booking_status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot add tickets to cancelled booking' },
        { status: 400 }
      );
    }

    const event = booking.events;
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Verify the amount matches ticket price
    const expectedAmount = new Decimal(event.ticket_price).times(additional_tickets);
    const providedAmount = new Decimal(additional_amount);
    
    if (!providedAmount.equals(expectedAmount)) {
      return NextResponse.json(
        { error: 'Amount mismatch' },
        { status: 400 }
      );
    }

    // Initialize Razorpay
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('[PAYMENT] Razorpay credentials not configured');
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Convert to paise (smallest currency unit)
    const amountInPaise = providedAmount.times(100).toNumber();

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `add_${Date.now()}`,
      notes: {
        booking_id: bookingId,
        user_id: user.id,
        event_id: event.event_id,
        additional_tickets: additional_tickets.toString(),
        type: 'additional_tickets'
      },
    });

    console.log('[PAYMENT] Razorpay order created for additional tickets:', razorpayOrder.id);

    // Create payment record
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const { data: payment, error: paymentError } = await (supabase
      .from('payments') as any)
      .insert({
        booking_id: bookingId,
        razorpay_order_id: razorpayOrder.id,
        amount: additional_amount,
        currency: 'INR',
        status: 'PENDING',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (paymentError) {
      console.error('[PAYMENT] Error creating payment record:', paymentError);
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      order_id: razorpayOrder.id,
      amount: additional_amount,
      currency: 'INR',
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      payment_id: payment.id,
      booking: {
        booking_id: bookingId,
        booking_code: booking.booking_code,
      },
      event: {
        title: event.title,
        venue_name: event.venue_name,
        date_time: event.date_time,
      },
      additional_tickets,
    });

  } catch (error: any) {
    console.error('[PAYMENT] Error creating payment order:', error);
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
