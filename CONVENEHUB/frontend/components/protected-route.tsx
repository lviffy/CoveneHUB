'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/convene/client';
import { Spinner } from '@/components/ui/spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('user' | 'movie_team' | 'admin_team')[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo = '/' 
}: ProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          router.push('/login');
          return;
        }

        // If no specific roles required, just check if logged in
        if (!allowedRoles || allowedRoles.length === 0) {
          setIsAuthorized(true);
          setIsLoading(false);
          return;
        }

        // Get role from profiles table (source of truth)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        // SECURITY: Only use role from profiles table, never from user_metadata
        // If profile doesn't exist, redirect to complete-profile
        if (profileError || !profile) {
          router.push('/complete-profile');
          return;
        }
        
        const profileData = profile as { role: string };
        const userRole = profileData.role || 'user';
        
        if (allowedRoles.includes(userRole as any)) {
          setIsAuthorized(true);
        } else {
          router.push(redirectTo);
        }
      } catch (error) {
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, supabase, allowedRoles, redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8 text-[#195ADC]" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
