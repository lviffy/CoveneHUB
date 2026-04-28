import { Route, Routes, useParams } from "react-router-dom";
import ClientLayout from "@/app/client-layout";
import HomePage from "@/app/page";
import EventsPage from "@/app/events/page";
import LoginPage from "@/app/login/page";
import BookingsPage from "@/app/bookings/page";
import CompleteProfilePage from "@/app/complete-profile/page";
import ContactPage from "@/app/contact/page";
import ForgotPasswordPage from "@/app/forgot-password/page";
import ResetPasswordPage from "@/app/reset-password/page";
import OrganizerLoginPage from "@/app/organizer-login/page";
import OrganizerForgotPasswordPage from "@/app/organizer-forgot-password/page";
import AdminUsersPage from "@/app/admin/users/page";
import { Navigate } from "react-router-dom";
import AdminEditEventPage from "@/app/admin/events/edit/page";
import AuthCallbackPage from "@/app/auth/callback/page";
import AuthErrorPage from "@/app/auth/error/page";
import PrivacyPolicyPage from "@/app/privacy/page";
import RefundPolicyPage from "@/app/refund/page";
import TermsAndConditionsPage from "@/app/terms/page";
import NotFoundPage from "@/app/not-found";
import EventBookingPage from "@/components/events/event-booking-page";
import AdminPage from "@/src/pages/admin-page";
import OrganizerTeamPage from "@/src/pages/organizer-team-page";
import PromoterPage from "@/src/pages/promoter-page";
import { Toaster } from "@/components/ui/toaster";
function EventDetailsRoute() {
  const { id } = useParams();
  if (!id) {
    return /*#__PURE__*/ React.createElement(NotFoundPage, null);
  }
  return /*#__PURE__*/ React.createElement(EventBookingPage, {
    eventId: id,
  });
}
export default function App() {
  return /*#__PURE__*/ React.createElement(
    ClientLayout,
    null,
    /*#__PURE__*/ React.createElement(
      Routes,
      null,
      /*#__PURE__*/ React.createElement(Route, {
        path: "/",
        element: /*#__PURE__*/ React.createElement(HomePage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/events",
        element: /*#__PURE__*/ React.createElement(EventsPage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/events/:id",
        element: /*#__PURE__*/ React.createElement(EventDetailsRoute, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/login",
        element: /*#__PURE__*/ React.createElement(LoginPage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/bookings",
        element: /*#__PURE__*/ React.createElement(BookingsPage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/complete-profile",
        element: /*#__PURE__*/ React.createElement(CompleteProfilePage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/forgot-password",
        element: /*#__PURE__*/ React.createElement(ForgotPasswordPage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/reset-password",
        element: /*#__PURE__*/ React.createElement(ResetPasswordPage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/organizer-login",
        element: /*#__PURE__*/ React.createElement(OrganizerLoginPage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/organizer-forgot-password",
        element: /*#__PURE__*/ React.createElement(
          OrganizerForgotPasswordPage,
          null,
        ),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/organizer",
        element: /*#__PURE__*/ React.createElement(OrganizerTeamPage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/promoter",
        element: /*#__PURE__*/ React.createElement(PromoterPage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/movie-team-login",
        element: /*#__PURE__*/ React.createElement(OrganizerLoginPage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/movie-team-forgot-password",
        element: /*#__PURE__*/ React.createElement(
          OrganizerForgotPasswordPage,
          null,
        ),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/movie-team",
        element: /*#__PURE__*/ React.createElement(OrganizerTeamPage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/admin",
        element: /*#__PURE__*/ React.createElement(AdminPage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/admin/users",
        element: /*#__PURE__*/ React.createElement(AdminUsersPage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/admin/events/edit",
        element: /*#__PURE__*/ React.createElement(AdminEditEventPage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/admin/assignments",
        element: /*#__PURE__*/ React.createElement(Navigate, {
          to: "/admin?tab=events",
          replace: true,
        }),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/contact",
        element: /*#__PURE__*/ React.createElement(ContactPage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/privacy",
        element: /*#__PURE__*/ React.createElement(PrivacyPolicyPage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/refund",
        element: /*#__PURE__*/ React.createElement(RefundPolicyPage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/terms",
        element: /*#__PURE__*/ React.createElement(
          TermsAndConditionsPage,
          null,
        ),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/auth/callback",
        element: /*#__PURE__*/ React.createElement(AuthCallbackPage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "/auth/error",
        element: /*#__PURE__*/ React.createElement(AuthErrorPage, null),
      }),
      /*#__PURE__*/ React.createElement(Route, {
        path: "*",
        element: /*#__PURE__*/ React.createElement(NotFoundPage, null),
      }),
    ),
    /*#__PURE__*/ React.createElement(Toaster, null),
  );
}
