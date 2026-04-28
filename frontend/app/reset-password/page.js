"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/convene/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, CheckCircle2, Eye, EyeOff, Film } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import Image from "next/image";
import Link from "next/link";
function ResetPasswordContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);

  // Support both legacy movie-team and new organizer context flags.
  const fromParam = searchParams.get("from");
  const isOrganizerFlow =
    fromParam === "movie-team" || fromParam === "organizer";
  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      // First check for an existing session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // User should have a session from the recovery link (set by auth/callback)
      if (session) {
        setIsValidSession(true);
        return;
      }

      // If no session yet, wait a moment and try again (in case of race condition)
      await new Promise((resolve) => setTimeout(resolve, 500));
      const {
        data: { session: retrySession },
      } = await supabase.auth.getSession();
      if (retrySession) {
        setIsValidSession(true);
      } else {
        setIsValidSession(false);
      }
    };
    checkSession();

    // Listen for auth state changes (recovery link click)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setIsValidSession(true);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }
    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });
      if (error) {
        throw error;
      }
      setIsSuccess(true);
      toast({
        title: "Password Updated",
        description: "Your password has been successfully reset.",
      });

      // Redirect to appropriate login after 2 seconds
      setTimeout(() => {
        router.push(isOrganizerFlow ? "/organizer-login" : "/login");
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className: `min-h-screen flex items-center justify-center ${isOrganizerFlow ? "bg-gradient-to-br from-purple-50 to-white" : "bg-white"}`,
      },
      /*#__PURE__*/ React.createElement(Spinner, {
        className: "w-8 h-8",
      }),
    );
  }

  // Invalid or expired link
  if (isValidSession === false) {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className: `min-h-screen flex items-center justify-center p-4 ${isOrganizerFlow ? "bg-gradient-to-br from-purple-50 to-white" : "bg-white"}`,
      },
      /*#__PURE__*/ React.createElement(
        Card,
        {
          className: `w-full max-w-md ${isOrganizerFlow ? "border-purple-200 shadow-lg" : "border-slate-200 shadow-sm"}`,
        },
        /*#__PURE__*/ React.createElement(
          CardHeader,
          {
            className: "space-y-6 text-center pb-8",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "mx-auto",
            },
            isOrganizerFlow
              ? /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center",
                  },
                  /*#__PURE__*/ React.createElement(Film, {
                    className: "w-10 h-10 text-purple-600",
                  }),
                )
              : /*#__PURE__*/ React.createElement(Image, {
                  src: "/logo/logo.jpg",
                  alt: "CONVENEHUB",
                  width: 80,
                  height: 80,
                  className: "mx-auto",
                  priority: true,
                }),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "space-y-2",
            },
            /*#__PURE__*/ React.createElement(
              CardTitle,
              {
                className: "text-2xl font-bold text-[#010101]",
              },
              "Invalid or Expired Link",
            ),
            /*#__PURE__*/ React.createElement(
              CardDescription,
              {
                className: "text-sm text-slate-600",
              },
              "This password reset link is invalid or has expired. Please request a new one.",
            ),
          ),
        ),
        /*#__PURE__*/ React.createElement(
          CardContent,
          null,
          /*#__PURE__*/ React.createElement(
            Link,
            {
              href: isOrganizerFlow
                ? "/organizer-forgot-password"
                : "/forgot-password",
            },
            /*#__PURE__*/ React.createElement(
              Button,
              {
                className: `w-full ${isOrganizerFlow ? "bg-purple-600 hover:bg-purple-700" : "bg-[#195ADC] hover:bg-[#195ADC]/90"}`,
              },
              "Request New Link",
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "text-center mt-4",
            },
            /*#__PURE__*/ React.createElement(
              Link,
              {
                href: isOrganizerFlow ? "/organizer-login" : "/login",
                className: `text-sm font-medium ${isOrganizerFlow ? "text-purple-600 hover:text-purple-700" : "text-[#195ADC] hover:text-[#195ADC]/80"}`,
              },
              "Back to Login",
            ),
          ),
        ),
      ),
    );
  }
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className: `min-h-screen flex items-center justify-center p-4 ${isOrganizerFlow ? "bg-gradient-to-br from-purple-50 to-white" : "bg-white"}`,
    },
    /*#__PURE__*/ React.createElement(
      Card,
      {
        className: `w-full max-w-md ${isOrganizerFlow ? "border-purple-200 shadow-lg" : "border-slate-200 shadow-sm"}`,
      },
      /*#__PURE__*/ React.createElement(
        CardHeader,
        {
          className: "space-y-6 text-center pb-8",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "mx-auto",
          },
          isOrganizerFlow
            ? /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center",
                },
                /*#__PURE__*/ React.createElement(Film, {
                  className: "w-10 h-10 text-purple-600",
                }),
              )
            : /*#__PURE__*/ React.createElement(Image, {
                src: "/logo/logo.jpg",
                alt: "CONVENEHUB",
                width: 80,
                height: 80,
                className: "mx-auto",
                priority: true,
              }),
        ),
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "space-y-2",
          },
          /*#__PURE__*/ React.createElement(
            CardTitle,
            {
              className: "text-2xl font-bold text-[#010101]",
            },
            isSuccess ? "Password Reset!" : "Set New Password",
          ),
          /*#__PURE__*/ React.createElement(
            CardDescription,
            {
              className: "text-sm text-slate-600",
            },
            isSuccess
              ? "Your password has been successfully updated. Redirecting to login..."
              : "Enter your new password below.",
          ),
        ),
      ),
      /*#__PURE__*/ React.createElement(
        CardContent,
        {
          className: "space-y-6",
        },
        isSuccess
          ? /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "space-y-6",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex justify-center",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "w-16 h-16 bg-green-100 rounded-full flex items-center justify-center",
                  },
                  /*#__PURE__*/ React.createElement(CheckCircle2, {
                    className: "w-8 h-8 text-green-600",
                  }),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex justify-center",
                },
                /*#__PURE__*/ React.createElement(Spinner, {
                  className: "w-6 h-6",
                }),
              ),
            )
          : /*#__PURE__*/ React.createElement(
              "form",
              {
                onSubmit: handleSubmit,
                className: "space-y-4",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "space-y-2",
                },
                /*#__PURE__*/ React.createElement(
                  Label,
                  {
                    htmlFor: "password",
                    className: "text-sm font-medium text-[#010101]",
                  },
                  "New Password",
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "relative",
                  },
                  /*#__PURE__*/ React.createElement(Input, {
                    id: "password",
                    type: showPassword ? "text" : "password",
                    placeholder:
                      "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
                    value: password,
                    onChange: (e) => setPassword(e.target.value),
                    required: true,
                    disabled: isLoading,
                    className: `h-11 border-2 border-slate-200 transition-all duration-200 pr-10 ${isOrganizerFlow ? "focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" : "focus:border-[#195ADC] focus:ring-2 focus:ring-[#195ADC]/20"}`,
                  }),
                  /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: () => setShowPassword(!showPassword),
                      className:
                        "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600",
                    },
                    showPassword
                      ? /*#__PURE__*/ React.createElement(EyeOff, {
                          className: "w-4 h-4",
                        })
                      : /*#__PURE__*/ React.createElement(Eye, {
                          className: "w-4 h-4",
                        }),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "text-xs text-slate-500",
                  },
                  "Must be at least 6 characters",
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "space-y-2",
                },
                /*#__PURE__*/ React.createElement(
                  Label,
                  {
                    htmlFor: "confirmPassword",
                    className: "text-sm font-medium text-[#010101]",
                  },
                  "Confirm New Password",
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "relative",
                  },
                  /*#__PURE__*/ React.createElement(Input, {
                    id: "confirmPassword",
                    type: showConfirmPassword ? "text" : "password",
                    placeholder:
                      "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
                    value: confirmPassword,
                    onChange: (e) => setConfirmPassword(e.target.value),
                    required: true,
                    disabled: isLoading,
                    className: `h-11 border-2 border-slate-200 transition-all duration-200 pr-10 ${isOrganizerFlow ? "focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" : "focus:border-[#195ADC] focus:ring-2 focus:ring-[#195ADC]/20"}`,
                  }),
                  /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: () =>
                        setShowConfirmPassword(!showConfirmPassword),
                      className:
                        "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600",
                    },
                    showConfirmPassword
                      ? /*#__PURE__*/ React.createElement(EyeOff, {
                          className: "w-4 h-4",
                        })
                      : /*#__PURE__*/ React.createElement(Eye, {
                          className: "w-4 h-4",
                        }),
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                Button,
                {
                  type: "submit",
                  className: `w-full h-10 text-white font-medium mt-6 ${isOrganizerFlow ? "bg-purple-600 hover:bg-purple-700" : "bg-[#195ADC] hover:bg-[#195ADC]/90"}`,
                  disabled: isLoading,
                },
                isLoading
                  ? /*#__PURE__*/ React.createElement(
                      React.Fragment,
                      null,
                      /*#__PURE__*/ React.createElement(Spinner, {
                        className: "mr-2 h-4 w-4 text-white",
                      }),
                      "Updating...",
                    )
                  : /*#__PURE__*/ React.createElement(
                      React.Fragment,
                      null,
                      /*#__PURE__*/ React.createElement(KeyRound, {
                        className: "mr-2 h-4 w-4",
                      }),
                      "Reset Password",
                    ),
              ),
            ),
      ),
    ),
  );
}
export default function ResetPasswordPage() {
  return /*#__PURE__*/ React.createElement(
    Suspense,
    {
      fallback: /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "min-h-screen flex items-center justify-center bg-white",
        },
        /*#__PURE__*/ React.createElement(Spinner, {
          className: "w-8 h-8",
        }),
      ),
    },
    /*#__PURE__*/ React.createElement(ResetPasswordContent, null),
  );
}
