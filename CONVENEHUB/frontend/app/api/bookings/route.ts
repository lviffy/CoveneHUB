import { NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { generateQRCode } from '@/lib/qr-generator';
import { sendBookingConfirmationWithQR, sendBookingConfirmationWithMultipleTickets } from '@/lib/email/service';
import { format } from 'date-fns';
import type { Database } from '@/types/database.types';

// POST /api/bookings - Create a new booking
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to book tickets.' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { event_id, tickets_count = 1, coupon_code } = body;

    if (!event_id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Validate tickets_count
    if (tickets_count < 1) {
      return NextResponse.json(
        { error: 'Tickets count must be at least 1' },
        { status: 400 }
      );
    }

    // Check if event exists and is not in the past
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('event_id, date_time, status, ticket_price')
      .eq('event_id', event_id)
      .single() as {
        data: {
          event_id: string;
          date_time: string;
          status: string;
          ticket_price: number;
        } | null;
        error: any;
      };

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check if event date is in the past
    const eventDateTime = new Date(event.date_time);
    const now = new Date();

    if (eventDateTime < now) {
      return NextResponse.json(
        { error: 'Cannot book tickets for past events' },
        { status: 400 }
      );
    }

    // Calculate amounts
    const ticketPrice = Number(event.ticket_price || 0);
    const originalAmount = ticketPrice * tickets_count;
    let discountAmount = 0;
    let finalAmount = originalAmount;
    let couponId: number | null = null;

    // Validate and apply coupon if provided
    if (coupon_code) {
      const { data: couponValidation, error: couponError } = await supabase.rpc(
        'validate_and_calculate_coupon' as any,
        {
          p_coupon_code: coupon_code.toUpperCase(),
          p_event_id: event_id,
          p_user_id: user.id,
          p_tickets_count: tickets_count,
          p_original_amount: originalAmount,
        } as any
      );

      if (couponError || !(couponValidation as any)?.valid) {
        return NextResponse.json(
          { error: (couponValidation as any)?.error || couponError?.message || 'Invalid coupon code' },
          { status: 400 }
        );
      }

      discountAmount = (couponValidation as any).discount_amount || 0;
      finalAmount = (couponValidation as any).final_amount || 0;
      couponId = (couponValidation as any).coupon_id || null;
    }

    // Check server config
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Create admin client to bypass RLS for booking creation
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

    // Check for existing booking
    const { data: existingBooking } = await supabaseAdmin
      .from('bookings')
      .select('booking_id, tickets_count, booking_status, payment_status')
      .eq('event_id', event_id)
      .eq('user_id', user.id)
      .neq('booking_status', 'cancelled')
      .in('payment_status', ['NOT_REQUIRED', 'SUCCESSFUL', 'PAID'])
      .maybeSingle() as { data: any };

    if (existingBooking) {
      return NextResponse.json(
        {
          error: 'You already have a booking for this event',
          existing_booking: {
            booking_id: existingBooking.booking_id,
            current_tickets: existingBooking.tickets_count,
            can_add_more: true,
            max_additional_tickets: null,
            booking_status: existingBooking.booking_status,
            payment_status: existingBooking.payment_status
          }
        },
        { status: 409 }
      );
    }

    // Check event capacity and status
    const { data: eventCheck, error: eventCheckError } = await supabaseAdmin
      .from('events')
      .select('remaining, status')
      .eq('event_id', event_id)
      .single() as { data: { remaining: number; status: string } | null; error: any };

    if (eventCheckError || !eventCheck) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (eventCheck.status !== 'published' && eventCheck.status !== 'checkin_open') {
      return NextResponse.json(
        { error: 'This event is not available for booking' },
        { status: 400 }
      );
    }

    if (eventCheck.remaining < tickets_count) {
      return NextResponse.json(
        { error: `Not enough slots available. Only ${eventCheck.remaining} slots remaining.` },
        { status: 400 }
      );
    }

    // Generate booking code
    const bookingCode = Array.from(
      { length: 8 },
      () => Math.floor(Math.random() * 36).toString(36)
    ).join('').toUpperCase();

    // Create booking with all required fields using admin client
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        user_id: user.id,
        event_id: event_id,
        tickets_count: tickets_count,
        original_amount: originalAmount,
        discount_amount: discountAmount,
        total_amount: finalAmount,
        coupon_id: couponId,
        payment_required: false,
        payment_status: 'NOT_REQUIRED',
        booking_status: 'confirmed',
        booking_code: bookingCode,
      } as any)
      .select('booking_id, booking_code')
      .single() as { data: { booking_id: string; booking_code: string } | null; error: any };

    if (bookingError || !booking) {
      console.error('Booking creation failed:', bookingError);
      return NextResponse.json(
        { error: bookingError?.message || 'Failed to create booking' },
        { status: 500 }
      );
    }

    // Decrement event remaining count
    const { error: decrementError } = await (supabaseAdmin
      .from('events') as any)
      .update({ remaining: eventCheck.remaining - tickets_count })
      .eq('event_id', event_id);

    if (decrementError) {
      console.error('Failed to decrement remaining count:', decrementError);
    }

    // Create tickets for the booking
    const ticketsToCreate = [];
    for (let i = 0; i < tickets_count; i++) {
      const ticketCode = Array.from(
        { length: 6 },
        () => Math.floor(Math.random() * 36).toString(36)
      ).join('').toUpperCase();

      ticketsToCreate.push({
        booking_id: booking.booking_id,
        ticket_number: i + 1,
        ticket_code: ticketCode,
        status: 'valid',
      });
    }

    if (ticketsToCreate.length > 0) {
      const { error: ticketError } = await supabaseAdmin
        .from('tickets')
        .insert(ticketsToCreate as any);

      if (ticketError) {
        console.error('Failed to create tickets:', ticketError);
      }
    }

    // Use booking data for further processing
    const bookingData = { booking_id: booking.booking_id, booking_code: booking.booking_code };

    // Fetch complete booking details with event info
    const { data: bookingDetails, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        booking_id,
        event_id,
        user_id,
        booking_code,
        qr_nonce,
        tickets_count,
        total_amount,
        booking_status,
        checked_in,
        checked_in_at,
        checked_in_by,
        booked_at,
        events (
          title,
          date_time,
          venue_name,
          venue_address,
          city,
          entry_instructions
        )
      `)
      .eq('booking_id', (bookingData as any).booking_id)
      .single();

    if (fetchError) {
      // Still return success with basic data
      return NextResponse.json({
        success: true,
        booking: bookingData,
        message: 'Booking created successfully'
      });
    }

    // Track coupon usage if coupon was applied
    if (coupon_code) {
      try {
        // Get coupon details
        const { data: coupon, error: couponError } = await supabase
          .from('coupons')
          .select('id, discount_value, discount_type')
          .eq('code', coupon_code.toUpperCase())
          .eq('is_active', true)
          .single() as {
            data: {
              id: number;
              discount_value: number;
              discount_type: string;
            } | null;
            error: any;
          };

        if (!couponError && coupon && bookingDetails) {
          const booking = bookingDetails as any;

          // Calculate discount amount
          let discountAmount = 0;
          const originalAmount = booking.total_amount || 0;

          if (coupon.discount_type === 'percentage') {
            discountAmount = (originalAmount * coupon.discount_value) / 100;
          } else if (coupon.discount_type === 'fixed') {
            discountAmount = coupon.discount_value;
          } else if (coupon.discount_type === 'free') {
            discountAmount = originalAmount;
          }

          // Record coupon usage
          await (supabase
            .from('coupon_usage') as any)
            .insert({
              coupon_id: coupon.id,
              booking_id: booking.booking_id,
              user_id: user.id,
              discount_amount: discountAmount,
              original_amount: originalAmount,
            });
        }
      } catch (couponError) {
        // Don't fail the booking if coupon tracking fails
      }
    }

    // Send confirmation email with ticket IDs (async, don't wait)
    try {
      const booking = bookingDetails as any;
      const event = booking.events;

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single() as { data: { full_name: string } | null };

      // Fetch all tickets for this booking
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('ticket_id, ticket_number, ticket_code')
        .eq('booking_id', booking.booking_id)
        .order('ticket_number', { ascending: true });

      if (ticketsError || !tickets || tickets.length === 0) {
        // Fallback to old method if tickets not found
        const qrCodeDataURL = await generateQRCode({
          booking_id: booking.booking_id,
          event_id: booking.event_id,
          user_id: booking.user_id,
          qr_nonce: booking.qr_nonce,
          booking_code: booking.booking_code,
          timestamp: Date.now(),
        });

        sendBookingConfirmationWithQR(
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
          qrCodeDataURL
        ).catch((emailError: any) => {
        });
      } else {
        // Prepare ticket list (no QR generation needed)
        const ticketsList = (tickets as any[]).map((ticket) => ({
          ticket_number: ticket.ticket_number,
          ticket_code: ticket.ticket_code,
          ticket_id: ticket.ticket_id,
        }));

        console.log('📧 [FREE-BOOKING] Preparing to send booking confirmation email...');

        // Send email with ticket IDs only (don't await to not block response)
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
          console.log('✅ [FREE-BOOKING] Booking confirmation email sent successfully to:', user.email);
          console.log('   📨 Email type: ConveneHub Booking Confirmation');
          console.log('   📋 Booking code:', booking.booking_code);
          console.log('   🎫 Tickets:', ticketsList.length);
        }).catch((emailError: any) => {
          console.error('❌ [FREE-BOOKING] CRITICAL: Failed to send booking confirmation email');
          console.error('   📧 Recipient:', user.email);
          console.error('   📋 Booking code:', booking.booking_code);
          console.error('   ⚠️  Error:', emailError.message);
          console.error('   📚 Stack:', emailError.stack);
          console.error('   ⚠️  USER DID NOT RECEIVE BOOKING CONFIRMATION EMAIL!');
        });
      }
    } catch (emailError) {
      console.error('❌ [FREE-BOOKING] Email sending process failed with exception:', emailError);
      // Continue even if email fails
    }

    return NextResponse.json({
      success: true,
      booking: bookingDetails,
      message: 'Booking created successfully. Check your email for confirmation.'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// GET /api/bookings - Get current user's bookings
export async function GET(request: Request) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // Filter by status if provided
    const eventId = searchParams.get('event_id'); // Filter by event if provided

    // Build query
    let query = supabase
      .from('bookings')
      .select(`
        booking_id,
        event_id,
        user_id,
        booking_code,
        qr_nonce,
        tickets_count,
        total_amount,
        booking_status,
        checked_in,
        checked_in_at,
        checked_in_by,
        booked_at,
        payment_status,
        payment_required,
        events!event_id (
          event_id,
          title,
          description,
          date_time,
          venue_name,
          venue_address,
          city,
          entry_instructions,
          event_image,
          status,
          ticket_price
        )
      `)
      .eq('user_id', user.id)
      .neq('booking_status', 'cancelled') // Don't show cancelled bookings
      .order('booked_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('booking_status', status);
    }

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data: bookings, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    // Transform the response to flatten the events relationship
    const transformedBookings = (bookings || []).map((booking: any) => ({
      ...booking,
      event: booking.events && Array.isArray(booking.events) ? booking.events[0] : booking.events,
      events: undefined, // Remove the array version
    }));

    return NextResponse.json({
      success: true,
      bookings: transformedBookings || [],
      count: transformedBookings?.length || 0
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
