import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'User ID and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['user', 'movie_team', 'eon_team'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // CRITICAL: Check if current user is admin using DATABASE (source of truth)
    // NOT user_metadata which can be tampered with
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin role from profiles table
    const { data: currentProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single() as { data: { role: string } | null; error: any };

    if (profileCheckError || !currentProfile || currentProfile.role !== 'eon_team') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Update the profiles table using rpc to avoid TypeScript issues
    const { error: profileError } = await supabase.rpc('update_user_role', {
      target_user_id: userId,
      new_role: role
    } as any);

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Role updated successfully' 
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update role' },
      { status: 500 }
    );
  }
}
