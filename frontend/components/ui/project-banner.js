import React from "react";
import clsx from "clsx";
import Link from "next/link";
export const ProjectBanner = ({ label, icon, callToAction, className }) => {
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className: clsx(
        "inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#C6BEF4] rounded-full px-4 py-2 shadow-sm",
        className,
      ),
    },
    icon &&
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "flex items-center gap-1.5",
        },
        icon,
      ),
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "flex items-center gap-1.5 flex-wrap",
      },
      /*#__PURE__*/ React.createElement(
        "span",
        {
          className: "text-gray-700 font-medium text-xs",
        },
        label,
      ),
      callToAction &&
        /*#__PURE__*/ React.createElement(
          React.Fragment,
          null,
          /*#__PURE__*/ React.createElement(
            "span",
            {
              className: "text-gray-400 text-xs",
            },
            "\u2022",
          ),
          callToAction.href
            ? /*#__PURE__*/ React.createElement(
                Link,
                {
                  href: callToAction.href,
                  className:
                    "text-xs font-medium text-[#195ADC] underline underline-offset-2 decoration-[#195ADC] hover:text-[#378FFA] hover:decoration-[#378FFA] transition-colors duration-200",
                },
                callToAction.label,
              )
            : /*#__PURE__*/ React.createElement(
                "button",
                {
                  onClick: callToAction.onClick,
                  className:
                    "text-xs font-medium text-[#195ADC] underline underline-offset-2 decoration-[#195ADC] hover:text-[#378FFA] hover:decoration-[#378FFA] transition-colors duration-200",
                },
                callToAction.label,
              ),
        ),
    ),
  );
};
