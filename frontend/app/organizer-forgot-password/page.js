"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Mail, KeyRound } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { OTPInput } from "@/components/ui/otp-input";
import Link from "next/link";
import Image from "next/image";
function MovieTeamForgotPasswordContent() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [step, setStep] = useState("email");
  const [countdown, setCountdown] = useState(0);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  // Start countdown for resend
  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Send OTP for password recovery
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          type: "recovery",
          shouldCreateUser: false,
        },
      });
      if (error) {
        throw error;
      }
      setStep("otp");
      startCountdown();
      toast({
        title: "Code Sent",
        description: "Check your email for the 6-digit verification code.",
      });
    } catch (error) {
      // Handle common error messages
      let errorMessage =
        error.message || "Failed to send reset code. Please try again.";
      if (
        errorMessage.includes("Signups not allowed") ||
        errorMessage.includes("User not found")
      ) {
        errorMessage = "This email is not registered. Please sign up first.";
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }
    setIsVerifying(true);
    try {
      // Verify OTP - this will create a session
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "recovery",
      });
      if (error) {
        throw error;
      }
      if (!data?.session) {
        throw new Error("Verification failed");
      }
      toast({
        title: "Verified!",
        description: "Redirecting to password reset...",
      });

      // Redirect to reset password page with organizer context
      setTimeout(() => {
        router.push("/reset-password?from=organizer");
      }, 500);
    } catch (error) {
      toast({
        title: "Verification Failed",
        description:
          error.message || "Invalid or expired code. Please try again.",
        variant: "destructive",
      });
      setOtp("");
    } finally {
      setIsVerifying(false);
    }
  };
  const handleResendOTP = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          type: "recovery",
          shouldCreateUser: false,
        },
      });
      if (error) throw error;
      toast({
        title: "Code Sent",
        description: "A new verification code has been sent to your email.",
      });
      startCountdown();
      setOtp("");
    } catch (error) {
      let errorMessage = error.message || "Please try again later.";
      if (
        errorMessage.includes("Signups not allowed") ||
        errorMessage.includes("User not found")
      ) {
        errorMessage = "This email is not registered. Please sign up first.";
      }
      toast({
        title: "Failed to Resend",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className:
        "min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white p-4",
    },
    /*#__PURE__*/ React.createElement(
      Card,
      {
        className: "w-full max-w-md border border-purple-200 shadow-lg",
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
          /*#__PURE__*/ React.createElement(Image, {
            src: "/logo/logo.jpg",
            alt: "ConveneHub",
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
            step === "email" ? "Reset Password" : "Enter Verification Code",
          ),
          /*#__PURE__*/ React.createElement(
            CardDescription,
            {
              className: "text-sm text-slate-600",
            },
            step === "email"
              ? "Enter your email address and we'll send you a verification code."
              : `We've sent a 6-digit code to ${email}`,
          ),
        ),
      ),
      /*#__PURE__*/ React.createElement(
        CardContent,
        {
          className: "space-y-6",
        },
        step === "email"
          ? /*#__PURE__*/ React.createElement(
              "form",
              {
                onSubmit: handleSendOTP,
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
                    htmlFor: "email",
                    className: "text-sm font-medium text-[#010101]",
                  },
                  "Email Address",
                ),
                /*#__PURE__*/ React.createElement(Input, {
                  id: "email",
                  type: "email",
                  placeholder: "you@example.com",
                  value: email,
                  onChange: (e) => setEmail(e.target.value),
                  required: true,
                  disabled: isLoading,
                  className:
                    "h-11 border-2 border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200",
                }),
              ),
              /*#__PURE__*/ React.createElement(
                Button,
                {
                  type: "submit",
                  className:
                    "w-full h-10 bg-purple-600 hover:bg-purple-700 text-white font-medium mt-6",
                  disabled: isLoading,
                },
                isLoading
                  ? /*#__PURE__*/ React.createElement(
                      React.Fragment,
                      null,
                      /*#__PURE__*/ React.createElement(Spinner, {
                        className: "mr-2 h-4 w-4 text-white",
                      }),
                      "Sending...",
                    )
                  : /*#__PURE__*/ React.createElement(
                      React.Fragment,
                      null,
                      /*#__PURE__*/ React.createElement(Mail, {
                        className: "mr-2 h-4 w-4",
                      }),
                      "Send Verification Code",
                    ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "text-center pt-4",
                },
                /*#__PURE__*/ React.createElement(
                  Link,
                  {
                    href: "/organizer-login",
                    className:
                      "text-sm text-purple-600 hover:text-purple-700 font-medium inline-flex items-center gap-1",
                  },
                  /*#__PURE__*/ React.createElement(ArrowLeft, {
                    className: "w-4 h-4",
                  }),
                  "Back to Login",
                ),
              ),
            )
          : /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "space-y-6",
              },
              /*#__PURE__*/ React.createElement(OTPInput, {
                value: otp,
                onChange: setOtp,
                disabled: isVerifying,
              }),
              isVerifying &&
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "flex items-center justify-center gap-2 text-sm text-slate-600",
                  },
                  /*#__PURE__*/ React.createElement(Spinner, {
                    className: "h-4 w-4",
                  }),
                  /*#__PURE__*/ React.createElement(
                    "span",
                    null,
                    "Verifying...",
                  ),
                ),
              /*#__PURE__*/ React.createElement(
                Button,
                {
                  type: "button",
                  onClick: handleVerifyOTP,
                  className:
                    "w-full h-10 bg-purple-600 hover:bg-purple-700 text-white font-medium",
                  disabled: otp.length !== 6 || isVerifying,
                },
                isVerifying
                  ? /*#__PURE__*/ React.createElement(
                      React.Fragment,
                      null,
                      /*#__PURE__*/ React.createElement(Spinner, {
                        className: "mr-2 h-4 w-4 text-white",
                      }),
                      "Verifying...",
                    )
                  : /*#__PURE__*/ React.createElement(
                      React.Fragment,
                      null,
                      /*#__PURE__*/ React.createElement(KeyRound, {
                        className: "mr-2 h-4 w-4",
                      }),
                      "Verify & Continue",
                    ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "text-center space-y-2",
                },
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "text-sm text-slate-600",
                  },
                  "Didn't receive the code?",
                ),
                countdown > 0
                  ? /*#__PURE__*/ React.createElement(
                      "p",
                      {
                        className: "text-sm text-slate-500",
                      },
                      "Resend in ",
                      countdown,
                      "s",
                    )
                  : /*#__PURE__*/ React.createElement(
                      Button,
                      {
                        type: "button",
                        variant: "link",
                        onClick: handleResendOTP,
                        disabled: isLoading,
                        className: "text-purple-600 hover:text-purple-700",
                      },
                      isLoading
                        ? /*#__PURE__*/ React.createElement(
                            React.Fragment,
                            null,
                            /*#__PURE__*/ React.createElement(Spinner, {
                              className: "mr-2 h-3 w-3",
                            }),
                            "Sending...",
                          )
                        : "Resend Code",
                    ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "text-center pt-4 border-t border-slate-200",
                },
                /*#__PURE__*/ React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      setStep("email");
                      setOtp("");
                    },
                    className:
                      "text-sm text-purple-600 hover:text-purple-700 font-medium inline-flex items-center gap-1",
                  },
                  /*#__PURE__*/ React.createElement(ArrowLeft, {
                    className: "w-4 h-4",
                  }),
                  "Use a different email",
                ),
              ),
            ),
      ),
    ),
  );
}
export default function MovieTeamForgotPasswordPage() {
  return /*#__PURE__*/ React.createElement(
    Suspense,
    {
      fallback: /*#__PURE__*/ React.createElement(
        "div",
        {
          className:
            "min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-white",
        },
        /*#__PURE__*/ React.createElement(Spinner, {
          className: "w-8 h-8",
        }),
      ),
    },
    /*#__PURE__*/ React.createElement(MovieTeamForgotPasswordContent, null),
  );
}
