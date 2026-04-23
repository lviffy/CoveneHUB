import { NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';

// GET all events (for admin)
export async function GET() {
  try {
    const supabase = await createClient();

    // Check if current user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin role from profiles table (source of truth)
    const { data: currentProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single() as { data: { role: string } | null; error: any };

    if (profileCheckError || !currentProfile || currentProfile.role !== 'admin_team') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get all events
    const { data: events, error } = await supabase
      .from('events')
      .select('event_id, title, date_time, status, venue_name, city')
      .order('date_time', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ events });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
