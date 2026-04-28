import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@/lib/convene/client";
import { OrganizerTeamDashboardLazy } from "@/components/lazy-components";
import { Spinner } from "@/components/ui/spinner";
export default function OrganizerTeamPage() {
  const supabase = useMemo(() => createClient(), []);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  useEffect(() => {
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login", {
          replace: true,
        });
        return;
      }
      setEmail(session.user.email || "");
      const { data: dbProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      const finalProfile = dbProfile || {
        id: session.user.id,
        full_name:
          session.user.user_metadata?.full_name || "Event Operations User",
        city: session.user.user_metadata?.city || "Unknown",
        role: "user",
        created_at: session.user.created_at,
      };
      if (finalProfile.role !== "organizer") {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      setProfile(finalProfile);
      setLoading(false);
    };
    run();
  }, [navigate, supabase]);
  if (loading) {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "min-h-screen flex items-center justify-center",
      },
      /*#__PURE__*/ React.createElement(Spinner, {
        className: "w-8 h-8",
      }),
    );
  }
  if (accessDenied || !profile) {
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
          "You don't have permission to access the event operations panel.",
        ),
        /*#__PURE__*/ React.createElement(
          "p",
          {
            className: "text-sm text-gray-500",
          },
          "Only event operations members can access this page.",
        ),
      ),
    );
  }
  return /*#__PURE__*/ React.createElement(OrganizerTeamDashboardLazy, {
    profile: profile,
    userEmail: email,
  });
}
