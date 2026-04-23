import { NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';

// GET /api/bookings/event/[eventId] - Get all bookings for an event (admin/organizer)
export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
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

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Check if user has permission (admin_team or organizer)
    if ((profile as any)?.role === 'user') {
      return NextResponse.json(
        { error: 'Forbidden. You do not have permission to view event bookings.' },
        { status: 403 }
      );
    }

    // For organizers, verify they own this event.
    if ((profile as any)?.role === 'organizer') {
      const { data: ownedEvent } = await supabase
        .from('events')
        .select('event_id')
        .eq('event_id', params.eventId)
        .eq('created_by', user.id)
        .single();

      if (!ownedEvent) {
        return NextResponse.json(
          { error: 'Forbidden. You can only view your own events.' },
          { status: 403 }
        );
      }
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Build query
    let query = supabase
      .from('bookings')
      .select(`
        *,
        profile:user_id (*)
      `)
      .eq('event_id', params.eventId)
      .order('booked_at', { ascending: false });

    // Apply status filter if provided
    if (status) {
      query = query.eq('booking_status', status);
    }

    const { data: bookings, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    // Get event details for context
    const { data: event } = await supabase
      .from('events')
      .select('title, capacity, remaining, date_time')
      .eq('event_id', params.eventId)
      .single();

    return NextResponse.json({
      success: true,
      event: event || null,
      bookings: bookings || [],
      stats: {
        total: bookings?.length || 0,
        confirmed: bookings?.filter((b: any) => b.booking_status === 'confirmed').length || 0,
        checked_in: bookings?.filter((b: any) => b.booking_status === 'checked_in').length || 0,
        cancelled: bookings?.filter((b: any) => b.booking_status === 'cancelled').length || 0,
      }
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
