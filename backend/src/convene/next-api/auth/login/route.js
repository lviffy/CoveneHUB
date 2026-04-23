import { NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      // Only show Google-specific message when the user genuinely has a Google-only account
      if (error.message && (error.message.includes('Invalid login credentials') || error.message.includes('Email not found'))) {
        try {
          // Use admin REST API to look up the user by email — more efficient than listUsers()
          const adminRes = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
              },
            }
          );
          if (adminRes.ok) {
            const adminData = await adminRes.json();
            const matchedUser = adminData?.users?.[0];
            if (matchedUser) {
              const identityProviders = (matchedUser.identities || []).map(i => i.provider);
              const hasGoogleOnly = identityProviders.includes('google') && !identityProviders.includes('email');
              if (hasGoogleOnly) {
                return NextResponse.json({
                  error: 'It looks like you signed up with Google! Please use the "Continue with Google" button instead.',
                  code: 'OAUTH_USER'
                }, { status: 401 });
              }
            }
          }
        } catch (_adminErr) {
          // Fall through to generic error if admin lookup fails
        }
        return NextResponse.json({ error: 'Incorrect email or password. Please try again.' }, { status: 401 });
      }
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Verify we have a session
    if (!data.session) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    // Get the user's profile to include role in response
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name, city, phone')
      .eq('id', data.user.id)
      .single();

    // The session is automatically stored in cookies by the server client
    return NextResponse.json({ 
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile?.role || 'user',
        full_name: profile?.full_name,
        city: profile?.city,
        phone: profile?.phone,
      },
      // Include session info so client knows auth succeeded
      sessionValid: true,
    }, { status: 200 });

  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}