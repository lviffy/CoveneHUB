import { NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';

/**
 * POST /api/bookings/[bookingId]/create-missing-tickets
 * 
 * Manually creates tickets for a confirmed booking that is missing them.
 * This is a fallback endpoint in case ticket creation fails during payment verification.
 * 
 * Requirements:
 * - Booking must be confirmed
 * - Booking must have payment_status = 'SUCCESSFUL'
 * - No tickets should exist yet for this booking
 * - User must own the booking
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[CREATE-TICKETS] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { bookingId } = await params;
    console.log('[CREATE-TICKETS] Creating tickets for booking:', bookingId);

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('user_id, booking_code, tickets_count, booking_status, payment_status')
      .eq('booking_id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('[CREATE-TICKETS] Booking not found:', bookingError);
      console.error('[CREATE-TICKETS] Booking ID:', bookingId);
      return NextResponse.json(
        { error: 'Booking not found', details: bookingError?.message },
        { status: 404 }
      );
    }

    const bookingData = booking as any;
    console.log('[CREATE-TICKETS] Booking found:', {
      bookingId,
      status: bookingData.booking_status,
      payment: bookingData.payment_status,
      tickets_count: bookingData.tickets_count
    });

    // Verify user owns this booking
    if (bookingData.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to access this booking' },
        { status: 403 }
      );
    }

    // Verify booking is confirmed and paid
    if (bookingData.booking_status !== 'confirmed') {
      console.error('[CREATE-TICKETS] Booking not confirmed:', bookingData.booking_status);
      return NextResponse.json(
        { error: 'Booking must be confirmed to create tickets', current_status: bookingData.booking_status },
        { status: 400 }
      );
    }

    if (bookingData.payment_status !== 'SUCCESSFUL' && bookingData.payment_status !== 'NOT_REQUIRED') {
      console.error('[CREATE-TICKETS] Payment not successful:', bookingData.payment_status);
      return NextResponse.json(
        { error: 'Payment must be successful to create tickets', current_payment_status: bookingData.payment_status },
        { status: 400 }
      );
    }

    // Check if tickets already exist
    const { data: existingTickets, error: existingTicketsError } = await supabase
      .from('tickets')
      .select('ticket_id')
      .eq('booking_id', bookingId);

    if (existingTicketsError) {
      console.error('[CREATE-TICKETS] Error checking existing tickets:', existingTicketsError);
      return NextResponse.json(
        { error: 'Failed to check existing tickets', details: existingTicketsError.message },
        { status: 500 }
      );
    }

    if (existingTickets && existingTickets.length > 0) {
      console.log('[CREATE-TICKETS] Tickets already exist:', existingTickets.length);
      return NextResponse.json(
        { 
          success: true, 
          message: 'Tickets already exist for this booking',
          tickets_count: existingTickets.length 
        }
      );
    }

    console.log('[CREATE-TICKETS] No existing tickets found, creating new ones...');

    // Generate booking_code if it doesn't exist
    let bookingCode = bookingData.booking_code;
    
    if (!bookingCode) {
      // Generate a unique 8-character booking code
      bookingCode = Array.from(
        { length: 8 }, 
        () => Math.floor(Math.random() * 36).toString(36)
      ).join('').toUpperCase();
      
      // Update the booking with the generated code
      const { error: updateCodeError } = await (supabase
        .from('bookings') as any)
        .update({ booking_code: bookingCode })
        .eq('booking_id', bookingId);
      
      if (updateCodeError) {
        console.error('Failed to update booking_code:', updateCodeError);
        return NextResponse.json(
          { error: 'Failed to generate booking code' },
          { status: 500 }
        );
      }
      
      console.log(`[CREATE-TICKETS] Generated booking_code: ${bookingCode}`);
    } else {
      console.log(`[CREATE-TICKETS] Using existing booking_code: ${bookingCode}`);
    }

    // Create tickets
    const ticketsToCreate = [];
    
    console.log(`[CREATE-TICKETS] Creating ${bookingData.tickets_count} tickets with booking code: ${bookingCode}`);
    
    for (let ticketNumber = 1; ticketNumber <= bookingData.tickets_count; ticketNumber++) {
      // Create unique ticket code (e.g., ABC12345-1, ABC12345-2)
      const ticketCode = `${bookingCode}-${ticketNumber}`;
      
      // Generate unique nonce for QR security (16 character hex string)
      const qrNonce = Array.from(
        { length: 16 }, 
        () => Math.floor(Math.random() * 16).toString(16)
      ).join('').toUpperCase();
      
      ticketsToCreate.push({
        booking_id: bookingId,
        ticket_number: ticketNumber,
        ticket_code: ticketCode,
        qr_nonce: qrNonce,
        checked_in: false,
      });
    }

    console.log(`[CREATE-TICKETS] Prepared ${ticketsToCreate.length} tickets to insert`);
    console.log('[CREATE-TICKETS] Sample ticket:', ticketsToCreate[0]);

    // Insert all tickets
    const { data: insertedTickets, error: ticketsInsertError } = await (supabase
      .from('tickets') as any)
      .insert(ticketsToCreate)
      .select();
    
    if (ticketsInsertError) {
      console.error('[CREATE-TICKETS] ❌ Failed to create tickets:', ticketsInsertError);
      console.error('[CREATE-TICKETS] ❌ Error details:', JSON.stringify(ticketsInsertError, null, 2));
      console.error('[CREATE-TICKETS] ❌ Attempted to insert:', JSON.stringify(ticketsToCreate, null, 2));
      return NextResponse.json(
        { error: 'Failed to create tickets', details: ticketsInsertError.message },
        { status: 500 }
      );
    }

    console.log(`[CREATE-TICKETS] ✅ Successfully created ${ticketsToCreate.length} tickets for booking ${bookingId}`);

    return NextResponse.json({
      success: true,
      message: `Successfully created ${ticketsToCreate.length} tickets`,
      booking_code: bookingCode,
      tickets_count: ticketsToCreate.length,
      tickets: insertedTickets,
    });

  } catch (error: any) {
    console.error('[CREATE-TICKETS] ❌ Unexpected error:', error);
    console.error('[CREATE-TICKETS] ❌ Error stack:', error?.stack);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
