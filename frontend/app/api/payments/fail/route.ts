import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

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
    const supabase = await createClient();
    const supabaseAdmin = getAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      razorpay_order_id,
    } = await request.json();

    if (!razorpay_order_id) {
      return NextResponse.json(
        { error: 'Missing razorpay_order_id.' },
        { status: 400 }
      );
    }

    const { data: payment, error: paymentError } = await (supabaseAdmin
      .from('payments') as any)
      .select(`
        id,
        booking_id,
        status,
        bookings!inner(
          booking_id,
          user_id,
          payment_status
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
      payment.status === 'SUCCESSFUL' ||
      payment.bookings.payment_status === 'SUCCESSFUL'
    ) {
      return NextResponse.json(
        { error: 'Payment already completed and cannot be removed.' },
        { status: 400 }
      );
    }

    await (supabaseAdmin.from('payments') as any)
      .delete()
      .eq('id', payment.id);

    await (supabaseAdmin.from('tickets') as any)
      .delete()
      .eq('booking_id', payment.booking_id);

    await (supabaseAdmin.from('bookings') as any)
      .delete()
      .eq('booking_id', payment.booking_id);

    return NextResponse.json({
      success: true,
      message: 'Pending payment cleaned up successfully.',
      booking_id: payment.booking_id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unexpected payment cleanup error.' },
      { status: 500 }
    );
  }
}
