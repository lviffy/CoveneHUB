import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { OrganizerLoginForm } from "./organizer-login-form";
export default function OrganizerLoginPage() {
  return /*#__PURE__*/ React.createElement(
    Suspense,
    {
      fallback: /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "min-h-screen flex items-center justify-center",
        },
        /*#__PURE__*/ React.createElement(Spinner, {
          className: "w-8 h-8",
        }),
      ),
    },
    /*#__PURE__*/ React.createElement(OrganizerLoginForm, null),
  );
}
