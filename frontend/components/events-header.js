"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import React from "react";
import { useScroll, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/convene/client";
export const EventsHeader = () => {
  const [scrolled, setScrolled] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const { scrollYProgress } = useScroll();
  const supabase = React.useMemo(() => createClient(), []);
  React.useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      setScrolled(latest > 0.05);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  // Check if user is logged in
  React.useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);
  return /*#__PURE__*/ React.createElement(
    "header",
    {
      className: "fixed top-0 left-0 right-0 z-[999]",
    },
    /*#__PURE__*/ React.createElement(
      motion.nav,
      {
        initial: {
          y: 0,
          opacity: 1,
        },
        animate: {
          y: 0,
          opacity: 1,
        },
        transition: {
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
        },
        className: "fixed top-0 w-full transform-gpu",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: cn(
            "transition-all duration-500 ease-out mx-auto px-4 xs:px-5 sm:px-6",
            "mt-4 mb-1 sm:mt-4 sm:mb-0",
            scrolled ? "max-w-6xl" : "max-w-7xl",
          ),
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: cn(
              "relative overflow-hidden transition-all duration-700 ease-out",
              "border rounded-xl",
              scrolled
                ? "bg-white border-gray-200"
                : "bg-white border-gray-200",
            ),
          },
          /*#__PURE__*/ React.createElement("div", {
            className:
              "absolute inset-0 bg-gradient-to-br from-gray-100/30 via-white/20 to-blue-100/20 opacity-50 hover:opacity-80 transition-all duration-1000",
          }),
          /*#__PURE__*/ React.createElement("div", {
            className: cn(
              "absolute inset-0 transition-all duration-700",
              "bg-gradient-to-r from-blue-200/10 via-transparent to-purple-200/10",
              scrolled ? "opacity-40" : "opacity-20",
            ),
          }),
          /*#__PURE__*/ React.createElement("div", {
            className:
              "absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-transparent",
          }),
          /*#__PURE__*/ React.createElement(
            motion.div,
            {
              className: cn(
                "relative flex items-center justify-between transition-all duration-300",
                scrolled
                  ? "px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-3"
                  : "px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-4",
              ),
            },
            /*#__PURE__*/ React.createElement(
              motion.div,
              {
                whileHover: {
                  scale: 1.05,
                },
                whileTap: {
                  scale: 0.95,
                },
                transition: {
                  duration: 0.2,
                },
              },
              /*#__PURE__*/ React.createElement(
                Link,
                {
                  href: "/",
                  "aria-label": "home",
                  className: "flex items-center space-x-2 group",
                },
                /*#__PURE__*/ React.createElement(Logo, {
                  className: "[&_img]:rounded-lg",
                  uniColor: true,
                }),
              ),
            ),
            /*#__PURE__*/ React.createElement("div", {
              className: "flex-1",
            }),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center gap-3",
              },
              user
                ? /*#__PURE__*/
                  // Show user profile dropdown if logged in
                  React.createElement(UserProfileDropdown, null)
                : /*#__PURE__*/
                  // Show login button if not logged in
                  React.createElement(
                    Link,
                    {
                      href: "/login",
                    },
                    /*#__PURE__*/ React.createElement(
                      Button,
                      {
                        size: "sm",
                        className: cn(
                          "bg-blue-600 text-white hover:bg-blue-700",
                          "font-semibold px-4 sm:px-6 h-9 text-sm",
                          "transition-all duration-300 border border-blue-500",
                          "hover:border-blue-600 rounded-lg",
                        ),
                      },
                      "Login",
                    ),
                  ),
            ),
          ),
        ),
      ),
    ),
  );
};
