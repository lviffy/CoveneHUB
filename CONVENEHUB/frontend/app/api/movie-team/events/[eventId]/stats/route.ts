import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/convene/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const supabase = await createServerClient();
    
    // Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify movie team role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if ((profile as any)?.role !== 'movie_team') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const eventId = params.eventId;

    // Verify movie team member is assigned to this event
    const { data: assignment } = await supabase
      .from('movie_team_assignments')
      .select('assignment_id')
      .eq('user_id', session.user.id)
      .eq('event_id', eventId)
      .single();

    if (!assignment) {
      return NextResponse.json({ error: 'Not assigned to this event' }, { status: 403 });
    }

    // Get event details - use event_id column
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('capacity, event_id, title')
      .eq('event_id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const capacity = (event as any).capacity;

    // Get total tickets count from bookings
    const { data: allBookings, error: totalBookedError } = await supabase
      .from('bookings')
      .select('tickets_count')
      .eq('event_id', eventId)
      .neq('booking_status', 'cancelled');

    if (totalBookedError) {
    }

    // Count checked-in tickets by joining with bookings
    const { data: checkedInTickets, error: ticketCheckInError } = await supabase
      .from('tickets')
      .select(`
        ticket_id,
        checked_in,
        bookings!inner(event_id, booking_status)
      `)
      .eq('bookings.event_id', eventId)
      .eq('checked_in', true)
      .neq('bookings.booking_status', 'cancelled');

    if (ticketCheckInError) {
    }

    // Sum up all tickets from bookings
    const totalTickets = allBookings?.reduce((sum: number, booking: any) => sum + (booking.tickets_count || 1), 0) ?? 0;
    
    // Count actual checked-in tickets
    const checkedInTicketsCount = checkedInTickets?.length ?? 0;
    
    const remaining = capacity - totalTickets;
    const percentageFilled = capacity > 0 ? (totalTickets / capacity) * 100 : 0;
    const percentageCheckedIn = totalTickets > 0 ? (checkedInTicketsCount / totalTickets) * 100 : 0;

    const stats = {
      totalBooked: totalTickets,
      checkedIn: checkedInTicketsCount,
      remaining: remaining > 0 ? remaining : 0,
      percentageFilled,
      percentageCheckedIn
    };

    // Disable caching for real-time updates
    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
