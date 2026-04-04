import { NextResponse } from 'next/server';
import { createClient } from '@/lib/convene/server';
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

    const { data, error } = await supabase.auth.verifyOtp({
      email,
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

    if (!data?.session?.user) {
      logger.error('No session user after OTP verification');
      return NextResponse.json(
        { error: 'Verification failed' },
        { status: 401 }
      );
    }

    logger.info('OTP verified successfully', { userId: data.session.user.id, type });

    return NextResponse.json({
      success: true,
      user: data.session.user,
      role: data.session.user.role,
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
