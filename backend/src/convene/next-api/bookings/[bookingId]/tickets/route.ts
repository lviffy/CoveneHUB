import { NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';

// GET /api/bookings/[bookingId]/tickets - Get all tickets for a booking
export async function GET(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const bookingId = params.bookingId;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Verify the booking belongs to the user
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('user_id, event_id, booking_code, tickets_count')
      .eq('booking_id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const bookingData = booking as any;

    if (bookingData.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to access this booking' },
        { status: 403 }
      );
    }

    // Get all tickets for this booking
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        ticket_id,
        booking_id,
        ticket_number,
        ticket_code,
        qr_nonce,
        checked_in,
        checked_in_at,
        checked_in_by,
        created_at
      `)
      .eq('booking_id', bookingId)
      .order('ticket_number', { ascending: true });

    if (ticketsError) {
      return NextResponse.json(
        { error: 'Failed to fetch tickets' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: {
        booking_id: bookingId,
        event_id: bookingData.event_id,
        booking_code: bookingData.booking_code,
        tickets_count: bookingData.tickets_count,
      },
      tickets: tickets || [],
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
