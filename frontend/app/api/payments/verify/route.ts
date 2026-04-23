import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { sendBookingConfirmationWithMultipleTickets, sendPaymentReceipt } from '@/lib/email/service';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { format } from 'date-fns';
import Razorpay from 'razorpay';
import type { Database } from '@/types/database.types';

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 10;
const rateLimitMap = new Map<string, number[]>();

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

function checkRateLimit(userId: string) {
  const now = Date.now();
  const requests = (rateLimitMap.get(userId) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW
  );

  if (requests.length >= MAX_REQUESTS) {
    return false;
  }

  requests.push(now);
  rateLimitMap.set(userId, requests);
  return true;
}

function getAdminClient() {
  return createSupabaseAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function generateTicketCode(bookingCode: string, ticketNumber: number) {
  return `${bookingCode}-${ticketNumber}`;
}

function generateQrNonce() {
  return Array.from(
    { length: 16 },
    () => Math.floor(Math.random() * 16).toString(16)
  )
    .join('')
    .toUpperCase();
}

async function sendConfirmationEmails(
  supabaseAdmin: ReturnType<typeof getAdminClient>,
  userEmail: string,
  bookingId: string,
  razorpayPayment: any,
  razorpayPaymentId: string
) {
  const { data: bookingWithEvent } = await supabaseAdmin
    .from('bookings')
    .select(`
      booking_id,
      booking_code,
      tickets_count,
      total_amount,
      events!inner(
        title,
        date_time,
        venue_name,
        venue_address,
        city,
        entry_instructions
      ),
      profiles!inner(
        full_name
      )
    `)
    .eq('booking_id', bookingId)
    .single();

  if (!bookingWithEvent) {
    return;
  }

  const booking = bookingWithEvent as any;
  const event = Array.isArray(booking.events) ? booking.events[0] : booking.events;
  const profile = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;

  const { data: tickets } = await supabaseAdmin
    .from('tickets')
    .select('ticket_id, ticket_number, ticket_code')
    .eq('booking_id', bookingId)
    .order('ticket_number', { ascending: true });

  if (!tickets || tickets.length === 0) {
    return;
  }

  const ticketsList = tickets.map((ticket: any) => ({
    ticket_number: ticket.ticket_number,
    ticket_code: ticket.ticket_code,
    ticket_id: ticket.ticket_id,
  }));

  await sendBookingConfirmationWithMultipleTickets(
    userEmail,
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
  );

  await sendPaymentReceipt(userEmail, {
    booking_code: booking.booking_code,
    payment_id: razorpayPaymentId,
    event_title: event.title,
    event_date: format(new Date(event.date_time), 'EEEE, MMMM d, yyyy'),
    event_time: format(new Date(event.date_time), 'h:mm a'),
    venue_name: event.venue_name,
    venue_address: event.venue_address,
    city: event.city,
    tickets_count: booking.tickets_count,
    ticket_price: Number(booking.total_amount) / Number(booking.tickets_count || 1),
    total_amount: Number(booking.total_amount),
    user_name: profile?.full_name || 'Attendee',
    user_email: userEmail,
    payment_date: new Date().toISOString(),
    payment_method: `Razorpay - ${razorpayPayment.method || 'Card'}`,
    transaction_id: razorpayPaymentId,
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = getAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please wait and try again.' },
        { status: 429 }
      );
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing required payment fields.' },
        { status: 400 }
      );
    }

    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Payment signature verification failed.' },
        { status: 400 }
      );
    }

    const razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);

    if (
      razorpayPayment.status !== 'captured' &&
      razorpayPayment.status !== 'authorized'
    ) {
      return NextResponse.json(
        { error: `Payment status is ${razorpayPayment.status}.` },
        { status: 400 }
      );
    }

    if (razorpayPayment.order_id !== razorpay_order_id) {
      return NextResponse.json(
        { error: 'Payment order mismatch detected.' },
        { status: 400 }
      );
    }

    const { data: payment, error: paymentError } = await (supabaseAdmin
      .from('payments') as any)
      .select(`
        id,
        booking_id,
        status,
        amount,
        bookings!inner(
          booking_id,
          booking_code,
          event_id,
          tickets_count,
          total_amount,
          user_id,
          booking_status,
          payment_status,
          events!inner(
            event_id,
            capacity
          )
        )
      `)
      .eq('razorpay_order_id', razorpay_order_id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment record not found.' },
        { status: 404 }
      );
    }

    if (payment.bookings.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (
      payment.status === 'SUCCESSFUL' &&
      (payment.bookings.payment_status === 'SUCCESSFUL' ||
        payment.bookings.payment_status === 'PAID')
    ) {
      return NextResponse.json({
        success: true,
        message: 'Payment already verified.',
        booking_id: payment.bookings.booking_id,
        booking_code: payment.bookings.booking_code,
        payment_id: razorpay_payment_id,
      });
    }

    const { error: paymentUpdateError } = await (supabaseAdmin
      .from('payments') as any)
      .update({
        status: 'SUCCESSFUL',
        razorpay_payment_id,
        razorpay_signature,
      })
      .eq('id', payment.id);

    if (paymentUpdateError) {
      return NextResponse.json(
        { error: 'Failed to update payment record.' },
        { status: 500 }
      );
    }

    const { error: bookingUpdateError } = await (supabaseAdmin
      .from('bookings') as any)
      .update({
        booking_status: 'confirmed',
        payment_status: 'SUCCESSFUL',
      })
      .eq('booking_id', payment.bookings.booking_id);

    if (bookingUpdateError) {
      return NextResponse.json(
        { error: 'Failed to confirm booking.' },
        { status: 500 }
      );
    }

    const { data: existingTickets } = await supabaseAdmin
      .from('tickets')
      .select('ticket_id')
      .eq('booking_id', payment.bookings.booking_id);

    if (!existingTickets || existingTickets.length === 0) {
      const bookingCode =
        payment.bookings.booking_code || payment.bookings.booking_id.slice(0, 8).toUpperCase();

      const ticketsToCreate = Array.from(
        { length: payment.bookings.tickets_count },
        (_, index) => {
          const ticketNumber = index + 1;
          return {
            booking_id: payment.bookings.booking_id,
            ticket_number: ticketNumber,
            ticket_code: generateTicketCode(bookingCode, ticketNumber),
            qr_nonce: generateQrNonce(),
            checked_in: false,
          };
        }
      );

      const { error: ticketInsertError } = await (supabaseAdmin
        .from('tickets') as any)
        .insert(ticketsToCreate);

      if (ticketInsertError) {
        return NextResponse.json(
          { error: 'Payment verified, but ticket creation failed.' },
          { status: 500 }
        );
      }
    }

    const { data: confirmedBookings } = await supabaseAdmin
      .from('bookings')
      .select('tickets_count')
      .eq('event_id', payment.bookings.event_id)
      .neq('booking_status', 'cancelled')
      .in('payment_status', ['SUCCESSFUL', 'NOT_REQUIRED', 'PAID']);

    const bookingEvent = Array.isArray(payment.bookings.events)
      ? payment.bookings.events[0]
      : payment.bookings.events;

    const confirmedTickets = (confirmedBookings || []).reduce(
      (sum: number, booking: any) => sum + Number(booking.tickets_count || 0),
      0
    );

    const remaining = Math.max(
      0,
      Number(bookingEvent?.capacity || 0) - confirmedTickets
    );

    await (supabaseAdmin.from('events') as any)
      .update({ remaining })
      .eq('event_id', payment.bookings.event_id);

    try {
      await sendConfirmationEmails(
        supabaseAdmin,
        user.email!,
        payment.bookings.booking_id,
        razorpayPayment,
        razorpay_payment_id
      );
    } catch {
      // Email failures should not fail a successful payment verification.
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully.',
      booking_id: payment.bookings.booking_id,
      booking_code: payment.bookings.booking_code,
      payment_id: razorpay_payment_id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unexpected payment verification error.' },
      { status: 500 }
    );
  }
}
