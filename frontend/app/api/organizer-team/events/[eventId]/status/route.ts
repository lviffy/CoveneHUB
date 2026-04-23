import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/convene/server';

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

    if ((profile as any)?.role !== 'organizer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const eventId = params.eventId;
    const { status } = await request.json();

    // Verify organizer owns this event
    const { data: ownedEvent } = await supabase
      .from('events')
      .select('event_id')
      .eq('event_id', eventId)
      .eq('created_by', session.user.id)
      .single();

    if (!ownedEvent) {
      return NextResponse.json({ error: 'Forbidden. You can only manage your own events.' }, { status: 403 });
    }

    const validStatuses = ['draft', 'published', 'checkin_open', 'in_progress', 'ended'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Update event status
    const { error: updateError } = await supabase
      .from('events')
      // @ts-expect-error - Supabase generated types may not include all status values
      .update({ status })
      .eq('event_id', eventId)
      .eq('created_by', session.user.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    // Log the activity
    // @ts-expect-error - Supabase generated types don't include audit_logs table
    await supabase.from('audit_logs').insert({
      user_id: session.user.id,
      action: 'event_status_changed',
      resource_type: 'event',
      resource_id: eventId,
      details: { new_status: status }
    });

    return NextResponse.json({ success: true, status });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
