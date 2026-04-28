"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";
const footerLinks = {
  platform: [
    {
      name: "Events",
      href: "/events",
    },
    {
      name: "My Bookings",
      href: "/bookings",
    },
  ],
  support: [
    {
      name: "Contact Us",
      href: "/contact",
    },
    {
      name: "FAQ",
      href: "/contact",
    },
  ],
  legal: [
    {
      name: "Privacy Policy",
      href: "/privacy",
    },
    {
      name: "Terms and Conditions",
      href: "/terms",
    },
    {
      name: "Refund Policy",
      href: "/refund",
    },
  ],
};
export default function Footer() {
  return /*#__PURE__*/ React.createElement(
    "footer",
    {
      className: "relative border-t border-white/10 bg-black text-white",
    },
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className:
          "mx-auto max-w-7xl px-4 xs:px-5 sm:px-6 pr-8 xs:pr-10 sm:pr-16",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "py-8 xs:py-10 sm:py-12",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className:
              "grid grid-cols-1 lg:grid-cols-12 gap-8 xs:gap-10 lg:gap-8",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "lg:col-span-4",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "mb-2 xs:mb-3",
              },
              /*#__PURE__*/ React.createElement(
                Link,
                {
                  href: "/",
                },
                /*#__PURE__*/ React.createElement(Logo, {
                  className: "[&_span]:text-white",
                  uniColor: true,
                }),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "p",
              {
                className:
                  "text-white/75 text-base xs:text-lg leading-relaxed mb-4 xs:mb-5 sm:mb-6 max-w-md",
              },
              "Discover and book standout events with instant tickets, QR check-ins, and smooth on-ground experiences.",
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "lg:col-span-8",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "grid grid-cols-2 xs:grid-cols-3 gap-6 xs:gap-8",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                null,
                /*#__PURE__*/ React.createElement(
                  "h3",
                  {
                    className:
                      "text-white font-semibold text-xs xs:text-sm uppercase tracking-wider mb-3 xs:mb-4",
                  },
                  "Platform",
                ),
                /*#__PURE__*/ React.createElement(
                  "ul",
                  {
                    className: "space-y-2 xs:space-y-3",
                  },
                  footerLinks.platform.map((link) =>
                    /*#__PURE__*/ React.createElement(
                      "li",
                      {
                        key: link.name,
                      },
                      /*#__PURE__*/ React.createElement(
                        Link,
                        {
                          href: link.href,
                          className:
                            "text-white/75 hover:text-cyan-300 transition-colors duration-300 text-sm",
                        },
                        link.name,
                      ),
                    ),
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                null,
                /*#__PURE__*/ React.createElement(
                  "h3",
                  {
                    className:
                      "text-white font-semibold text-xs xs:text-sm uppercase tracking-wider mb-3 xs:mb-4",
                  },
                  "Support",
                ),
                /*#__PURE__*/ React.createElement(
                  "ul",
                  {
                    className: "space-y-2 xs:space-y-3",
                  },
                  footerLinks.support.map((link) =>
                    /*#__PURE__*/ React.createElement(
                      "li",
                      {
                        key: link.name,
                      },
                      /*#__PURE__*/ React.createElement(
                        Link,
                        {
                          href: link.href,
                          className:
                            "text-white/75 hover:text-cyan-300 transition-colors duration-300 text-sm",
                        },
                        link.name,
                      ),
                    ),
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "col-span-2 xs:col-span-1",
                },
                /*#__PURE__*/ React.createElement(
                  "h3",
                  {
                    className:
                      "text-white font-semibold text-xs xs:text-sm uppercase tracking-wider mb-3 xs:mb-4",
                  },
                  "Legal",
                ),
                /*#__PURE__*/ React.createElement(
                  "ul",
                  {
                    className: "space-y-2 xs:space-y-3",
                  },
                  footerLinks.legal.map((link) =>
                    /*#__PURE__*/ React.createElement(
                      "li",
                      {
                        key: link.name,
                      },
                      /*#__PURE__*/ React.createElement(
                        Link,
                        {
                          href: link.href,
                          className:
                            "text-white/75 hover:text-cyan-300 transition-colors duration-300 text-sm",
                        },
                        link.name,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      /*#__PURE__*/ React.createElement(Separator, {
        className: "bg-white/15",
      }),
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "py-4 xs:py-5 sm:py-6",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className:
              "flex flex-col sm:flex-row items-center justify-between gap-3 xs:gap-4",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "flex flex-col sm:flex-row items-center gap-3 xs:gap-4 sm:gap-6 text-xs xs:text-sm text-white/65",
            },
            /*#__PURE__*/ React.createElement(
              "p",
              {
                className: "text-center sm:text-left",
              },
              "\xA9 2026 CONVENEHUB. All rights reserved.",
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center gap-3 xs:gap-4",
              },
              /*#__PURE__*/ React.createElement(
                Link,
                {
                  href: "/privacy",
                  className: "hover:text-cyan-300 transition-colors",
                },
                "Privacy Policy",
              ),
              /*#__PURE__*/ React.createElement(
                Link,
                {
                  href: "/terms",
                  className: "hover:text-cyan-300 transition-colors",
                },
                "Terms and Conditions",
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
