import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { CompleteProfileForm } from "./complete-profile-form";
export default function CompleteProfilePage() {
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
    /*#__PURE__*/ React.createElement(CompleteProfileForm, null),
  );
}
