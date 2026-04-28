import React from "react";
import { cn } from "@/lib/utils";
export const Spotlight = ({ className, fill }) => {
  return /*#__PURE__*/ React.createElement(
    "svg",
    {
      className: cn(
        "animate-spotlight pointer-events-none absolute z-[1]  h-[169%] w-[138%] lg:w-[84%] opacity-0",
        className,
      ),
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 3787 2842",
      fill: "none",
    },
    /*#__PURE__*/ React.createElement(
      "g",
      {
        filter: "url(#filter)",
      },
      /*#__PURE__*/ React.createElement("ellipse", {
        cx: "1924.71",
        cy: "273.501",
        rx: "1924.71",
        ry: "273.501",
        transform:
          "matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)",
        fill: fill || "white",
        fillOpacity: "0.21",
      }),
    ),
    /*#__PURE__*/ React.createElement(
      "defs",
      null,
      /*#__PURE__*/ React.createElement(
        "filter",
        {
          id: "filter",
          x: "0.860352",
          y: "0.838989",
          width: "3785.16",
          height: "2840.26",
          filterUnits: "userSpaceOnUse",
          colorInterpolationFilters: "sRGB",
        },
        /*#__PURE__*/ React.createElement("feFlood", {
          floodOpacity: "0",
          result: "BackgroundImageFix",
        }),
        /*#__PURE__*/ React.createElement("feBlend", {
          mode: "normal",
          in: "SourceGraphic",
          in2: "BackgroundImageFix",
          result: "shape",
        }),
        /*#__PURE__*/ React.createElement("feGaussianBlur", {
          stdDeviation: "151",
          result: "effect1_foregroundBlur_1065_8",
        }),
      ),
    ),
  );
};
