import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

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

    // Get event notes
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('notes')
      .eq('event_id', eventId)
      .single();

    if (eventError) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({
      notes: (event as { notes?: string })?.notes || ''
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const { notes } = await request.json();

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

    // Validate notes length (max 10000 characters)
    if (notes && notes.length > 10000) {
      return NextResponse.json({ error: 'Notes too long (max 10000 characters)' }, { status: 400 });
    }

    // Update event notes
    const { error: updateError } = await (supabase as any)
      .from('events')
      .update({ notes })
      .eq('event_id', eventId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save notes' }, { status: 500 });
    }

    // Log the activity
    // @ts-ignore - Supabase types need regeneration
    await supabase.from('audit_logs').insert({
      user_id: session.user.id,
      action: 'event_notes_updated',
      resource_type: 'event',
      resource_id: eventId,
      details: { notes_length: notes?.length || 0 }
    });

    return NextResponse.json({ success: true, notes });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
