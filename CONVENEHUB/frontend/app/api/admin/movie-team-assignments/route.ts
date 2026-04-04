import { NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';

// GET all movie team assignments
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

    // Get user role from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (!profile || (profile as any).role !== 'admin_team') {
      return NextResponse.json(
        { error: 'Unauthorized - ConveneHub team access required' },
        { status: 403 }
      );
    }

    // Get all assignments using SQL function
    const { data: assignments, error } = await supabase
      .rpc('get_movie_team_assignments');

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ assignments });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}

// POST - Create new assignment
export async function POST(request: Request) {
  try {
    const { userId, eventId } = await request.json();

    if (!userId || !eventId) {
      return NextResponse.json(
        { error: 'User ID and Event ID are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if current user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get user role from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (!profile || (profile as any).role !== 'admin_team') {
      return NextResponse.json(
        { error: 'Unauthorized - ConveneHub team access required' },
        { status: 403 }
      );
    }

    // Create assignment using SQL function
    const { data: assignmentId, error: assignError } = await supabase
      .rpc('assign_movie_team_to_event', {
        target_user_id: userId,
        target_event_id: eventId
      } as any);

    if (assignError) {
      return NextResponse.json(
        { error: assignError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      assignmentId,
      message: 'Movie team member assigned successfully' 
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create assignment' },
      { status: 500 }
    );
  }
}

// DELETE - Remove assignment
export async function DELETE(request: Request) {
  try {
    const { assignmentId } = await request.json();

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if current user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get user role from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();

    if (!profile || (profile as any).role !== 'admin_team') {
      return NextResponse.json(
        { error: 'Unauthorized - ConveneHub team access required' },
        { status: 403 }
      );
    }

    // Delete assignment using SQL function
    const { error: deleteError } = await supabase
      .rpc('remove_movie_team_assignment', {
        target_assignment_id: assignmentId
      } as any);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Assignment removed successfully' 
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete assignment' },
      { status: 500 }
    );
  }
}
