import { createClient } from '@/lib/convene/server';
import { Profile } from '@/types/database.types';

/**
 * Checks if the current authenticated user has admin role
 * @returns { isAdmin: boolean, userId: string | null, profile: Profile | null }
 */
export async function checkAdminRole() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { isAdmin: false, userId: null, profile: null };
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return { isAdmin: false, userId: user.id, profile: null };
  }

  // Type cast to Profile (Supabase types need regeneration after migration)
  const typedProfile = profile as unknown as Profile;

  // Check if role is admin (admin_team)
  const isAdmin = typedProfile.role === 'admin_team';

  return { isAdmin, userId: user.id, profile: typedProfile };
}

/**
 * Checks if the current authenticated user exists
 * @returns { user: User | null, profile: Profile | null }
 */
export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { user, profile: profile as unknown as Profile | null };
}
