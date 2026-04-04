import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { razorpayInstance, PAYMENT_CONFIG } from '@/lib/razorpay';
import Decimal from 'decimal.js';
import type { Database } from '@/types/database.types';

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 20; // 20 requests per minute (increased for development)
const MAX_MAP_SIZE = 10000; // Prevent memory leak

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  
  // Cleanup: If map gets too large, remove entries older than 5 minutes
  if (rateLimitMap.size > MAX_MAP_SIZE) {
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    const keysToDelete: string[] = [];
    
    rateLimitMap.forEach((timestamps, key) => {
      const recentRequests = timestamps.filter((time: number) => time > fiveMinutesAgo);
      if (recentRequests.length === 0) {
        keysToDelete.push(key);
      } else {
        rateLimitMap.set(key, recentRequests);
      }
    });
    
    keysToDelete.forEach(key => rateLimitMap.delete(key));
  }
  
  const userRequests = rateLimitMap.get(userId) || [];
  
  // Remove old requests outside window
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS) {
    console.log(`Rate limit hit for user ${userId}: ${recentRequests.length} requests in last minute`);
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(userId, recentRequests);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createSupabaseAdminClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('[CREATE-ORDER] Auth check:', { 
      hasUser: !!user, 
      userId: user?.id,
      authError: authError?.message 
    });
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { eventId, ticketsCount, couponCode } = await request.json();
    
    console.log('[CREATE-ORDER] Request params:', { 
      eventId, 
      ticketsCount, 
      couponCode: couponCode || 'NONE', 
      userId: user.id 
    });

    // Validate input
    if (!eventId || !ticketsCount || ticketsCount < 1 || ticketsCount > 10) {
      return NextResponse.json(
        { error: 'Invalid input. Tickets must be between 1 and 10.' },
        { status: 400 }
      );
    }

    // Get event details - using 'event_id' as the primary key column
    const { data: eventRecord, error: eventError } = await supabaseAdmin
      .from('events')
      .select('event_id, title, ticket_price, remaining, capacity, status, max_tickets_per_user')
      .eq('event_id', eventId)
      .maybeSingle() as {
        data: {
          event_id: string;
          title: string;
          ticket_price: number | string | null;
          remaining: number | null;
          capacity: number;
          status: string;
          max_tickets_per_user: number | null;
        } | null;
        error: any;
      };
    
    console.log('[CREATE-ORDER] Event lookup:', { 
      eventId,
      found: !!eventRecord, 
      error: eventError?.message,
      rawError: eventError,
      eventData: eventRecord ? {
        event_id: eventRecord.event_id,
        title: eventRecord.title,
        status: eventRecord.status,
        remaining: eventRecord.remaining
      } : null
    });

    if (eventError) {
      console.error('[CREATE-ORDER] Event query error:', { eventId, eventError });
      return NextResponse.json({ 
        error: 'Failed to fetch event details',
        details: eventError.message 
      }, { status: 500 });
    }

    if (!eventRecord) {
      console.error('[CREATE-ORDER] Event not found:', { eventId });
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const event = {
      event_id: eventRecord.event_id,
      title: eventRecord.title,
      ticket_price: Number(eventRecord.ticket_price || 0),
      remaining: eventRecord.remaining ?? 0,
      capacity: eventRecord.capacity,
      status: eventRecord.status,
      max_tickets_per_user: eventRecord.max_tickets_per_user ?? 10,
    };

    console.log('[CREATE-ORDER] Event processed:', {
      event_id: event.event_id,
      title: event.title,
      ticket_price: event.ticket_price,
      remaining: event.remaining,
      status: event.status
    });

    // Check if event accepts bookings
    if (event.status !== 'published') {
      return NextResponse.json(
        { error: 'Event is not accepting bookings' },
        { status: 400 }
      );
    }

    // Check capacity
    if (event.remaining < ticketsCount) {
      return NextResponse.json(
        { error: `Only ${event.remaining} slots available` },
        { status: 400 }
      );
    }

    // Check user's existing bookings for this event
    const { data: existingBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('tickets_count, status')
      .eq('user_id', user.id)
      .eq('event_id', event.event_id)
      .in('status', ['pending', 'confirmed']);

    if (bookingsError) {
      console.error('[CREATE-ORDER] Error checking existing bookings:', bookingsError);
    }

    const totalExistingTickets = (existingBookings as Array<{ tickets_count: number }> | null)?.reduce(
      (sum: number, booking: { tickets_count: number }) => sum + booking.tickets_count,
      0
    ) || 0;

    console.log('[CREATE-ORDER] Existing bookings check:', {
      userId: user.id,
      eventId: event.event_id,
      totalExistingTickets,
      maxAllowed: event.max_tickets_per_user,
      requestedTickets: ticketsCount
    });

    if (totalExistingTickets + ticketsCount > event.max_tickets_per_user) {
      return NextResponse.json(
        { error: `Maximum ${event.max_tickets_per_user} tickets allowed per user. You already have ${totalExistingTickets} ticket(s).` },
        { status: 400 }
      );
    }

    // Calculate total amount using Decimal.js for precision
    const ticketPrice = new Decimal(event.ticket_price);
    let totalAmount = ticketPrice.times(ticketsCount);
    let discountAmount = new Decimal(0);
    let couponId: number | null = null;
    let appliedCouponCode: string | null = null;

    // Validate and apply coupon if provided
    if (couponCode) {
      const { data: couponValidation, error: couponError } = await supabaseAdmin.rpc(
        'validate_and_calculate_coupon' as any,
        {
          p_coupon_code: couponCode.toUpperCase(),
          p_event_id: eventId,
          p_user_id: user.id,
          p_tickets_count: ticketsCount,
          p_original_amount: totalAmount.toNumber(),
        } as any
      );

      if (couponError || !(couponValidation as any)?.valid) {
        return NextResponse.json(
          { error: (couponValidation as any)?.error || 'Invalid coupon code' },
          { status: 400 }
        );
      }

      discountAmount = new Decimal((couponValidation as any).discount_amount || 0);
      totalAmount = new Decimal((couponValidation as any).final_amount || 0);
      couponId = (couponValidation as any).coupon_id;
      appliedCouponCode = couponCode.toUpperCase();

      console.log('[CREATE-ORDER] Coupon applied:', {
        code: appliedCouponCode,
        couponId: couponId,
        discountAmount: discountAmount.toNumber(),
        finalAmount: totalAmount.toNumber()
      });
    }

    const amountInPaise = totalAmount.times(100).toNumber();

    console.log('[CREATE-ORDER] Amount calculation:', {
      originalAmount: ticketPrice.times(ticketsCount).toNumber(),
      discountAmount: discountAmount.toNumber(),
      finalTotalAmount: totalAmount.toNumber(),
      amountInPaise: amountInPaise,
      couponApplied: !!couponId
    });

    // Validate amount
    if (amountInPaise < 100) {
      return NextResponse.json(
        { error: 'Minimum transaction amount is ₹1' },
        { status: 400 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('phone_number, full_name')
      .eq('id', user.id)
      .single() as {
        data: {
          phone_number: string | null;
          full_name: string | null;
        } | null;
        error: any;
      };

    if (profileError) {
      console.warn('[CREATE-ORDER] Profile fetch warning:', profileError.message);
    }

    console.log('[CREATE-ORDER] Creating booking with:', {
      userId: user.id,
      eventId: event.event_id,
      ticketsCount,
      totalAmount: totalAmount.toNumber()
    });

    // IDEMPOTENCY: Check if there's already a recent pending order for this user/event
    // This prevents race conditions when users double-click or send multiple requests
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

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
      .gte('booked_at', fiveMinutesAgo)
      .order('booked_at', { ascending: false })
      .limit(1)
      .maybeSingle() as {
        data: {
          booking_id: string;
          booking_code: string;
          tickets_count: number;
          total_amount: number;
          booked_at: string;
          payments: Array<{
            razorpay_order_id: string;
            amount: number;
            status: string;
            expires_at: string;
          }>;
        } | null;
      };

    // If we have a recent pending booking with a valid payment order, return it
    if (existingPendingBooking?.payments?.[0]?.razorpay_order_id) {
      const payment = existingPendingBooking.payments[0];
      const expiresAt = new Date(payment.expires_at);
      
      // Check if payment hasn't expired
      if (expiresAt > new Date()) {
        console.log('[CREATE-ORDER] ⚡ IDEMPOTENCY: Returning existing pending order', {
          bookingId: existingPendingBooking.booking_id,
          orderId: payment.razorpay_order_id,
          bookedAt: existingPendingBooking.booked_at,
          expiresAt: payment.expires_at
        });

        // Return the existing order
        const bookingDetails = {
          booking_id: existingPendingBooking.booking_id,
          name: profile?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email,
          contact: profile?.phone_number || '',
          event: {
            id: event.event_id,
            title: event.title,
            ticketsCount: existingPendingBooking.tickets_count,
            totalAmount: existingPendingBooking.total_amount,
          },
        };

        return NextResponse.json({
          success: true,
          orderId: payment.razorpay_order_id,
          amount: payment.amount * 100, // Convert to paise
          currency: PAYMENT_CONFIG.currency,
          bookingId: existingPendingBooking.booking_id,
          bookingDetails,
          expiresAt: payment.expires_at,
          isExisting: true, // Flag to indicate this is an existing order
        });
      }
    }

    // CLEANUP: Delete old and expired pending bookings
    // This keeps the database clean by removing abandoned payment attempts
    // 1. Delete very old pending bookings (>5 minutes)
    // 2. Delete expired bookings (payment window expired)
    const { error: deleteError, count: deletedCount } = await supabaseAdmin
      .from('bookings')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)
      .eq('event_id', event.event_id)
      .in('payment_status', ['pending', 'PENDING'])
      .or(`booked_at.lt.${fiveMinutesAgo},booking_status.eq.cancelled`);

    if (deleteError) {
      console.warn('[CREATE-ORDER] Failed to delete old/expired pending bookings:', deleteError);
      // Continue anyway - this is not critical
    } else if (deletedCount && deletedCount > 0) {
      console.log(`[CREATE-ORDER] ✨ Cleaned up ${deletedCount} abandoned booking(s)`);
    }

    // Generate unique booking code (8 characters)
    const bookingCode = Array.from(
      { length: 8 }, 
      () => Math.floor(Math.random() * 36).toString(36)
    ).join('').toUpperCase();

    // Create booking record (status: PENDING) using event_id (UUID primary key)
    // Use supabaseAdmin to bypass RLS policies
    const originalAmount = ticketPrice.times(ticketsCount).toNumber();
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: user.id,
        event_id: event.event_id,
        tickets_count: ticketsCount,
        original_amount: originalAmount,
        discount_amount: discountAmount.toNumber(),
        total_amount: totalAmount.toNumber(),
        coupon_id: couponId,
        payment_required: true,
        payment_status: 'PENDING',
        booking_status: 'pending',
        booking_code: bookingCode,
      } as any)
      .select('booking_id')
      .single() as {
        data: {
          booking_id: string;
        } | null;
        error: any;
      };

    if (bookingError || !booking) {
      console.error('[CREATE-ORDER] Booking creation failed:', {
        error: bookingError,
        message: bookingError?.message,
        details: bookingError?.details,
        hint: bookingError?.hint
      });
      return NextResponse.json(
        { 
          error: 'Failed to create booking',
          details: bookingError?.message 
        },
        { status: 500 }
      );
    }

    console.log('[CREATE-ORDER] Booking created:', {
      bookingId: booking.booking_id
    });

    let razorpayOrder;
    try {
      console.log('[CREATE-ORDER] Creating Razorpay order:', {
        amount: amountInPaise,
        bookingId: booking.booking_id
      });

      // Create Razorpay order
      // Note: receipt max length is 40 characters
      razorpayOrder = await razorpayInstance.orders.create({
        amount: amountInPaise,
        currency: PAYMENT_CONFIG.currency,
        receipt: booking.booking_id.substring(0, 40), // Max 40 chars for Razorpay
        notes: {
          booking_id: booking.booking_id,
          event_id: event.event_id,
          user_id: user.id,
          tickets_count: ticketsCount.toString(),
          event_title: event.title,
        },
      });
    } catch (razorpayError: any) {
      console.error('[CREATE-ORDER] Razorpay order creation failed:', {
        error: razorpayError,
        message: razorpayError?.message,
        errorDetails: razorpayError?.error
      });
      
      // Rollback booking - use admin client to bypass RLS
      await supabaseAdmin.from('bookings').delete().eq('booking_id', booking.booking_id);
      
      return NextResponse.json(
        { 
          error: razorpayError.error?.description || 'Payment gateway error. Please try again.',
          details: razorpayError.message
        },
        { status: 500 }
      );
    }

    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + PAYMENT_CONFIG.timeoutMinutes);

    console.log('[CREATE-ORDER] Storing payment record:', {
      bookingId: booking.booking_id,
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmount.toNumber()
    });

    // Store payment record - use admin client to bypass RLS
    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        booking_id: booking.booking_id,
        razorpay_order_id: razorpayOrder.id,
        amount: totalAmount.toNumber(),
        currency: PAYMENT_CONFIG.currency,
        status: 'PENDING',
        payment_email: user.email,
        payment_contact: profile?.phone_number || '',
        expires_at: expiresAt.toISOString(),
      } as any);

    if (paymentError) {
      console.error('[CREATE-ORDER] Payment record creation failed:', {
        error: paymentError,
        message: paymentError?.message,
        details: paymentError?.details
      });
      
      // Rollback booking - use admin client to bypass RLS
      await supabaseAdmin.from('bookings').delete().eq('booking_id', booking.booking_id);
      
      return NextResponse.json(
        { 
          error: 'Payment initialization failed',
          details: paymentError?.message
        },
        { status: 500 }
      );
    }

    console.log('[CREATE-ORDER] Payment record stored successfully');

    const bookingDetails = {
      booking_id: booking.booking_id,
      name: profile?.full_name || user.email?.split('@')[0] || 'User',
      email: user.email,
      contact: profile?.phone_number || '',
      event: {
        id: event.event_id,
        title: event.title,
        ticketsCount,
        totalAmount: totalAmount.toNumber(),
      },
    };

    console.log('[CREATE-ORDER] Success - returning order details:', {
      orderId: razorpayOrder.id,
      bookingId: booking.booking_id
    });

    // Return order details for frontend
    return NextResponse.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      bookingId: booking.booking_id,
      bookingDetails,
      expiresAt: expiresAt.toISOString(),
    });

  } catch (error: any) {
    console.error('[CREATE-ORDER] Unexpected error:', {
      error,
      message: error?.message,
      stack: error?.stack
    });
    return NextResponse.json(
      { 
        error: 'Failed to create payment order',
        details: error?.message
      },
      { status: 500 }
    );
  }
}
