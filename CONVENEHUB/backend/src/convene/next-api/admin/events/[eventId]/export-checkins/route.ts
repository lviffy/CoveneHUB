import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createClient();
    const eventId = params.eventId;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile as any).role !== 'admin_team') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('title')
      .eq('event_id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get all checked-in bookings for this event with user details
    // Using RPC function to join with auth.users for email/phone
    const { data: checkIns, error: checkInsError } = await (supabase as any)
      .rpc('get_event_checkins_with_user_details', { p_event_id: eventId });

    if (checkInsError) {
      
      // Fallback to manual fetch if RPC function doesn't exist
      const { data: fallbackCheckIns, error: fallbackError } = await supabase
        .from('bookings')
        .select(`
          booking_id,
          booking_code,
          tickets_count,
          booked_at,
          checked_in_at,
          checked_in_by,
          user_id
        `)
        .eq('event_id', eventId)
        .eq('checked_in', true)
        .not('checked_in_at', 'is', null)
        .order('checked_in_at', { ascending: false });

      if (fallbackError) {
        return NextResponse.json({ error: 'Failed to fetch check-ins' }, { status: 500 });
      }

      // Fetch user details for each check-in manually
      const checkInsWithUserDetails = await Promise.all(
        (fallbackCheckIns || []).map(async (checkIn: any) => {
          // Get user profile for name
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', checkIn.user_id)
            .single();

          const userName = (userProfile as any)?.full_name || 'Unknown';

          // Get email from auth metadata (best effort)
          const { data: { user: authUser } } = await supabase.auth.admin.getUserById(checkIn.user_id);
          const userEmail = authUser?.email || '';
          const userPhone = authUser?.phone || authUser?.user_metadata?.phone || '';

          // Get checked-in-by user name
          const { data: checkinProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', checkIn.checked_in_by)
            .single();
          
          const checkedInByName = (checkinProfile as any)?.full_name || 'Unknown';

          return {
            booking_code: checkIn.booking_code,
            booking_id: checkIn.booking_id,
            user_name: userName,
            user_email: userEmail,
            user_phone: userPhone,
            tickets_count: checkIn.tickets_count,
            checked_in_at: new Date(checkIn.checked_in_at).toLocaleString('en-IN', { 
              dateStyle: 'medium', 
              timeStyle: 'short' 
            }),
            checked_in_by_name: checkedInByName,
            booked_at: new Date(checkIn.booked_at).toLocaleString('en-IN', { 
              dateStyle: 'medium', 
              timeStyle: 'short' 
            }),
          };
        })
      );

      // Log the export action
      try {
        await supabase.from('audit_logs').insert({
          actor_id: user.id,
          actor_role: 'admin_team',
          action: 'EXPORT_CHECKINS_CSV',
          entity: 'bookings',
          entity_id: eventId,
          metadata: {
            event_title: (event as any).title,
            checkin_count: checkInsWithUserDetails.length,
          }
        } as any);
      } catch (auditError) {
      }

      return NextResponse.json({
        success: true,
        eventTitle: (event as any).title,
        checkIns: checkInsWithUserDetails,
      });
    }

    // Format the RPC results
    const checkInsWithUserDetails = ((checkIns as any) || []).map((checkIn: any) => ({
      booking_code: checkIn.booking_code,
      booking_id: checkIn.booking_id,
      user_name: checkIn.user_name || 'Unknown',
      user_email: checkIn.user_email || '',
      user_phone: checkIn.user_phone || '',
      tickets_count: checkIn.tickets_count,
      checked_in_at: new Date(checkIn.checked_in_at).toLocaleString('en-IN', { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
      }),
      checked_in_by_name: checkIn.checked_in_by_name || 'Unknown',
      booked_at: new Date(checkIn.booked_at).toLocaleString('en-IN', { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
      }),
    }));

    // Log the export action
    try {
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        actor_role: 'admin_team',
        action: 'EXPORT_CHECKINS_CSV',
        entity: 'bookings',
        entity_id: eventId,
        metadata: {
          event_title: (event as any).title,
          checkin_count: checkInsWithUserDetails.length,
        }
      } as any);
    } catch (auditError) {
    }

    return NextResponse.json({
      success: true,
      eventTitle: (event as any).title,
      checkIns: checkInsWithUserDetails,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
