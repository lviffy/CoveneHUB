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

    // Get all checked-in TICKETS (not just bookings) with user details
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        ticket_id,
        ticket_code,
        ticket_number,
        checked_in_at,
        checked_in_by,
        bookings!inner (
          booking_id,
          booking_code,
          event_id,
          booking_status,
          tickets_count,
          user_id,
          profiles:user_id (
            full_name,
            email,
            phone,
            city
          )
        )
      `)
      .eq('bookings.event_id', eventId)
      .eq('checked_in', true)
      .neq('bookings.booking_status', 'cancelled')
      .order('checked_in_at', { ascending: false });

    if (ticketsError) {
      return NextResponse.json(
        { error: 'Failed to fetch checked-in users' },
        { status: 500 }
      );
    }

    // Get checked-in-by user names
    const checkedInByIds = Array.from(new Set((tickets || []).map((t: any) => t.checked_in_by).filter(Boolean)));
    const checkedInByProfiles: Record<string, string> = {};

    if (checkedInByIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', checkedInByIds);

      (profiles || []).forEach((p: any) => {
        checkedInByProfiles[p.id] = p.full_name;
      });
    }

    // Format the response - group by booking but show individual tickets
    const checkedInUsers = (tickets || []).map((ticket: any) => ({
      ticketId: ticket.ticket_id,
      ticketCode: ticket.ticket_code,
      ticketNumber: ticket.ticket_number,
      bookingId: ticket.bookings.booking_id,
      bookingCode: ticket.bookings.booking_code,
      checkedInAt: ticket.checked_in_at,
      checkedInBy: ticket.checked_in_by ? checkedInByProfiles[ticket.checked_in_by] : 'Unknown',
      ticketsCount: ticket.bookings.tickets_count,
      user: {
        id: ticket.bookings.user_id,
        fullName: ticket.bookings.profiles?.full_name || 'Unknown',
        email: ticket.bookings.profiles?.email || '',
        phone: ticket.bookings.profiles?.phone || '',
        city: ticket.bookings.profiles?.city || ''
      }
    }));

    return NextResponse.json({ 
      checkedInUsers,
      total: checkedInUsers.length 
    }, {
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
