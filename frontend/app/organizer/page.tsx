import { createServerClient } from '@/lib/convene/server';
import { redirect } from 'next/navigation';
import { OrganizerTeamDashboardLazy } from '@/components/lazy-components';

export default async function OrganizerPage() {
  const supabase = await createServerClient();

  // Check if user is authenticated.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    redirect('/login');
  }

  // Get user profile from profiles table (source of truth).
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  const userRole = (profile as any)?.role || 'user';

  if (userRole !== 'organizer') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-xl max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-3xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You do not have permission to access the organizer panel.
          </p>
          <p className="text-sm text-gray-500">Only organizer accounts can access this page.</p>
        </div>
      </div>
    );
  }

  const userProfile = profile || {
    id: session.user.id,
    full_name: session.user.user_metadata?.full_name || 'Organizer',
    city: session.user.user_metadata?.city || 'Unknown',
    role: 'organizer' as const,
    created_at: session.user.created_at,
  };

  const userEmail = session.user.email || '';

  return <OrganizerTeamDashboardLazy profile={userProfile} userEmail={userEmail} />;
}
