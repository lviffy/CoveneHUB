import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/convene/server';

// GET events assigned to the current movie team member
export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is movie_team from profiles table (source of truth)
    const { data: currentProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single() as { data: { role: string } | null; error: any };

    if (profileCheckError || !currentProfile || currentProfile.role !== 'movie_team') {
      return NextResponse.json(
        { error: 'Forbidden - Movie team access required' },
        { status: 403 }
      );
    }

    // Get assigned events using SQL function
    const { data: events, error } = await supabase
      .rpc('get_assigned_events_for_user', {
        target_user_id: currentUser.id
      } as any);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Calculate accurate remaining slots based on tickets_count
    const eventsArray: any[] = events || [];
    const eventsWithAccurateRemaining = await Promise.all(
      eventsArray.map(async (event: any) => {
        // Sum up all tickets from confirmed bookings
        const { data: bookings } = await supabase
          .from('bookings')
          .select('tickets_count')
          .eq('event_id', event.event_id)
          .neq('booking_status', 'cancelled');

        const totalTickets = bookings?.reduce((sum: number, booking: any) => sum + (booking.tickets_count || 1), 0) ?? 0;
        const calculatedRemaining = event.capacity - totalTickets;

        return {
          ...event,
          remaining: Math.max(0, calculatedRemaining)
        };
      })
    );

    return NextResponse.json({ events: eventsWithAccurateRemaining });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch assigned events' },
      { status: 500 }
    );
  }
}
