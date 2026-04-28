"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, LogIn, RefreshCw } from "lucide-react";
import { Suspense } from "react";
function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const details = searchParams.get("details");
  const errorDescription = searchParams.get("error_description");

  // Map error codes to user-friendly messages
  const errorMessages = {
    verification_failed: {
      title: "Email Verification Failed",
      description:
        details ||
        "The verification link may have expired or is invalid. Please request a new one.",
      action: "Try signing up again",
    },
    invalid_link: {
      title: "Invalid Link",
      description:
        details || "This confirmation link is invalid or has expired.",
      action: "Request new link",
    },
    invalid_callback: {
      title: "Authentication Error",
      description:
        details || "The authentication callback did not receive proper data.",
      action: "Try again",
    },
    access_denied: {
      title: "Access Denied",
      description:
        details || "You do not have permission to access this resource.",
      action: "Go to login",
    },
    auth_failed: {
      title: "Authentication Failed",
      description:
        details ||
        errorDescription ||
        "Something went wrong during authentication.",
      action: "Try again",
    },
    no_code: {
      title: "Missing Authorization",
      description: "No authorization code was received from the provider.",
      action: "Try again",
    },
  };
  const errorInfo = errorMessages[error || "unknown"] || {
    title: "Something Went Wrong",
    description:
      details ||
      errorDescription ||
      "An unexpected error occurred during authentication.",
    action: "Go back",
  };
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className:
        "min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white p-4",
    },
    /*#__PURE__*/ React.createElement(
      Card,
      {
        className: "w-full max-w-md border-red-200 shadow-lg",
      },
      /*#__PURE__*/ React.createElement(
        CardHeader,
        {
          className: "text-center space-y-4",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className:
              "mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center",
          },
          /*#__PURE__*/ React.createElement(AlertCircle, {
            className: "w-8 h-8 text-red-600",
          }),
        ),
        /*#__PURE__*/ React.createElement(
          CardTitle,
          {
            className: "text-2xl font-bold text-[#010101]",
          },
          errorInfo.title,
        ),
        /*#__PURE__*/ React.createElement(
          CardDescription,
          {
            className: "text-sm text-slate-600",
          },
          errorInfo.description,
        ),
      ),
      /*#__PURE__*/ React.createElement(
        CardContent,
        {
          className: "space-y-4",
        },
        process.env.NODE_ENV === "development" &&
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "bg-slate-100 rounded-lg p-3 text-xs font-mono break-all",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "font-semibold mb-1",
              },
              "Debug Info:",
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              null,
              "Error: ",
              error || "unknown",
            ),
            details &&
              /*#__PURE__*/ React.createElement(
                "div",
                null,
                "Details: ",
                details,
              ),
            errorDescription &&
              /*#__PURE__*/ React.createElement(
                "div",
                null,
                "Description: ",
                errorDescription,
              ),
          ),
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "space-y-2",
          },
          /*#__PURE__*/ React.createElement(
            Button,
            {
              asChild: true,
              className: "w-full h-11 bg-[#195ADC] hover:bg-[#1451C3]",
            },
            /*#__PURE__*/ React.createElement(
              Link,
              {
                href: "/login",
              },
              /*#__PURE__*/ React.createElement(LogIn, {
                className: "mr-2 h-4 w-4",
              }),
              errorInfo.action,
            ),
          ),
          /*#__PURE__*/ React.createElement(
            Button,
            {
              asChild: true,
              variant: "outline",
              className: "w-full h-11",
            },
            /*#__PURE__*/ React.createElement(
              Link,
              {
                href: "/",
              },
              /*#__PURE__*/ React.createElement(Home, {
                className: "mr-2 h-4 w-4",
              }),
              "Go to Homepage",
            ),
          ),
        ),
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "text-center pt-4 border-t",
          },
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-xs text-slate-500",
            },
            "If this problem persists, please contact support at",
            " ",
            /*#__PURE__*/ React.createElement(
              "a",
              {
                href: "mailto:technical@convenehub.in",
                className: "text-[#195ADC] hover:underline",
              },
              "technical@convenehub.in",
            ),
          ),
        ),
      ),
    ),
  );
}
export default function AuthErrorPage() {
  return /*#__PURE__*/ React.createElement(
    Suspense,
    {
      fallback: /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "min-h-screen flex items-center justify-center",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "text-center",
          },
          /*#__PURE__*/ React.createElement(RefreshCw, {
            className: "w-8 h-8 animate-spin text-slate-400 mx-auto mb-2",
          }),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-slate-600",
            },
            "Loading...",
          ),
        ),
      ),
    },
    /*#__PURE__*/ React.createElement(ErrorContent, null),
  );
}
