import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { sendBookingConfirmationWithMultipleTickets, sendPaymentReceipt } from '@/lib/email/service';
import { format } from 'date-fns';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRequests = rateLimitMap.get(userId) || [];
  
  // Remove old requests outside the window
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(userId, recentRequests);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
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

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await request.json();

    // Validate input
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Fetch payment from Razorpay API
    let razorpayPayment: any;
    try {
      razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Failed to verify payment with Razorpay' },
        { status: 500 }
      );
    }

    // Verify payment status from Razorpay
    if (razorpayPayment.status !== 'captured' && razorpayPayment.status !== 'authorized') {
      return NextResponse.json(
        { error: `Payment status is ${razorpayPayment.status}` },
        { status: 400 }
      );
    }

    // ✅ FIX: Verify order_id matches (prevent order swap attacks)
    if (razorpayPayment.order_id !== razorpay_order_id) {
      return NextResponse.json(
        { error: 'Payment verification failed - order mismatch' },
        { status: 400 }
      );
    }

    // Get payment record from database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, bookings!inner(booking_id, event_id, tickets_count, user_id)')
      .eq('razorpay_order_id', razorpay_order_id)
      .single() as {
        data: {
          id: string;
          booking_id: string;
          status: string;
          bookings: {
            booking_id: string;
            event_id: string;
            tickets_count: number;
            user_id: string;
          };
        } | null;
        error: any;
      };

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    // Verify user owns this booking
    if (payment.bookings.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // ✅ FIX: Use atomic RPC function to prevent race conditions
    // This replaces all the manual update logic below with a single atomic operation
    
    const { data: result, error: rpcError } = await supabase
      .rpc('verify_payment_atomic', {
        p_payment_id: payment.id,
        p_razorpay_payment_id: razorpay_payment_id,
        p_razorpay_signature: razorpay_signature,
        p_booking_id: payment.booking_id,
        p_tickets_count: payment.bookings.tickets_count,
      } as any);

    if (rpcError) {
      return NextResponse.json(
        { error: 'Failed to process payment verification' },
        { status: 500 }
      );
    }

    const resultData = result as any;
    
    if (!resultData.success) {
      return NextResponse.json(
        { error: resultData.error || 'Payment processing failed' },
        { status: 500 }
      );
    }

    // ✅ REMOVED: All manual update logic below (payment, booking, tickets, capacity)
    // Now handled atomically by verify_payment_atomic() function

    // Track coupon usage if coupon was used
    try {
      const { data: bookingData, error: bookingFetchError } = await supabase
        .from('bookings')
        .select('coupon_id, discount_amount, original_amount')
        .eq('booking_id', payment.bookings.booking_id)
        .single();

      if (bookingFetchError) {
        // Skip coupon tracking if booking fetch fails
      }

      if ((bookingData as any)?.coupon_id) {
        // Insert coupon usage record
        const { data: usageData, error: usageError } = await (supabase.from('coupon_usage') as any).insert({
          coupon_id: (bookingData as any).coupon_id,
          booking_id: payment.bookings.booking_id,
          user_id: user.id,
          discount_amount: (bookingData as any).discount_amount || 0,
          original_amount: (bookingData as any).original_amount || 0,
        }).select();

        if (usageError) {
          // Coupon usage tracking failed, but don't fail the payment
        }
      }
    } catch (couponError) {
      // Don't fail the payment if coupon tracking fails
    }

    // Send confirmation email (async, don't block response)
    try {
      const { data: bookingWithEvent, error: bookingFetchError } = await supabase
        .from('bookings')
        .select(`
          booking_id,
          booking_code,
          tickets_count,
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
        .eq('booking_id', payment.bookings.booking_id)
        .single();

      if (!bookingFetchError && bookingWithEvent) {
        const booking = bookingWithEvent as any;
        const event = booking.events;
        const profile = booking.profiles;

        // Fetch tickets
        const { data: tickets } = await supabase
          .from('tickets')
          .select('ticket_id, ticket_number, ticket_code')
          .eq('booking_id', payment.bookings.booking_id)
          .order('ticket_number', { ascending: true });

        if (tickets && tickets.length > 0) {
          const ticketsList = (tickets as any[]).map((ticket) => ({
            ticket_number: ticket.ticket_number,
            ticket_code: ticket.ticket_code,
            ticket_id: ticket.ticket_id,
          }));

          console.log('📧 [PAYMENT-VERIFY] Preparing to send booking confirmation and payment receipt emails...');
          
          // Send booking confirmation
          sendBookingConfirmationWithMultipleTickets(
            user.email!,
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
            console.log('✅ [PAYMENT-VERIFY] Booking confirmation email sent successfully to:', user.email);
            console.log('   📨 Email type: ConveneHub Booking Confirmation');
            console.log('   📋 Booking code:', booking.booking_code);
            console.log('   🎫 Tickets:', ticketsList.length);
          }).catch((err: any) => {
            console.error('❌ [PAYMENT-VERIFY] CRITICAL: Failed to send booking confirmation email');
            console.error('   📧 Recipient:', user.email);
            console.error('   📋 Booking code:', booking.booking_code);
            console.error('   ⚠️  Error:', err.message);
            console.error('   📚 Stack:', err.stack);
            console.error('   ⚠️  USER DID NOT RECEIVE BOOKING CONFIRMATION EMAIL!');
          });

          // Send payment receipt
          sendPaymentReceipt(
            user.email!,
            {
              booking_code: booking.booking_code,
              payment_id: razorpay_payment_id,
              event_title: event.title,
              event_date: format(new Date(event.date_time), 'EEEE, MMMM d, yyyy'),
              event_time: format(new Date(event.date_time), 'h:mm a'),
              venue_name: event.venue_name,
              venue_address: event.venue_address,
              city: event.city,
              tickets_count: booking.tickets_count,
              ticket_price: (razorpayPayment.amount as number) / 100 / booking.tickets_count,
              total_amount: (razorpayPayment.amount as number) / 100,
              user_name: profile?.full_name || 'Attendee',
              user_email: user.email!,
              payment_date: new Date().toISOString(),
              payment_method: 'Razorpay - ' + ((razorpayPayment.method as string) || 'Card'),
              transaction_id: razorpay_payment_id,
            }
          ).then(() => {
            console.log('✅ [PAYMENT-VERIFY] Payment receipt email sent successfully to:', user.email);
            console.log('   📨 Email type: Razorpay Payment Receipt');
            console.log('   💰 Amount:', (razorpayPayment.amount as number) / 100);
          }).catch((err: any) => {
            console.error('❌ [PAYMENT-VERIFY] CRITICAL: Failed to send payment receipt email');
            console.error('   📧 Recipient:', user.email);
            console.error('   📋 Booking code:', booking.booking_code);
            console.error('   ⚠️  Error:', err.message);
            console.error('   📚 Stack:', err.stack);
            console.error('   ⚠️  USER DID NOT RECEIVE PAYMENT RECEIPT EMAIL!');
          });
        }
      }
    } catch (emailError) {
      console.error('❌ [PAYMENT-VERIFY] Email sending process failed with exception:', emailError);
      // Continue - don't fail payment if email fails
    }

    return NextResponse.json({
      success: true,
      message: resultData.already_processed 
        ? 'Payment already verified' 
        : 'Payment verified successfully',
      booking_id: payment.bookings.booking_id,
      payment_id: razorpay_payment_id,
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
