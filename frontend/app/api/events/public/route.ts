import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/events/public
 * Public endpoint to get events with accurate booking counts
 * This bypasses RLS policies to show correct slot availability to all users
 * Uses service role key to access all bookings
 */
export async function GET() {
  try {
    // Create admin client with service role key to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get only PUBLISHED events (hide checkin_open, draft, ended events from public)
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('events')
      .select(`
        event_id,
        title,
        description,
        date_time,
        venue_name,
        venue_address,
        city,
        capacity,
        ticket_price,
        status,
        event_image,
        entry_instructions,
        terms,
        latitude,
        longitude,
        created_at,
        updated_at
      `)
      .eq('status', 'published')
      .order('date_time', { ascending: true });

    if (eventsError) {
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    if (!events || events.length === 0) {
      return NextResponse.json(
        { events: [] },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }

    // PERFORMANCE FIX: Calculate real booking counts in SINGLE query (eliminates N+1 problem)
    // Before: Promise.all with N queries (one per event) = 1 + N database round-trips
    // After: 2 queries total (events + aggregated bookings) regardless of event count
    const eventIds = events.map(e => e.event_id);
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('event_id, tickets_count')
      .in('event_id', eventIds)
      .eq('booking_status', 'confirmed');

    if (bookingsError) {
    }

    // Aggregate booking counts by event_id (in-memory)
    const bookedTicketsByEvent = (bookings || []).reduce((acc: Record<string, number>, booking: any) => {
      acc[booking.event_id] = (acc[booking.event_id] || 0) + (booking.tickets_count || 1);
      return acc;
    }, {});

    // Attach aggregated counts to events
    const eventsWithBookingCounts = events.map((event: any) => {
      const totalTickets = bookedTicketsByEvent[event.event_id] || 0;
      const calculatedRemaining = Math.max(0, event.capacity - totalTickets);

      return {
        ...event,
        remaining: calculatedRemaining,
        booked: totalTickets
      };
    });

    return NextResponse.json(
      {
        events: eventsWithBookingCounts,
        count: eventsWithBookingCounts.length,
        timestamp: new Date().toISOString() // Add timestamp to help with debugging
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );

  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
