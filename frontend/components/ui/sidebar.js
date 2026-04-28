"use client";

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
import { cn } from "@/lib/utils";
import Link from "next/link";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
const SidebarContext = /*#__PURE__*/ createContext(undefined);
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};
export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;
  return /*#__PURE__*/ React.createElement(
    SidebarContext.Provider,
    {
      value: {
        open,
        setOpen,
        animate,
      },
    },
    children,
  );
};
export const Sidebar = ({ children, open, setOpen, animate }) => {
  return /*#__PURE__*/ React.createElement(
    SidebarProvider,
    {
      open: open,
      setOpen: setOpen,
      animate: animate,
    },
    children,
  );
};
export const SidebarBody = (props) => {
  return /*#__PURE__*/ React.createElement(
    React.Fragment,
    null,
    /*#__PURE__*/ React.createElement(DesktopSidebar, props),
    /*#__PURE__*/ React.createElement(MobileSidebar, props),
  );
};
export const DesktopSidebar = ({ className, children, ...props }) => {
  const { open, setOpen, animate } = useSidebar();
  return /*#__PURE__*/ React.createElement(
    motion.div,
    _extends(
      {
        className: cn(
          "h-screen px-4 py-6 hidden md:flex md:flex-col bg-white dark:bg-neutral-800 w-[300px] flex-shrink-0 border-r border-neutral-200 dark:border-neutral-700 sticky top-0 z-40",
          className,
        ),
        style: {
          backgroundColor: "rgb(255, 255, 255)",
        },
        animate: {
          width: animate ? (open ? "300px" : "70px") : "300px",
        },
        transition: {
          duration: 0.2,
          ease: "easeInOut",
        },
        onMouseEnter: () => setOpen(true),
        onMouseLeave: () => setOpen(false),
      },
      props,
    ),
    children,
  );
};
export const MobileSidebar = ({ className, children, ...props }) => {
  const { open, setOpen } = useSidebar();
  return /*#__PURE__*/ React.createElement(
    React.Fragment,
    null,
    /*#__PURE__*/ React.createElement(
      "div",
      _extends(
        {
          className: cn(
            "h-14 px-4 py-3 flex flex-row md:hidden items-center justify-between bg-white dark:bg-neutral-800 w-full border-b border-neutral-200 dark:border-neutral-700 z-40 sticky top-0",
          ),
          style: {
            backgroundColor: "rgb(255, 255, 255)",
          },
        },
        props,
      ),
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "flex justify-end z-20 w-full",
        },
        /*#__PURE__*/ React.createElement(Menu, {
          className:
            "text-neutral-800 dark:text-neutral-200 cursor-pointer h-6 w-6",
          onClick: () => setOpen(!open),
        }),
      ),
      /*#__PURE__*/ React.createElement(
        AnimatePresence,
        null,
        open &&
          /*#__PURE__*/ React.createElement(
            motion.div,
            {
              initial: {
                x: "-100%",
                opacity: 0,
              },
              animate: {
                x: 0,
                opacity: 1,
              },
              exit: {
                x: "-100%",
                opacity: 0,
              },
              transition: {
                duration: 0.3,
                ease: "easeInOut",
              },
              className: cn(
                "fixed h-full w-full inset-0 bg-white dark:bg-neutral-900 p-6 sm:p-10 z-[100] flex flex-col justify-between overflow-y-auto",
                className,
              ),
              style: {
                backgroundColor: "rgb(255, 255, 255)",
              },
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "absolute right-6 sm:right-10 top-6 sm:top-10 z-50 text-neutral-800 dark:text-neutral-200 cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors",
                onClick: () => setOpen(!open),
              },
              /*#__PURE__*/ React.createElement(X, {
                className: "h-6 w-6",
              }),
            ),
            children,
          ),
      ),
    ),
  );
};
export const SidebarLink = ({ link, className, ...props }) => {
  const { open, animate } = useSidebar();
  return /*#__PURE__*/ React.createElement(
    Link,
    _extends(
      {
        href: link.href,
        className: cn(
          "flex items-center justify-start gap-2 group/sidebar py-2",
          className,
        ),
      },
      props,
    ),
    link.icon,
    /*#__PURE__*/ React.createElement(
      motion.span,
      {
        animate: {
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        },
        transition: {
          duration: 0.2,
          ease: "easeInOut",
        },
        className:
          "text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0",
      },
      link.label,
    ),
  );
};
