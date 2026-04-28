"use client";

import dynamic from "next/dynamic";

// Simple loading fallback
const LoadingFallback = () =>
  /*#__PURE__*/ React.createElement(
    "div",
    {
      className: "min-h-screen flex items-center justify-center",
    },
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "text-center",
      },
      /*#__PURE__*/ React.createElement("div", {
        className:
          "h-12 w-12 border-4 border-[#195ADC] border-t-transparent rounded-full animate-spin mx-auto mb-4",
      }),
      /*#__PURE__*/ React.createElement(
        "p",
        {
          className: "text-gray-600",
        },
        "Loading dashboard...",
      ),
    ),
  );

// Lazy load heavy dashboard components
export const AdminDashboardLazy = dynamic(
  () => import("@/components/admin/admin-dashboard"),
  {
    loading: () => /*#__PURE__*/ React.createElement(LoadingFallback, null),
    ssr: false, // Disable SSR for client-heavy components
  },
);
export const OrganizerTeamDashboardLazy = dynamic(
  () => import("@/components/organizer-team/organizer-team-dashboard"),
  {
    loading: () => /*#__PURE__*/ React.createElement(LoadingFallback, null),
    ssr: false,
  },
);
