import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabase = await createClient();

    // Sign out the user
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return success response
    return NextResponse.json({ 
      success: true,
      message: 'Signed out successfully' 
    }, { status: 200 });
    
  } catch (err) {
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}