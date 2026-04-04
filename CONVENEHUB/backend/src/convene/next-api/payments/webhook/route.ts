import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/lib/razorpay';
import { sendBookingConfirmationWithMultipleTickets } from '@/lib/email/service';
import { format } from 'date-fns';
import Razorpay from 'razorpay';

// Initialize Razorpay client for API verification
const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Store processed webhook IDs (in production, use Redis with TTL)
const processedWebhooks = new Map<string, number>();
const IDEMPOTENCY_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

function isWebhookProcessed(webhookId: string): boolean {
  const processedTime = processedWebhooks.get(webhookId);
  if (!processedTime) return false;
  
  // Check if still within idempotency window
  if (Date.now() - processedTime > IDEMPOTENCY_WINDOW) {
    processedWebhooks.delete(webhookId);
    return false;
  }
  
  return true;
}

function markWebhookProcessed(webhookId: string): void {
  processedWebhooks.set(webhookId, Date.now());
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(body, signature);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    let webhookData;
    try {
      webhookData = JSON.parse(body);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    const { event: webhookEvent, payload } = webhookData;
    const webhookId = webhookData.id || `${webhookEvent}_${payload.payment?.entity?.id}_${Date.now()}`;

    // Check idempotency
    if (isWebhookProcessed(webhookId)) {
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // Create admin Supabase client (no auth required for webhooks)
    const supabase = await createClient();

    // Handle different webhook events
    switch (webhookEvent) {
      case 'payment.captured':
        await handlePaymentCaptured(supabase, payload);
        break;

      case 'payment.failed':
        await handlePaymentFailed(supabase, payload);
        break;

      case 'order.paid':
        await handleOrderPaid(supabase, payload);
        break;

      default:
        // Unhandled webhook event
        break;
    }

    // Mark webhook as processed
    markWebhookProcessed(webhookId);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

async function handlePaymentCaptured(supabase: any, payload: any) {
  const payment = payload.payment.entity;
  const orderId = payment.order_id;
  const paymentId = payment.id;

  // SECURITY: Verify payment with Razorpay API (defense in depth)
  let razorpayPayment;
  try {
    razorpayPayment = await razorpay.payments.fetch(paymentId);
  } catch (error: any) {
    throw new Error('Payment verification with Razorpay API failed');
  }

  // SECURITY: Verify order_id matches (prevent payment_id swap attacks)
  if (razorpayPayment.order_id !== orderId) {
    throw new Error('Order ID mismatch - potential payment_id swap attack');
  }

  // Get payment record with booking info
  const { data: paymentRecord, error: fetchError } = await supabase
    .from('payments')
    .select('id, booking_id, status, razorpay_signature, bookings!inner(id, event_id, user_id, booking_code, tickets_count)')
    .eq('razorpay_order_id', orderId)
    .single() as {
      data: {
        id: string;
        booking_id: string;
        status: string;
        razorpay_signature: string;
        bookings: {
          id: string;
          event_id: string;
          user_id: string;
          booking_code: string;
          tickets_count: number;
        };
      } | null;
      error: any;
    };

  if (fetchError || !paymentRecord) {
    return;
  }

  // Skip if already successful
  if (paymentRecord.status === 'SUCCESSFUL') {
    return;
  }

  // Use atomic RPC function for webhook processing
  const { data: rpcResult, error: rpcError } = await supabase.rpc('process_webhook_payment', {
    p_razorpay_order_id: orderId,
    p_razorpay_payment_id: paymentId,
    p_webhook_payload: JSON.stringify(payload),
  });

  if (rpcError) {
    throw new Error(`Webhook processing failed: ${rpcError.message}`);
  }

  if (!rpcResult || !rpcResult.success) {
    throw new Error(rpcResult?.error || 'Unknown webhook processing error');
  }

  // Send confirmation email (async, don't block webhook response)
  try {
    // Fetch booking details with event and user info for email
    const { data: bookingWithEvent, error: bookingFetchError } = await supabase
      .from('bookings')
      .select(`
        booking_id,
        booking_code,
        tickets_count,
        profiles!inner(
          full_name,
          email
        ),
        events!inner(
          title,
          date_time,
          venue_name,
          venue_address,
          city,
          entry_instructions
        )
      `)
      .eq('id', paymentRecord.bookings.id)
      .single();

    if (bookingFetchError || !bookingWithEvent) {
      return;
    }

    const booking = bookingWithEvent as any;
    const event = booking.events;
    const profile = booking.profiles;

    // Fetch tickets for the booking
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('ticket_id, ticket_number, ticket_code')
      .eq('booking_id', paymentRecord.bookings.id)
      .order('ticket_number', { ascending: true });

    if (ticketsError || !tickets || tickets.length === 0) {
      return;
    }


    // Send confirmation email with ticket codes
    const ticketsList = (tickets as any[]).map((ticket) => ({
      ticket_number: ticket.ticket_number,
      ticket_code: ticket.ticket_code,
      ticket_id: ticket.ticket_id,
    }));

    console.log('📧 [WEBHOOK] Preparing to send booking confirmation email...');

    sendBookingConfirmationWithMultipleTickets(
      profile.email || 'unknown@example.com',
      {
        booking_code: booking.booking_code,
        event_title: event.title,
        event_date: format(new Date(event.date_time), 'EEEE, MMMM d, yyyy'),
        event_time: format(new Date(event.date_time), 'h:mm a'),
        venue_name: event.venue_name,
        venue_address: event.venue_address,
        city: event.city,
        tickets_count: booking.tickets_count,
        user_name: profile?.full_name || 'Attendee',
        entry_instructions: event.entry_instructions,
      },
      ticketsList
    ).then(() => {
      console.log('✅ [WEBHOOK] Booking confirmation email sent successfully to:', profile.email);
      console.log('   📨 Email type: ConveneHub Booking Confirmation');
      console.log('   📋 Booking code:', booking.booking_code);
      console.log('   🎫 Tickets:', ticketsList.length);
    }).catch((emailError: any) => {
      console.error('❌ [WEBHOOK] CRITICAL: Failed to send booking confirmation email');
      console.error('   📧 Recipient:', profile.email);
      console.error('   📋 Booking code:', booking.booking_code);
      console.error('   ⚠️  Error:', emailError.message);
      console.error('   📚 Stack:', emailError.stack);
      console.error('   ⚠️  USER DID NOT RECEIVE BOOKING CONFIRMATION EMAIL!');
    });
  } catch (emailError) {
    console.error('❌ [WEBHOOK] Email sending process failed with exception:', emailError);
    // Continue even if email fails
  }
}

async function handlePaymentFailed(supabase: any, payload: any) {
  const payment = payload.payment.entity;
  const orderId = payment.order_id;
  const paymentId = payment.id;

  // Get payment record
  const { data: paymentRecord } = await supabase
    .from('payments')
    .select('id, booking_id')
    .eq('razorpay_order_id', orderId)
    .single() as {
      data: {
        id: string;
        booking_id: string;
      } | null;
      error: any;
    };

  if (!paymentRecord) {
    return;
  }

  // Update payment status
  await (supabase.from('payments') as any)
    .update({
      razorpay_payment_id: paymentId,
      status: 'FAILED',
      failure_reason: payment.error_description || 'Payment failed',
    })
    .eq('id', paymentRecord.id);

  // Update booking status
  await (supabase.from('bookings') as any)
    .update({
      payment_status: 'FAILED',
      status: 'cancelled',
    })
    .eq('id', paymentRecord.booking_id);
}

async function handleOrderPaid(supabase: any, payload: any) {
  const order = payload.order.entity;
  const orderId = order.id;

  // This is a backup in case payment.captured webhook is missed
  await handlePaymentCaptured(supabase, {
    payment: {
      entity: {
        id: order.payments?.[0]?.id || 'unknown',
        order_id: orderId,
      },
    },
  });
}
