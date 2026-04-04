import { createServerClient } from '@/lib/convene/server';
import { redirect } from 'next/navigation';
import { MovieTeamDashboardLazy } from '@/components/lazy-components';

export default async function MovieTeamPage() {
  const supabase = await createServerClient();
  
  // Check if user is authenticated
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    redirect('/login');
  }

  // Get user profile from profiles table (source of truth)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  const userRole = (profile as any)?.role || 'user';

  // Check if user is part of movie team
  if (userRole !== 'movie_team') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-xl max-w-md">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-3xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access the event operations panel.
          </p>
          <p className="text-sm text-gray-500">
            Only event operations members can access this page.
          </p>
        </div>
      </div>
    );
  }

  // Use profile from database or fallback to session data
  const userProfile = profile || {
    id: session.user.id,
    full_name: session.user.user_metadata?.full_name || 'Event Operations Member',
    city: session.user.user_metadata?.city || 'Unknown',
    role: 'movie_team' as const,
    created_at: session.user.created_at,
  };

  // Get email from session
  const userEmail = session.user.email || '';

  return <MovieTeamDashboardLazy profile={userProfile} userEmail={userEmail} />;
}
