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
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
const ButtonGroupContext = /*#__PURE__*/ React.createContext(undefined);
const useButtonGroup = () => {
  const context = React.useContext(ButtonGroupContext);
  if (!context) {
    throw new Error("useButtonGroup must be used within a ButtonGroup");
  }
  return context;
};
const ButtonGroup = /*#__PURE__*/ React.forwardRef(
  ({ className, orientation = "horizontal", ...props }, ref) =>
    /*#__PURE__*/ React.createElement(
      ButtonGroupContext.Provider,
      {
        value: {
          orientation,
        },
      },
      /*#__PURE__*/ React.createElement(
        "div",
        _extends(
          {
            ref: ref,
            className: cn(
              "inline-flex items-center",
              orientation === "vertical" && "flex-col",
              className,
            ),
          },
          props,
        ),
      ),
    ),
);
ButtonGroup.displayName = "ButtonGroup";
const ButtonGroupSeparator = /*#__PURE__*/ React.forwardRef(
  ({ className, orientation, ...props }, ref) => {
    const groupContext = React.useContext(ButtonGroupContext);
    const finalOrientation =
      orientation || groupContext?.orientation || "vertical";
    return /*#__PURE__*/ React.createElement(
      "div",
      _extends(
        {
          ref: ref,
          className: cn(
            "bg-border",
            finalOrientation === "vertical" ? "h-6 w-px" : "h-px w-6",
            className,
          ),
        },
        props,
      ),
    );
  },
);
ButtonGroupSeparator.displayName = "ButtonGroupSeparator";
const ButtonGroupText = /*#__PURE__*/ React.forwardRef(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return /*#__PURE__*/ React.createElement(
      Comp,
      _extends(
        {
          ref: ref,
          className: cn(
            "flex items-center justify-center px-3 py-2 text-sm font-medium",
            className,
          ),
        },
        props,
      ),
    );
  },
);
ButtonGroupText.displayName = "ButtonGroupText";
export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText };
