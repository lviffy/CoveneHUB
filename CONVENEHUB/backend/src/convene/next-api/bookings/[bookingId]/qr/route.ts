import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateQRCode, type QRPayload } from '@/lib/qr-generator';

// GET /api/bookings/[bookingId]/qr - Generate QR code for a booking
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

    // Fetch booking details (explicit columns for QR payload)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        booking_id,
        event_id,
        user_id,
        qr_nonce,
        booking_code,
        booking_status
      `)
      .eq('booking_id', params.bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify user owns this booking (unless they're admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isOwner = (booking as any).user_id === user.id;
    const isAdmin = (profile as any)?.role === 'eon_team';

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permission to access this booking.' },
        { status: 403 }
      );
    }

    // Create QR payload
    const qrPayload: QRPayload = {
      booking_id: (booking as any).booking_id,
      event_id: (booking as any).event_id,
      user_id: (booking as any).user_id,
      qr_nonce: (booking as any).qr_nonce,
      booking_code: (booking as any).booking_code,
      timestamp: Date.now(),
    };

    // Generate QR code
    const qrCodeDataURL = await generateQRCode(qrPayload);

    return NextResponse.json({
      success: true,
      qr_code: qrCodeDataURL,
      booking_code: (booking as any).booking_code,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
