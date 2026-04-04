import { NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';
import { verifyPaymentSignature } from '@/lib/razorpay';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

/**
 * POST /api/bookings/[bookingId]/add-tickets/verify-payment
 * 
 * Verifies payment and adds additional tickets to booking
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

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      additional_tickets
    } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !additional_tickets) {
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

    // Fetch payment from Razorpay
    let razorpayPayment;
    try {
      razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Failed to verify payment with Razorpay' },
        { status: 500 }
      );
    }

    if (razorpayPayment.status !== 'captured' && razorpayPayment.status !== 'authorized') {
      return NextResponse.json(
        { error: `Payment status is ${razorpayPayment.status}` },
        { status: 400 }
      );
    }

    if (razorpayPayment.order_id !== razorpay_order_id) {
      return NextResponse.json(
        { error: 'Payment verification failed - order mismatch' },
        { status: 400 }
      );
    }

    // Get payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('booking_id', bookingId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    // Update payment record
    const { error: updateError } = await (supabase
      .from('payments') as any)
      .update({
        razorpay_payment_id,
        razorpay_signature,
        status: 'SUCCESSFUL',
      })
      .eq('id', (payment as any).id);

    if (updateError) {
      console.error('[VERIFY-PAYMENT] Failed to update payment record:', updateError);
    }

    // NOW add the tickets via database function
    const { data, error: addTicketsError } = await (supabase.rpc as any)('add_tickets_to_booking', {
      p_booking_id: bookingId,
      p_user_id: user.id,
      p_additional_tickets: additional_tickets
    });

    if (addTicketsError) {
      console.error('[VERIFY-PAYMENT] Failed to add tickets after payment:', addTicketsError);
      return NextResponse.json(
        { error: 'Payment successful but failed to add tickets. Please contact support.' },
        { status: 500 }
      );
    }

    const result = (data as any[])[0];

    return NextResponse.json({
      success: true,
      message: `Payment successful! ${additional_tickets} ticket${additional_tickets > 1 ? 's' : ''} added to your booking.`,
      booking: {
        booking_id: result.booking_id,
        booking_code: result.booking_code,
        new_tickets_count: result.new_tickets_count,
        new_total_amount: result.new_total_amount,
        tickets_added: result.new_tickets_created
      }
    });

  } catch (error: any) {
    console.error('[VERIFY-PAYMENT] Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
