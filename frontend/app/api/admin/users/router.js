import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabaseClients';

// GET: Fetch all users
export async function GET(request) {
  try {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) throw error;
    
    return NextResponse.json({ users }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}

// POST: Create a new user
export async function POST(request) {
  try {
    const { email, password, full_name, city, role } = await request.json();

    if (!email || !password || !full_name || !city) {
      return NextResponse.json({ error: 'Email, password, full_name, and city are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // You can set this to 'true' to auto-confirm them
      user_metadata: {
        full_name: full_name,
        city: city
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If a role was specified (e.g., "organizer"), set it in the profiles table
    if (role && data.user) {
      const { error: roleError } = await supabaseAdmin
        .from('profiles')
        .update({ role: role })
        .eq('id', data.user.id);

      if (roleError) {
        return NextResponse.json({ error: `User created, but failed to set role: ${roleError.message}` }, { status: 500 });
      }
    }

    return NextResponse.json({ user: data.user }, { status: 201 });

  } catch (err) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}