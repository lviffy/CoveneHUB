function _extends() {
  return (
    (_extends = Object.assign
      ? Object.assign.bind()
      : function (n) {
          for (var e = 1; e < arguments.length; e++) {
            var t = arguments[e];
            for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]);
          }
          return n;
        }),
    _extends.apply(null, arguments)
  );
}
import { LoaderIcon } from "lucide-react";
import { cn } from "@/lib/utils";
function Spinner({ className, ...props }) {
  return /*#__PURE__*/ React.createElement(
    LoaderIcon,
    _extends(
      {
        role: "status",
        "aria-label": "Loading",
        className: cn("size-4 animate-spin", className),
      },
      props,
    ),
  );
}
export function SpinnerCustom() {
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className: "flex items-center gap-4",
    },
    /*#__PURE__*/ React.createElement(Spinner, null),
  );
}
export { Spinner };
