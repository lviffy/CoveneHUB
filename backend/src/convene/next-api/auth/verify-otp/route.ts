import { NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { email, otp, type = 'email' } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: 'OTP must be a 6-digit code' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    logger.debug('Verifying OTP', { email, type });

    // Verify the OTP
    const { data, error } = await supabase.auth.verifyOtp({
      email: email,
      token: otp,
      type: type as 'email' | 'signup' | 'recovery',
    });

    if (error) {
      logger.error('OTP verification failed', error);
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    if (!data?.user?.id) {
      logger.error('No user ID after OTP verification');
      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 401 }
      );
    }

    logger.info('OTP verified successfully', { userId: data.user.id, type });

    // For signup verification, ensure profile exists and get role
    if (type === 'signup' || type === 'email') {
      const supabaseAdmin = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Wait for the database trigger to create the profile
      let retries = 0;
      const maxRetries = 3;
      let profile = null;

      while (retries < maxRetries && !profile) {
        await new Promise(resolve => setTimeout(resolve, 100 * (retries + 1)));
        
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('role, full_name, city, phone')
          .eq('id', data.user.id)
          .single();

        if (!profileError && profileData) {
          profile = profileData;
          break;
        }
        
        retries++;
      }

      if (!profile) {
        // Profile doesn't exist - create it from user_metadata
        logger.info('Creating profile after OTP verification');
        
        const userMetadata = data.user.user_metadata || {};
        const profileData = {
          id: data.user.id,
          full_name: userMetadata.full_name || data.user.email?.split('@')[0] || 'User',
          city: userMetadata.city || 'Unknown',
          role: userMetadata.role || 'user',
          email: data.user.email,
          phone: userMetadata.phone || data.user.phone || '',
        };

        const { error: createError, data: createdProfile } = await supabaseAdmin
          .from('profiles')
          .insert([profileData])
          .select()
          .single();

        if (createError) {
          logger.error('Profile creation error after OTP', createError);
        } else {
          profile = createdProfile;
        }
      }

      return NextResponse.json({
        success: true,
        user: data.user,
        role: profile?.role || 'user',
        session: data.session,
      });
    }

    // For password recovery
    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
    });
  } catch (err: any) {
    logger.error('OTP verification server error', err);
    return NextResponse.json(
      { error: 'Server error: ' + err.message },
      { status: 500 }
    );
  }
}
