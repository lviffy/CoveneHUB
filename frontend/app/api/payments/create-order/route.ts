import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { PAYMENT_CONFIG, razorpayInstance } from '@/lib/razorpay';
import type { Database } from '@/types/database.types';

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 15;
const MAX_TICKETS_PER_USER = 10;
const rateLimitMap = new Map<string, number[]>();

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

function generateBookingCode(length = 8) {
  return Array.from(
    { length },
    () => Math.floor(Math.random() * 36).toString(36)
  )
    .join('')
    .toUpperCase();
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

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: 'Razorpay is not configured on the server.' },
        { status: 500 }
      );
    }

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
        { error: 'Too many payment attempts. Please wait and try again.' },
        { status: 429 }
      );
    }

    const { eventId, ticketsCount } = await request.json();

    if (!eventId || !ticketsCount || ticketsCount < 1 || ticketsCount > MAX_TICKETS_PER_USER) {
      return NextResponse.json(
        { error: 'Tickets must be between 1 and 10.' },
        { status: 400 }
      );
    }

    const { data: eventRecord, error: eventError } = await supabaseAdmin
      .from('events')
      .select('event_id, title, ticket_price, remaining, capacity, status')
      .eq('event_id', eventId)
      .maybeSingle();

    if (eventError) {
      return NextResponse.json(
        { error: 'Failed to fetch event details.' },
        { status: 500 }
      );
    }

    if (!eventRecord) {
      return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
    }

    const event = {
      event_id: eventRecord.event_id,
      title: eventRecord.title,
      ticket_price: Number(eventRecord.ticket_price || 0),
      remaining: eventRecord.remaining ?? 0,
      capacity: eventRecord.capacity,
      status: eventRecord.status,
    };

    if (event.ticket_price <= 0) {
      return NextResponse.json(
        { error: 'This event does not require Razorpay checkout.' },
        { status: 400 }
      );
    }

    if (event.status !== 'published' && event.status !== 'checkin_open') {
      return NextResponse.json(
        { error: 'This event is not accepting bookings right now.' },
        { status: 400 }
      );
    }

    if (event.remaining < ticketsCount) {
      return NextResponse.json(
        { error: `Only ${event.remaining} slots available.` },
        { status: 400 }
      );
    }

    const { data: existingConfirmedBooking } = await supabaseAdmin
      .from('bookings')
      .select('booking_id, tickets_count, booking_status, payment_status')
      .eq('event_id', event.event_id)
      .eq('user_id', user.id)
      .neq('booking_status', 'cancelled')
      .in('payment_status', ['NOT_REQUIRED', 'SUCCESSFUL', 'PAID'])
      .maybeSingle();

    if (existingConfirmedBooking) {
      return NextResponse.json(
        {
          error: 'You already have a booking for this event.',
          existing_booking: {
            booking_id: existingConfirmedBooking.booking_id,
            current_tickets: existingConfirmedBooking.tickets_count,
            can_add_more: false,
            booking_status: existingConfirmedBooking.booking_status,
            payment_status: existingConfirmedBooking.payment_status,
          },
        },
        { status: 409 }
      );
    }

    const recentPendingCutoff = new Date(
      Date.now() - PAYMENT_CONFIG.timeoutMinutes * 60 * 1000
    ).toISOString();

    const { data: existingPendingBooking } = await supabaseAdmin
      .from('bookings')
      .select(`
        booking_id,
        booking_code,
        tickets_count,
        total_amount,
        booked_at,
        payments!inner(
          razorpay_order_id,
          amount,
          status,
          expires_at
        )
      `)
      .eq('user_id', user.id)
      .eq('event_id', event.event_id)
      .eq('payment_status', 'PENDING')
      .gte('booked_at', recentPendingCutoff)
      .order('booked_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .maybeSingle();

    const profileName =
      (profile as any)?.full_name || user.email?.split('@')[0] || 'Attendee';
    const profilePhone = (profile as any)?.phone || '';

    if (existingPendingBooking?.payments?.[0]?.razorpay_order_id) {
      const existingPayment = existingPendingBooking.payments[0];

      if (existingPayment.expires_at && new Date(existingPayment.expires_at) > new Date()) {
        return NextResponse.json({
          success: true,
          keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          orderId: existingPayment.razorpay_order_id,
          amount: Math.round(Number(existingPayment.amount) * 100),
          currency: PAYMENT_CONFIG.currency,
          bookingId: existingPendingBooking.booking_id,
          bookingDetails: {
            booking_id: existingPendingBooking.booking_id,
            booking_code: existingPendingBooking.booking_code,
            name: profileName,
            email: user.email,
            contact: profilePhone,
            event: {
              id: event.event_id,
              title: event.title,
              ticketsCount: existingPendingBooking.tickets_count,
              totalAmount: existingPendingBooking.total_amount,
            },
          },
          expiresAt: existingPayment.expires_at,
          isExisting: true,
        });
      }
    }

    const { data: stalePendingBookings } = await supabaseAdmin
      .from('bookings')
      .select('booking_id')
      .eq('user_id', user.id)
      .eq('event_id', event.event_id)
      .eq('payment_status', 'PENDING')
      .lt('booked_at', recentPendingCutoff);

    if (stalePendingBookings && stalePendingBookings.length > 0) {
      const staleBookingIds = stalePendingBookings.map((booking: any) => booking.booking_id);

      await (supabaseAdmin.from('payments') as any)
        .delete()
        .in('booking_id', staleBookingIds);

      await (supabaseAdmin.from('bookings') as any)
        .delete()
        .in('booking_id', staleBookingIds);
    }

    const totalAmount = Number((event.ticket_price * ticketsCount).toFixed(2));
    const amountInPaise = Math.round(totalAmount * 100);

    if (amountInPaise < 100) {
      return NextResponse.json(
        { error: 'Minimum transaction amount is Rs 1.' },
        { status: 400 }
      );
    }

    const bookingCode = generateBookingCode();
    const bookedAt = new Date().toISOString();

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: user.id,
        event_id: event.event_id,
        tickets_count: ticketsCount,
        original_amount: totalAmount,
        discount_amount: 0,
        total_amount: totalAmount,
        payment_required: true,
        payment_status: 'PENDING',
        booking_status: 'pending',
        booking_code: bookingCode,
        booked_at: bookedAt,
      } as any)
      .select('booking_id, booking_code')
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: bookingError?.message || 'Failed to create pending booking.' },
        { status: 500 }
      );
    }

    let razorpayOrder: any;

    try {
      razorpayOrder = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: PAYMENT_CONFIG.currency,
        receipt: booking.booking_id.slice(0, 40),
        notes: {
          booking_id: booking.booking_id,
          event_id: event.event_id,
          user_id: user.id,
          tickets_count: String(ticketsCount),
          booking_code: booking.booking_code,
        },
      });
    } catch (razorpayError: any) {
      await (supabaseAdmin.from('bookings') as any)
        .delete()
        .eq('booking_id', booking.booking_id);

      return NextResponse.json(
        {
          error:
            razorpayError?.error?.description ||
            razorpayError?.message ||
            'Unable to create Razorpay order.',
        },
        { status: 500 }
      );
    }

    const expiresAt = new Date(Date.now() + PAYMENT_CONFIG.timeoutMinutes * 60 * 1000);

    const { error: paymentError } = await (supabaseAdmin.from('payments') as any).insert({
      booking_id: booking.booking_id,
      razorpay_order_id: razorpayOrder.id,
      amount: totalAmount,
      currency: PAYMENT_CONFIG.currency,
      status: 'PENDING',
      payment_email: user.email,
      payment_contact: profilePhone,
      expires_at: expiresAt.toISOString(),
    });

    if (paymentError) {
      await (supabaseAdmin.from('bookings') as any)
        .delete()
        .eq('booking_id', booking.booking_id);

      return NextResponse.json(
        { error: 'Failed to store payment details.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      bookingId: booking.booking_id,
      expiresAt: expiresAt.toISOString(),
      bookingDetails: {
        booking_id: booking.booking_id,
        booking_code: booking.booking_code,
        name: profileName,
        email: user.email,
        contact: profilePhone,
        event: {
          id: event.event_id,
          title: event.title,
          ticketsCount,
          totalAmount,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unexpected payment setup error.' },
      { status: 500 }
    );
  }
}
