"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, Home, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
export default function ProfileDropdown({
  userName,
  userCity,
  userInitial,
  onSignOut,
  onOpenProfile,
  accentColor = "#195ADC",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className: "relative z-[60]",
      ref: dropdownRef,
    },
    /*#__PURE__*/ React.createElement(
      "button",
      {
        onClick: () => setIsOpen(!isOpen),
        className:
          "flex items-center gap-3 hover:opacity-80 transition-opacity",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "hidden md:flex flex-col text-right",
        },
        /*#__PURE__*/ React.createElement(
          "p",
          {
            className: "text-sm font-medium text-gray-900",
          },
          userName,
        ),
        /*#__PURE__*/ React.createElement(
          "p",
          {
            className: "text-xs text-gray-500",
          },
          userCity,
        ),
      ),
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className:
            "h-10 w-10 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-105",
          style: {
            backgroundColor: `${accentColor}10`,
          },
        },
        /*#__PURE__*/ React.createElement(
          "span",
          {
            className: "text-sm font-semibold",
            style: {
              color: accentColor,
            },
          },
          userInitial,
        ),
      ),
    ),
    /*#__PURE__*/ React.createElement(
      AnimatePresence,
      null,
      isOpen &&
        /*#__PURE__*/ React.createElement(
          motion.div,
          {
            initial: {
              opacity: 0,
              y: -10,
              scale: 0.95,
            },
            animate: {
              opacity: 1,
              y: 0,
              scale: 1,
            },
            exit: {
              opacity: 0,
              y: -10,
              scale: 0.95,
            },
            transition: {
              duration: 0.15,
            },
            className:
              "fixed right-4 top-20 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-visible",
            style: {
              zIndex: 9999,
            },
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "p-4 border-b border-gray-100 bg-gray-50",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center gap-3",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "h-12 w-12 rounded-full flex items-center justify-center",
                  style: {
                    backgroundColor: `${accentColor}10`,
                  },
                },
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "text-base font-semibold",
                    style: {
                      color: accentColor,
                    },
                  },
                  userInitial,
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex-1 min-w-0",
                },
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "text-sm font-semibold text-gray-900 truncate",
                  },
                  userName,
                ),
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "text-xs text-gray-500",
                  },
                  userCity,
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "py-2",
            },
            /*#__PURE__*/ React.createElement(
              Link,
              {
                href: "/",
                className:
                  "flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors",
                onClick: () => setIsOpen(false),
              },
              /*#__PURE__*/ React.createElement(Home, {
                className: "h-4 w-4 text-gray-500",
              }),
              /*#__PURE__*/ React.createElement("span", null, "Home"),
            ),
            /*#__PURE__*/ React.createElement(
              "button",
              {
                className:
                  "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors",
                onClick: () => {
                  onOpenProfile();
                  setIsOpen(false);
                },
              },
              /*#__PURE__*/ React.createElement(User, {
                className: "h-4 w-4 text-gray-500",
              }),
              /*#__PURE__*/ React.createElement("span", null, "Profile"),
            ),
            /*#__PURE__*/ React.createElement("div", {
              className: "border-t border-gray-100 my-2",
            }),
            /*#__PURE__*/ React.createElement(
              "button",
              {
                className:
                  "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors",
                onClick: () => {
                  onSignOut();
                  setIsOpen(false);
                },
              },
              /*#__PURE__*/ React.createElement(LogOut, {
                className: "h-4 w-4",
              }),
              /*#__PURE__*/ React.createElement("span", null, "Sign Out"),
            ),
          ),
        ),
    ),
  );
}
