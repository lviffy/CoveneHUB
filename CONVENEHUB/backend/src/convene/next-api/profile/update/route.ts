import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { profileUpdateSchema } from '@/lib/validation/profile';
import { getPhoneVariants } from '@/lib/validation/phone';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // ✅ FIX: Validate and sanitize input with Zod
    const validationResult = profileUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }
    
    const { full_name, city, phone } = validationResult.data;

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

    // Update the profile in the database (data already validated and sanitized by Zod)
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name,
        city,
        phone: phone || null,
        email: user.email,
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    // Also update user metadata
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        full_name,
        city,
        phone: phone || null,
      }
    });

    if (metadataError) {
      // Don't fail the request if metadata update fails
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
