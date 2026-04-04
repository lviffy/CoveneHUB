import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';

// Handle explicit payment failures
// Called when payment fails at Razorpay or user cancels

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { razorpay_order_id, reason, error_code, error_description } = await request.json();

    // Validate input
    if (!razorpay_order_id) {
      return NextResponse.json(
        { error: 'Missing razorpay_order_id' },
        { status: 400 }
      );
    }

    // Find payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        id,
        booking_id,
        status,
        bookings!inner(
          id,
          booking_id,
          event_id,
          tickets_count,
          user_id,
          booking_status
        )
      `)
      .eq('razorpay_order_id', razorpay_order_id)
      .single() as {
        data: {
          id: string;
          booking_id: string;
          status: string;
          bookings: {
            id: string;
            booking_id: string;
            event_id: string;
            tickets_count: number;
            user_id: string;
            booking_status: string;
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

    // Check if payment already processed
    if (payment.status === 'SUCCESSFUL') {
      return NextResponse.json({
        error: 'Payment already successful, cannot mark as failed',
      }, { status: 400 });
    }

    if (payment.status === 'FAILED') {
      return NextResponse.json({
        success: true,
        message: 'Payment already marked as failed',
      });
    }


    // Restore event capacity BEFORE deleting
    const { data: eventData, error: eventFetchError } = await supabase
      .from('events')
      .select('remaining')
      .eq('event_id', payment.bookings.event_id)
      .single() as { data: { remaining: number } | null; error: any };

    if (!eventFetchError && eventData) {
      const newRemaining = eventData.remaining + payment.bookings.tickets_count;
      const { error: capacityError } = await (supabase
        .from('events') as any)
        .update({ remaining: newRemaining })
        .eq('event_id', payment.bookings.event_id);

      if (capacityError) {
        // Don't fail the whole operation
      } else {
      }
    }

    // Delete the payment record
    const { error: paymentDeleteError } = await supabase
      .from('payments')
      .delete()
      .eq('id', payment.id);

    if (paymentDeleteError) {
      // Continue anyway
    }

    // Delete the booking (CASCADE will delete associated records)
    const { error: bookingDeleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('booking_id', payment.bookings.booking_id);

    if (bookingDeleteError) {
      return NextResponse.json(
        { error: 'Failed to delete booking' },
        { status: 500 }
      );
    }


    return NextResponse.json({
      success: true,
      message: 'Booking deleted and tickets released',
      booking_id: payment.bookings.booking_id,
      tickets_released: payment.bookings.tickets_count,
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
