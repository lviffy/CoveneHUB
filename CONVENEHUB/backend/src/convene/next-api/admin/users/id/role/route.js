import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseClients';

// PUT: Update a specific user's role
// This route handles requests like: PUT /api/admin/users/some-user-uuid/role
export async function PUT(request, { params }) {
  try {
    const { id } = params; // Get 'id' from the URL (e.g., .../users/[id]/...)
    const { role } = await request.json();

    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ role: role })
      .eq('id', id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}