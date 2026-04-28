import { createServerClient } from "@/lib/convene/server";
import { redirect } from "next/navigation";
import { AdminDashboardLazy } from "@/components/lazy-components";
export default async function AdminPage() {
  const supabase = await createServerClient();

  // Check if user is authenticated
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) {
    redirect("/login");
  }

  // Get user profile from database (source of truth for role)
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();
  const userRole = profile ? profile.role || "user" : "user";

  // Check if user is part of CONVENEHUB team
  if (userRole !== "admin_team") {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className:
          "min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "text-center p-8 bg-white rounded-lg shadow-xl max-w-md",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "text-6xl mb-4",
          },
          "\uD83D\uDEAB",
        ),
        /*#__PURE__*/ React.createElement(
          "h1",
          {
            className: "text-3xl font-bold text-red-600 mb-2",
          },
          "Access Denied",
        ),
        /*#__PURE__*/ React.createElement(
          "p",
          {
            className: "text-gray-600 mb-4",
          },
          "You don't have permission to access the admin panel.",
        ),
        /*#__PURE__*/ React.createElement(
          "p",
          {
            className: "text-sm text-gray-500",
          },
          "Only CONVENEHUB team members can access this page.",
        ),
      ),
    );
  }

  // Use profile from database or fallback to session data
  const userProfile = profile || {
    id: session.user.id,
    full_name: session.user.user_metadata?.full_name || "Admin User",
    city: session.user.user_metadata?.city || "Unknown",
    role: "admin_team",
    created_at: session.user.created_at,
  };

  // Get email from session
  const userEmail = session.user.email || "";
  return /*#__PURE__*/ React.createElement(AdminDashboardLazy, {
    profile: userProfile,
    userEmail: userEmail,
  });
}
