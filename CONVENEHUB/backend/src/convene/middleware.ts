import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Validate environment variables on server startup
// This import will throw if any required variables are missing/invalid
import '@/lib/env';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // SECURITY: Use getUser() instead of getSession() for proper JWT validation
  // getSession() only reads from storage without validating the JWT
  // getUser() validates the JWT with Supabase servers
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;

  // Public routes - no authentication required
  const publicRoutes = ['/', '/login', '/movie-team-login', '/forgot-password', '/movie-team-forgot-password', '/reset-password', '/complete-profile'];
  const isPublicRoute = publicRoutes.some(route => pathname === route) ||
    pathname.startsWith('/events') || // Events pages are public (login required only when booking)
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/');

  // If not logged in and trying to access protected route
  if (!user && !isPublicRoute) {
    const redirectUrl = req.nextUrl.clone();
    // Redirect to movie-team-login for movie-team routes, otherwise regular login
    if (pathname.startsWith('/movie-team')) {
      redirectUrl.pathname = '/movie-team-login';
    } else {
      redirectUrl.pathname = '/login';
    }
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If logged in, check role-based access
  if (user) {
    // Get user role from profiles table (source of truth)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // If profile doesn't exist, redirect to complete-profile (unless already there)
    if (profileError && profileError.code === 'PGRST116' && pathname !== '/complete-profile') {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = '/complete-profile';
      return NextResponse.redirect(redirectUrl);
    }

    // Get role from profile only - do NOT use user_metadata as fallback for security
    const userRole = profile?.role || 'user';

    // Redirect authenticated users away from login pages to their appropriate dashboard
    if (pathname === '/login') {
      const redirectUrl = req.nextUrl.clone();
      if (userRole === 'eon_team') {
        redirectUrl.pathname = '/admin';
      } else if (userRole === 'movie_team') {
        redirectUrl.pathname = '/movie-team';
      } else {
        redirectUrl.pathname = '/events';
      }
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect authenticated users away from movie-team-login to appropriate dashboard
    if (pathname === '/movie-team-login') {
      const redirectUrl = req.nextUrl.clone();
      if (userRole === 'movie_team') {
        redirectUrl.pathname = '/movie-team';
      } else if (userRole === 'eon_team') {
        redirectUrl.pathname = '/admin';
      } else {
        redirectUrl.pathname = '/events';
      }
      return NextResponse.redirect(redirectUrl);
    }

    // Admin routes - only for eon_team
    if (pathname.startsWith('/admin')) {
      if (userRole !== 'eon_team') {
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/events';
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Movie team routes (except login) - only for movie_team
    if (pathname.startsWith('/movie-team') && pathname !== '/movie-team-login') {
      if (userRole !== 'movie_team') {
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/events';
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Events routes - accessible by all authenticated users
    // (no restriction needed)
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     * - API routes (handled separately)
     * - Auth callback routes (must not be intercepted)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo|fonts|.*\\..*|api/|auth/).*)',
  ],
};
