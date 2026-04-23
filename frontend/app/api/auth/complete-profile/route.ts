import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { completeProfileSchema } from '@/lib/validation/profile';
import { getPhoneVariants } from '@/lib/validation/phone';

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();

    // ✅ FIX: Validate and sanitize input with Zod
    const validationResult = completeProfileSchema.safeParse(body);
    
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }
    
    const { city, phone } = validationResult.data;

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (e) {
            }
          },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user?.id) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Use service role to update profile (bypasses RLS)
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if phone is already taken by another user (normalised to catch all format variants)
    if (phone) {
      const phoneVariants = getPhoneVariants(phone);
      const phoneOrFilter = phoneVariants.map(v => `phone.eq.${v}`).join(',');
      const { data: existingPhone } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .or(phoneOrFilter)
        .neq('id', user.id)
        .maybeSingle();

      if (existingPhone) {
        return NextResponse.json(
          { error: 'An account with this phone number already exists.' },
          { status: 400 }
        );
      }
    }

    // ✅ Data already validated and sanitized by Zod
    // Use upsert so this works for both new profiles (Google OAuth) and updates.
    // full_name is NOT NULL in the DB — fetch existing value or fall back to auth metadata.
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const fullName =
      existingProfile?.full_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'User';

    const { error: updateError, data: updatedProfile } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: fullName,
        phone: phone || null,
        city: city,
        email: user.email,
        // NEVER set role here — only admins can change roles
      }, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to update profile' },
        { status: 500 }
      );
    }

    if (!updatedProfile) {
      return NextResponse.json(
        { error: 'Profile not found. Please try again.' },
        { status: 404 }
      );
    }


    return NextResponse.json(
      {
        success: true,
        message: 'Profile updated successfully',
        profile: updatedProfile,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}
