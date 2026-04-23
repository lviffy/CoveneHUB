'use client';

import dynamic from 'next/dynamic';

// Simple loading fallback
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="h-12 w-12 border-4 border-[#195ADC] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Loading dashboard...</p>
    </div>
  </div>
);

// Lazy load heavy dashboard components
export const AdminDashboardLazy = dynamic(
  () => import('@/components/admin/admin-dashboard'),
  {
    loading: () => <LoadingFallback />,
    ssr: false, // Disable SSR for client-heavy components
  }
);

export const OrganizerTeamDashboardLazy = dynamic(
  () => import('@/components/organizer-team/organizer-team-dashboard'),
  {
    loading: () => <LoadingFallback />,
    ssr: false,
  }
);

