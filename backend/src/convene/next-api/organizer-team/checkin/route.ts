import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/convene/server';
import { verifyQRPayload } from '@/lib/qr-generator';
import { rateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ FIX: Add rate limiting (10 check-in attempts per minute per user)
    const rateLimitResult = rateLimit(`checkin:${session.user.id}`, {
      interval: 60000, // 1 minute
      maxRequests: 10,
    });

    if (!rateLimitResult.success) {
      const resetDate = new Date(rateLimitResult.reset);
      return NextResponse.json(
        {
          error: 'Too many check-in attempts. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil(
              (rateLimitResult.reset - Date.now()) / 1000
            ).toString(),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetDate.toISOString(),
          },
        }
      );
    }

    // Verify organizer role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if ((profile as any)?.role !== 'organizer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { eventId, qrCode, bookingId, phoneNumber, method, ticketId } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Verify event exists and check-in is allowed (within 30 minutes before event)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('event_id, title, date_time, status, created_by')
      .eq('event_id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if ((event as any).created_by !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden. You can only manage your own events.' }, { status: 403 });
    }

    // Check if check-in is within the allowed time window (30 minutes before event)
    // Check if check-in is within the allowed time window (30 minutes before event)
    // OR if the event status is explicitly set to 'checkin_open'
    const now = new Date();
    const eventTime = new Date((event as any).date_time);
    const checkinOpenTime = new Date(eventTime.getTime() - 30 * 60 * 1000);

    // Allow check-in if within 30 mins window OR if manually opened
    if (now < checkinOpenTime && (event as any).status !== 'checkin_open') {
      const minutesUntilOpen = Math.ceil((checkinOpenTime.getTime() - now.getTime()) / 60000);
      return NextResponse.json({
        error: `Check-in opens 30 minutes before the event. Please wait ${minutesUntilOpen} more minute(s).`,
        isDuplicate: false
      }, { status: 400 });
    }

    // Also check if event status allows check-in
    // Allow check-in for published, checkin_open, and in_progress events (within time window)
    const allowedStatuses = ['published', 'checkin_open', 'in_progress'];
    if (!allowedStatuses.includes((event as any).status)) {
      return NextResponse.json({
        error: `Check-in is not available for ${(event as any).status} events`,
        isDuplicate: false
      }, { status: 400 });
    }

    // Auto-transition event from 'published' to 'checkin_open' when within the check-in window.
    // The DB function check_in_ticket only allows checkin_open/in_progress,
    // so we must update the status first to avoid the RPC rejecting the check-in.
    if ((event as any).status === 'published' && now >= checkinOpenTime) {
      const { error: statusUpdateError } = await supabase
        .from('events')
        // @ts-expect-error - Supabase generated types don't include status as updatable
        .update({ status: 'checkin_open' })
        .eq('event_id', eventId);

      if (statusUpdateError) {
        console.error('Failed to auto-update event status to checkin_open:', statusUpdateError);
        // Don't block check-in — fall through and let the RPC handle it
      }
    }

    let booking: any;
    let ticketToCheckIn: any = null;

    // Find booking based on method
    if (method === 'qr' && qrCode) {
      // QR code contains signed JSON payload with ticket_id or booking_id
      // Parse and verify the QR data
      let qrPayload: any = null;


      // ✅ FIX: Use proper signature verification
      qrPayload = verifyQRPayload(qrCode);

      if (!qrPayload) {
        return NextResponse.json({
          error: 'Invalid or tampered QR code - signature verification failed',
          isDuplicate: false
        }, { status: 403 });
      }

      // ✅ FIX: Validate QR timestamp (must be within 7 days)
      const now = Date.now();
      const qrAge = now - qrPayload.timestamp;
      const MAX_QR_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

      if (qrAge > MAX_QR_AGE || qrAge < 0) {
        return NextResponse.json({
          error: 'QR code has expired. Please generate a new one from your bookings page.',
          isDuplicate: false
        }, { status: 403 });
      }

      // ✅ FIX: Check event date proximity (can't check in to events more than 2 hours past)
      const eventTime = new Date((event as any).date_time).getTime();
      const timeSinceEvent = now - eventTime;
      const MAX_TIME_AFTER_EVENT = 2 * 60 * 60 * 1000; // 2 hours after event

      if (timeSinceEvent > MAX_TIME_AFTER_EVENT) {
        return NextResponse.json({
          error: 'Check-in is no longer available for this event',
          isDuplicate: false
        }, { status: 403 });
      }


      // Try ticket-based check-in first (if ticket_id present)
      if (qrPayload.ticket_id) {

        const { data: ticketData, error: ticketError } = await supabase
          .from('tickets')
          .select(`
            *,
            bookings!inner (
              *,
              profile:user_id (*)
            )
          `)
          .eq('ticket_id', qrPayload.ticket_id)
          .single();

        if (ticketError) {
        }

        if (ticketData && !ticketError) {
          // This is a ticket QR code
          ticketToCheckIn = ticketData;
          booking = (ticketData as any).bookings;

          // Verify event matches
          if (booking.event_id !== eventId) {
            return NextResponse.json({
              error: 'This ticket is not for this event',
              isDuplicate: false
            }, { status: 400 });
          }
        } else {
          // Ticket not found
          return NextResponse.json({
            error: 'Invalid QR code or ticket not found',
            isDuplicate: false,
            details: 'Could not find ticket with the provided ID'
          }, { status: 404 });
        }
      } else if (qrPayload.booking_id) {
        // Try booking_id (old QR codes without ticket_id)
        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            profile:user_id (*)
          `)
          .eq('event_id', eventId)
          .eq('booking_id', qrPayload.booking_id)
          .single();

        if (error || !data) {
          return NextResponse.json({
            error: 'Invalid QR code or booking not found',
            isDuplicate: false
          }, { status: 404 });
        }

        booking = data;
      } else {
        return NextResponse.json({
          error: 'Invalid QR code format',
          isDuplicate: false
        }, { status: 400 });
      }
    } else if (method === 'manual') {
      if (bookingId) {
        // Check if it's a ticket code (format: BOOKING-N) or just booking code
        const ticketCodePattern = /^([A-Z0-9]+)-(\d+)$/;
        const ticketMatch = bookingId.toUpperCase().match(ticketCodePattern);

        if (ticketMatch) {
          // This is a ticket code like "CB6BB155-2"
          const ticketCode = bookingId.toUpperCase();


          const { data: ticketData, error: ticketError } = await supabase
            .from('tickets')
            .select(`
              *,
              bookings!inner (
                *,
                profile:user_id (*)
              )
            `)
            .eq('ticket_code', ticketCode)
            .eq('bookings.event_id', eventId)
            .single();

          if (ticketError || !ticketData) {
            return NextResponse.json({
              error: 'Ticket not found with code: ' + ticketCode,
              isDuplicate: false
            }, { status: 404 });
          }

          // Found the ticket
          ticketToCheckIn = ticketData;
          booking = (ticketData as any).bookings;
        } else {
          // This is just a booking code like "CB6BB155"

          const { data, error } = await supabase
            .from('bookings')
            .select(`
              *,
              profile:user_id (*)
            `)
            .eq('event_id', eventId)
            .eq('booking_code', bookingId.toUpperCase())
            .single();

          if (error || !data) {
            return NextResponse.json({
              error: 'Booking not found with code: ' + bookingId.toUpperCase(),
              isDuplicate: false
            }, { status: 404 });
          }

          booking = data;
          // Note: ticketToCheckIn remains null, so it will check in all tickets in the booking
        }
      } else if (phoneNumber) {
        // Phone number search - check profiles table

        // First normalize the phone number
        let normalizedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');

        // Remove +91 or 91 prefix if present
        if (normalizedPhone.startsWith('+91')) {
          normalizedPhone = normalizedPhone.substring(3);
        } else if (normalizedPhone.startsWith('91') && normalizedPhone.length > 10) {
          normalizedPhone = normalizedPhone.substring(2);
        }


        // Get all bookings for this event with user profiles that have phone
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select(`
            *,
            profiles:user_id (
              id,
              full_name,
              email,
              phone
            )
          `)
          .eq('event_id', eventId)
          .neq('booking_status', 'cancelled');

        if (error || !bookings || bookings.length === 0) {
          return NextResponse.json({
            error: 'No bookings found for this event',
            isDuplicate: false
          }, { status: 404 });
        }


        // Search for matching phone in profiles
        let foundBooking = null;
        for (const b of bookings) {
          const profile = (b as any).profiles;
          if (profile && profile.phone) {
            const userPhone = profile.phone;
            const userPhoneNormalized = userPhone.replace(/[\s\-\(\)]/g, '').replace(/^\+?91/, '');


            if (userPhoneNormalized === normalizedPhone || userPhone === phoneNumber) {
              foundBooking = b;
              break;
            }
          }
        }

        if (!foundBooking) {
          return NextResponse.json({
            error: 'No booking found for phone number: ' + phoneNumber,
            isDuplicate: false,
            details: 'Make sure the phone number matches the one used during booking'
          }, { status: 404 });
        }

        booking = foundBooking;
      } else {
        return NextResponse.json({
          error: 'Booking ID or phone number required for manual check-in'
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid check-in method' }, { status: 400 });
    }

    // Extract user name from profiles relation
    const userName = booking.profiles?.full_name || booking.profile?.full_name || 'Unknown';
    const userId = booking.profiles?.id || booking.profile?.id || booking.user_id;

    // If we have a specific ticket, check it in using the database function
    if (ticketToCheckIn) {
      // Call the check_in_ticket database function
      const { data: checkInResult, error: checkInError } = await supabase
        // @ts-expect-error - Supabase generated types don't include custom RPC functions
        .rpc('check_in_ticket', {
          p_ticket_id: ticketToCheckIn.ticket_id,
          p_checked_in_by: session.user.id
        });

      if (checkInError) {
        return NextResponse.json({
          error: 'Failed to check in ticket',
          isDuplicate: false
        }, { status: 500 });
      }

      const result: any = Array.isArray(checkInResult) ? checkInResult[0] : checkInResult;

      if (!result.success) {
        // Check if it's a duplicate check-in
        const isDuplicate = result.message?.includes('already been checked in');
        return NextResponse.json({
          error: result.message,
          isDuplicate: isDuplicate,
          ticket: {
            ticketId: ticketToCheckIn.ticket_id,
            ticketCode: result.ticket_code || ticketToCheckIn.ticket_code,
            ticketNumber: ticketToCheckIn.ticket_number,
            checkInTime: result.checked_in_at || ticketToCheckIn.checked_in_at
          }
        }, { status: 400 });
      }

      // Log the check-in activity
      try {
        // @ts-expect-error - Supabase generated types don't include audit_logs table
        await supabase.from('audit_logs').insert({
          user_id: session.user.id,
          action: 'ticket_checkin',
          resource_type: 'ticket',
          resource_id: ticketToCheckIn.ticket_id,
          details: {
            event_id: eventId,
            booking_id: booking.booking_id,
            booking_code: booking.booking_code,
            ticket_id: ticketToCheckIn.ticket_id,
            ticket_code: ticketToCheckIn.ticket_code,
            ticket_number: ticketToCheckIn.ticket_number,
            method,
            attendee_name: userName,
            attendee_id: userId
          }
        });
      } catch (auditError) {
      }

      return NextResponse.json({
        success: true,
        message: 'Ticket checked in successfully!',
        ticket: {
          ticketId: ticketToCheckIn.ticket_id,
          ticketCode: ticketToCheckIn.ticket_code,
          ticketNumber: ticketToCheckIn.ticket_number,
          bookingCode: booking.booking_code,
          attendeeName: userName,
          checkInTime: result.checked_in_at
        }
      });
    }

    // Otherwise, fall back to booking-level check-in (old behavior)
    // Check if already checked in
    if (booking.checked_in) {
      const checkedInTime = new Date(booking.checked_in_at).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      return NextResponse.json({
        error: `${userName} is already checked in!`,
        message: `This attendee was already checked in at ${checkedInTime}`,
        isDuplicate: true,
        booking: {
          bookingId: booking.booking_id,
          bookingCode: booking.booking_code,
          attendeeName: userName,
          ticketsCount: booking.tickets_count,
          checkInTime: booking.checked_in_at
        }
      }, { status: 400 });
    }

    // Check if booking is cancelled
    if (booking.booking_status === 'cancelled') {
      return NextResponse.json({
        error: 'This booking has been cancelled',
        isDuplicate: false
      }, { status: 400 });
    }

    // Perform check-in
    const updateData = {
      checked_in: true,
      checked_in_at: new Date().toISOString(),
      checked_in_by: session.user.id
    };

    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      // @ts-expect-error - Supabase generated types don't include check-in fields
      .update(updateData)
      .eq('booking_id', booking.booking_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({
        error: 'Failed to complete check-in'
      }, { status: 500 });
    }

    // Log the check-in activity
    try {
      // @ts-expect-error - Supabase generated types don't include audit_logs table
      await supabase.from('audit_logs').insert({
        user_id: session.user.id,
        action: 'event_checkin',
        resource_type: 'booking',
        resource_id: booking.booking_id,
        details: {
          event_id: eventId,
          booking_id: booking.booking_id,
          booking_code: booking.booking_code,
          method,
          attendee_name: userName,
          attendee_id: userId,
          tickets_count: booking.tickets_count
        }
      });
    } catch (auditError) {
      // Don't fail the check-in if audit log fails
    }

    return NextResponse.json({
      success: true,
      message: 'Check-in successful!',
      booking: {
        bookingId: (updatedBooking as any).booking_id,
        bookingCode: (updatedBooking as any).booking_code,
        attendeeName: userName,
        ticketsCount: (updatedBooking as any).tickets_count,
        checkInTime: (updatedBooking as any).checked_in_at
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
