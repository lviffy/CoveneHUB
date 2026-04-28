"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/convene/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, Ticket, Megaphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProfileModal from "@/components/ui/profile-modal";
export function UserProfileDropdown() {
  const [user, setUser] = React.useState(null);
  const [profile, setProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
  const [totalEventsAttended, setTotalEventsAttended] = React.useState(0);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = React.useMemo(() => createClient(), []);
  React.useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        // Fetch profile data from profiles table
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (profileData) {
          setProfile(profileData);
        }

        // Fetch attended events count
        const { count, error } = await supabase
          .from("bookings")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("user_id", user.id)
          .eq("checked_in", true)
          .eq("booking_status", "confirmed");
        if (!error && count !== null) {
          setTotalEventsAttended(count);
        }
      }
      setLoading(false);
    };
    getUser();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // If session changes, we should probably re-fetch profile, but for now this handles sign out
      if (!session) setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      window.location.href = "/login";
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
      // Still redirect to login page even on error
      window.location.href = "/login";
    }
  };
  if (loading || !user) {
    return null;
  }

  // Use profile data if available, otherwise fallback to user metadata
  const fullName =
    profile?.full_name || user.user_metadata?.full_name || "User";
  const email = profile?.email || user.email || "";
  const phone = profile?.phone || user.user_metadata?.phone || user.phone || "";
  // Prefer authenticated session role first; profile role can be stale in mixed backend setups.
  const role = user.role || user.user_metadata?.role || profile?.role || "user";
  const city = profile?.city || user.user_metadata?.city || "Unknown";
  const canAccessReferrals =
    role === "user" || role === "promoter" || role === "admin_team";
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return /*#__PURE__*/ React.createElement(
    DropdownMenu,
    null,
    /*#__PURE__*/ React.createElement(
      DropdownMenuTrigger,
      {
        asChild: true,
      },
      /*#__PURE__*/ React.createElement(
        "button",
        {
          className:
            "relative flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        },
        /*#__PURE__*/ React.createElement(
          "span",
          {
            className:
              "hidden md:inline-block text-sm font-medium text-gray-700",
          },
          fullName.split(" ")[0],
        ),
        /*#__PURE__*/ React.createElement(
          Avatar,
          {
            className: "h-8 w-8 cursor-pointer border-2 border-gray-200",
          },
          /*#__PURE__*/ React.createElement(AvatarImage, {
            src: user.user_metadata?.avatar_url,
            alt: fullName,
          }),
          /*#__PURE__*/ React.createElement(
            AvatarFallback,
            {
              className:
                "bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-semibold",
            },
            initials,
          ),
        ),
      ),
    ),
    /*#__PURE__*/ React.createElement(
      DropdownMenuContent,
      {
        align: "end",
        className: "w-56 z-[9999]",
      },
      /*#__PURE__*/ React.createElement(
        DropdownMenuLabel,
        null,
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "flex flex-col space-y-1",
          },
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-sm font-medium leading-none",
            },
            fullName,
          ),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-xs leading-none text-muted-foreground",
            },
            email,
          ),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-xs leading-none text-blue-600 capitalize mt-1",
            },
            role === "admin_team"
              ? "ConveneHub Team"
              : role === "organizer"
                ? "Event Operations"
                : role === "promoter"
                  ? "Promoter"
                  : "User",
          ),
        ),
      ),
      /*#__PURE__*/ React.createElement(DropdownMenuSeparator, null),
      canAccessReferrals &&
        /*#__PURE__*/ React.createElement(
          DropdownMenuItem,
          {
            onClick: () => router.push("/promoter"),
          },
          /*#__PURE__*/ React.createElement(Megaphone, {
            className: "mr-2 h-4 w-4",
          }),
          /*#__PURE__*/ React.createElement("span", null, "Referrals"),
        ),
      /*#__PURE__*/ React.createElement(
        DropdownMenuItem,
        {
          onClick: () => router.push("/bookings"),
        },
        /*#__PURE__*/ React.createElement(Ticket, {
          className: "mr-2 h-4 w-4",
        }),
        /*#__PURE__*/ React.createElement("span", null, "My Bookings"),
      ),
      /*#__PURE__*/ React.createElement(
        DropdownMenuItem,
        {
          onClick: () => setIsProfileModalOpen(true),
        },
        /*#__PURE__*/ React.createElement(User, {
          className: "mr-2 h-4 w-4",
        }),
        /*#__PURE__*/ React.createElement("span", null, "Profile"),
      ),
      /*#__PURE__*/ React.createElement(DropdownMenuSeparator, null),
      /*#__PURE__*/ React.createElement(
        DropdownMenuItem,
        {
          onClick: handleSignOut,
          className: "text-red-600 focus:text-red-600",
        },
        /*#__PURE__*/ React.createElement(LogOut, {
          className: "mr-2 h-4 w-4",
        }),
        /*#__PURE__*/ React.createElement("span", null, "Sign Out"),
      ),
    ),
    /*#__PURE__*/ React.createElement(ProfileModal, {
      isOpen: isProfileModalOpen,
      onClose: () => setIsProfileModalOpen(false),
      userName: fullName,
      userCity: city,
      userEmail: email,
      userPhone: phone,
      userRole: role,
      joinedDate: new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
      totalEventsAttended: totalEventsAttended,
      onOpenReferrals: () => router.push("/promoter"),
      onProfileUpdated: (name, newCity, newPhone) => {
        // Update local state when profile is updated via modal
        setProfile((prev) => ({
          ...prev,
          full_name: name,
          city: newCity,
          phone: newPhone,
        }));
      },
    }),
  );
}
