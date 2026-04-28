"use client";

import React from "react";
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }
  componentDidCatch(error, errorInfo) {
    // Only log errors in development
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }
  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "";
      const isAuthConfigError = errorMessage.includes(
        "Your project's URL and API key are required",
      );
      return (
        this.props.fallback ||
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className:
              "flex items-center justify-center min-h-screen bg-white text-gray-900",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "text-center",
            },
            /*#__PURE__*/ React.createElement(
              "h2",
              {
                className: "text-xl font-semibold mb-2",
              },
              "Something went wrong",
            ),
            /*#__PURE__*/ React.createElement(
              "p",
              {
                className: "text-gray-600",
              },
              isAuthConfigError
                ? "Missing authentication configuration. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local, then restart the dev server."
                : "Please refresh the page to try again.",
            ),
          ),
        )
      );
    }
    return this.props.children;
  }
}
export default ErrorBoundary;
