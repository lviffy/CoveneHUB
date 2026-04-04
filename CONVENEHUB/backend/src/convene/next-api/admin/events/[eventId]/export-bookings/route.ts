import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    if (!profile || (profile as any).role !== 'eon_team') {
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

    // Get all bookings for this event with user details
    // Using a direct query to join with auth.users for email/phone
    const { data: bookings, error: bookingsError } = await (supabase as any)
      .rpc('get_event_bookings_with_user_details', { p_event_id: eventId });

    if (bookingsError) {
      
      // Fallback to manual fetch if RPC function doesn't exist
      const { data: fallbackBookings, error: fallbackError } = await supabase
        .from('bookings')
        .select(`
          booking_id,
          booking_code,
          tickets_count,
          total_amount,
          booking_status,
          booked_at,
          checked_in,
          checked_in_at,
          user_id,
          checked_in_by
        `)
        .eq('event_id', eventId)
        .order('booked_at', { ascending: false });

      if (fallbackError) {
        return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
      }

      // Fetch user details for each booking manually
      const bookingsWithUserDetails = await Promise.all(
        (fallbackBookings || []).map(async (booking: any) => {
          // Get user profile for name
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', booking.user_id)
            .single();

          const userName = (userProfile as any)?.full_name || 'Unknown';

          // Get email from auth metadata (best effort)
          const { data: { user: authUser } } = await supabase.auth.admin.getUserById(booking.user_id);
          const userEmail = authUser?.email || '';
          const userPhone = authUser?.phone || authUser?.user_metadata?.phone || '';

          // Get checked-in-by user name if checked in
          let checkedInByName = '';
          if (booking.checked_in && booking.checked_in_by) {
            const { data: checkinProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', booking.checked_in_by)
              .single();
            
            checkedInByName = (checkinProfile as any)?.full_name || 'Unknown';
          }

          return {
            booking_code: booking.booking_code,
            booking_id: booking.booking_id,
            user_name: userName,
            user_email: userEmail,
            user_phone: userPhone,
            tickets_count: booking.tickets_count,
            total_amount: booking.total_amount,
            booking_status: booking.booking_status,
            booked_at: new Date(booking.booked_at).toLocaleString('en-IN', { 
              dateStyle: 'medium', 
              timeStyle: 'short' 
            }),
            checked_in: booking.checked_in,
            checked_in_at: booking.checked_in_at ? new Date(booking.checked_in_at).toLocaleString('en-IN', { 
              dateStyle: 'medium', 
              timeStyle: 'short' 
            }) : '',
            checked_in_by_name: checkedInByName,
          };
        })
      );

      // Log the export action
      try {
        await supabase.from('audit_logs').insert({
          actor_id: user.id,
          actor_role: 'eon_team',
          action: 'EXPORT_BOOKINGS_CSV',
          entity: 'bookings',
          entity_id: eventId,
          metadata: {
            event_title: (event as any).title,
            booking_count: bookingsWithUserDetails.length,
          }
        } as any);
      } catch (auditError) {
      }

      return NextResponse.json({
        success: true,
        eventTitle: (event as any).title,
        bookings: bookingsWithUserDetails,
      });
    }

    // Format the RPC results
    const bookingsWithUserDetails = ((bookings as any) || []).map((booking: any) => ({
      booking_code: booking.booking_code,
      booking_id: booking.booking_id,
      user_name: booking.user_name || 'Unknown',
      user_email: booking.user_email || '',
      user_phone: booking.user_phone || '',
      tickets_count: booking.tickets_count,
      total_amount: booking.total_amount,
      booking_status: booking.booking_status,
      booked_at: new Date(booking.booked_at).toLocaleString('en-IN', { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
      }),
      checked_in: booking.checked_in,
      checked_in_at: booking.checked_in_at ? new Date(booking.checked_in_at).toLocaleString('en-IN', { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
      }) : '',
      checked_in_by_name: booking.checked_in_by_name || '',
    }));

    // Log the export action
    try {
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        actor_role: 'eon_team',
        action: 'EXPORT_BOOKINGS_CSV',
        entity: 'bookings',
        entity_id: eventId,
        metadata: {
          event_title: (event as any).title,
          booking_count: bookingsWithUserDetails.length,
        }
      } as any);
    } catch (auditError) {
    }

    return NextResponse.json({
      success: true,
      eventTitle: (event as any).title,
      bookings: bookingsWithUserDetails,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
