import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if current user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get current user's profile to check role
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (!currentProfile || (currentProfile as any).role !== 'eon_team') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get all profiles (explicit columns for performance)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        phone,
        role,
        city,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // For each profile, get email from auth.users metadata via a query
    // Note: We can't directly query auth.users, so we'll use a SQL function
    const { data: usersWithEmails, error: queryError } = await supabase
      .rpc('get_users_with_emails');

    if (!queryError && usersWithEmails) {
      return NextResponse.json(usersWithEmails);
    }

    // Fallback: return profiles without emails
    return NextResponse.json(profiles);

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
