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
import React from "react";
import { cn } from "@/lib/utils";
const ShimmerButton = /*#__PURE__*/ React.forwardRef(
  (
    {
      shimmerColor = "#ffffff",
      shimmerSize = "0.05em",
      shimmerDuration = "3s",
      borderRadius = "100px",
      background = "rgba(0, 0, 0, 1)",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return /*#__PURE__*/ React.createElement(
      "button",
      _extends(
        {
          style: {
            "--spread": "90deg",
            "--shimmer-color": shimmerColor,
            "--radius": borderRadius,
            "--speed": shimmerDuration,
            "--cut": shimmerSize,
            "--bg": background,
          },
          className: cn(
            "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-white [background:var(--bg)] [border-radius:var(--radius)] dark:text-black",
            "transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
            className,
          ),
          ref: ref,
        },
        props,
      ),
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: cn(
            "-z-30 blur-[2px]",
            "absolute inset-0 overflow-visible [container-type:size]",
          ),
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className:
              "absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [border-radius:0] [mask:none]",
          },
          /*#__PURE__*/ React.createElement("div", {
            className:
              "animate-spin-around absolute -inset-full w-auto rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] [translate:0_0]",
          }),
        ),
      ),
      children,
      /*#__PURE__*/ React.createElement("div", {
        className: cn(
          "insert-0 absolute size-full",
          "rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f]",
          // transition
          "transform-gpu transition-all duration-300 ease-in-out",
          // on hover
          "group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]",
          // on click
          "group-active:shadow-[inset_0_-10px_10px_#ffffff3f]",
        ),
      }),
      /*#__PURE__*/ React.createElement("div", {
        className: cn(
          "absolute -z-20 [background:var(--bg)] [border-radius:var(--radius)] [inset:var(--cut)]",
        ),
      }),
    );
  },
);
ShimmerButton.displayName = "ShimmerButton";
export { ShimmerButton };
