import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateQRCode } from '@/lib/qr-generator';

// GET /api/tickets/[ticketId]/qr - Generate QR code for a specific ticket
export async function GET(
  request: Request,
  { params }: { params: { ticketId: string } }
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

    const ticketId = params.ticketId;

    if (!ticketId) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }

    // Get ticket details with booking info
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        ticket_id,
        booking_id,
        ticket_number,
        ticket_code,
        qr_nonce,
        checked_in,
        bookings!inner (
          booking_id,
          event_id,
          user_id,
          booking_code
        )
      `)
      .eq('ticket_id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const ticketData = ticket as any;
    const booking = ticketData.bookings;

    // Verify the ticket belongs to the user
    if (booking.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to access this ticket' },
        { status: 403 }
      );
    }

    // Generate QR code with ticket-specific data
    const qrCodeDataURL = await generateQRCode({
      booking_id: booking.booking_id,
      event_id: booking.event_id,
      user_id: booking.user_id,
      qr_nonce: ticketData.qr_nonce,
      booking_code: booking.booking_code,
      timestamp: Date.now(),
      // Ticket-specific fields
      ticket_id: ticketData.ticket_id,
      ticket_code: ticketData.ticket_code,
      ticket_number: ticketData.ticket_number,
    });

    return NextResponse.json({
      success: true,
      qr_code: qrCodeDataURL,
      ticket: {
        ticket_id: ticketData.ticket_id,
        ticket_code: ticketData.ticket_code,
        ticket_number: ticketData.ticket_number,
        checked_in: ticketData.checked_in,
      },
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
