import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { getPhoneVariants } from '@/lib/validation/phone';
import { validateName } from '@/lib/validation/name';

export async function POST(request) {
  try {
    const { email, password, full_name, phone, city, role } = await request.json();

    if (!email || !password || !full_name || !city || !phone) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Validate full name
    const { isValid: isNameValid, error: nameError } = validateName(full_name);
    if (!isNameValid) {
      return NextResponse.json({ error: nameError }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Get the origin from headers for email redirect
    const headersList = await headers();
    const forwardedHost = headersList.get('x-forwarded-host');
    const originHeader = headersList.get('origin');
    
    let origin;
    if (originHeader) {
      origin = originHeader;
    } else if (forwardedHost) {
      // Check if we're on HTTPS (production) or HTTP (local)
      const protocol = headersList.get('x-forwarded-proto') || 'https';
      origin = `${protocol}://${forwardedHost}`;
    } else {
      origin = 'http://localhost:3000';
    }

    const supabase = await createClient();
    
    // Check if user already exists using admin API
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // First check profiles table (faster query)
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    
    if (existingProfile) {
      return NextResponse.json({ 
        error: 'An account with this email already exists. Please sign in instead.' 
      }, { status: 400 });
    }

    // Check if phone number already exists (normalised to catch all format variants)
    const phoneVariants = getPhoneVariants(phone);
    const phoneOrFilter = phoneVariants.map(v => `phone.eq.${v}`).join(',');
    const { data: existingPhone } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .or(phoneOrFilter)
      .maybeSingle();

    if (existingPhone) {
      return NextResponse.json({
        error: 'An account with this phone number already exists. Please sign in instead.'
      }, { status: 400 });
    }
    
    // Also check auth.users for users who haven't completed profile creation
    // Use RPC to check auth schema (requires the check_email_exists function to be created)
    let emailExistsInAuth = false;
    let emailConfirmed = false;
    
    const { data: authCheck, error: authCheckError } = await supabaseAdmin
      .rpc('check_email_exists', { email_to_check: email.toLowerCase() })
      .maybeSingle();
    
    if (authCheckError) {
      // RPC might not exist, use admin API fallback
      console.log('Email check RPC not available, using admin API fallback');
      try {
        // Use admin API to get user by email
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(email.toLowerCase());
        
        if (!userError && userData?.user) {
          emailExistsInAuth = true;
          emailConfirmed = !!userData.user.email_confirmed_at;
        }
      } catch (adminError) {
        console.log('Admin getUserByEmail not available:', adminError.message);
        // Will rely on signUp error handling as last fallback
      }
    } else if (authCheck?.email_exists) {
      emailExistsInAuth = true;
      emailConfirmed = authCheck.is_confirmed;
    }
    
    if (emailExistsInAuth) {
      if (emailConfirmed) {
        return NextResponse.json({ 
          error: 'An account with this email already exists. Please sign in instead.' 
        }, { status: 400 });
      } else {
        return NextResponse.json({ 
          error: 'An account with this email is pending verification. Please check your email or try signing in to resend the verification code.' 
        }, { status: 400 });
      }
    }
    
    // Validate role - only allow 'user' or 'movie_team' from signup
    // 'eon_team' should only be assigned by admins
    const validRole = ['user', 'movie_team'].includes(role) ? role : 'user';
    
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        // This 'data' is passed to your SQL trigger
        data: {
          full_name: full_name,
          phone: phone || '',
          city: city,
          role: validRole
        },
        // Configure email redirect URL for confirmation (fallback)
        emailRedirectTo: `${origin}/auth/confirm`,
      }
    });

    if (error) {
      // Handle specific error cases
      if (error.message.includes('already registered')) {
        return NextResponse.json({ error: 'This email is already registered. Please sign in instead.' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Send OTP for email verification
    if (data.user) {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false, // User already created above
        }
      });

      if (otpError) {
        console.error('Failed to send OTP:', otpError);
        // Don't fail the signup, just log the error
        // User can request a new OTP later
      }
    }

    return NextResponse.json({ 
      success: true,
      user: data.user, 
      message: 'Signup successful! Please check your email for the verification code.',
      requiresVerification: true,
    }, { status: 201 });

  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}