"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { Menu, X, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import React from "react";
import { useScroll, motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
const menuItems = [
  {
    name: "Events",
    href: "/events",
    description: "Upcoming events",
  },
  {
    name: "Services",
    href: "/#services",
    description: "What we offer",
  },
  {
    name: "Pricing",
    href: "/#pricing",
    description: "Simple, transparent pricing",
  },
  {
    name: "About Us",
    href: "/about",
    description: "Learn about our team",
  },
  {
    name: "Careers",
    href: "/careers",
    description: "Join our team",
  },
];

// All trackable sections on the page
const allSections = [
  "features",
  "services",
  "projects",
  "testimonials",
  "pricing",
  "faq",
];
export const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [hoveredItem, setHoveredItem] = React.useState(null);
  const [activeSection, setActiveSection] = React.useState("");
  const { scrollYProgress } = useScroll();
  React.useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      setScrolled(latest > 0.05);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  // Intersection Observer for active section detection
  React.useEffect(() => {
    const sectionElements = allSections
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (sectionElements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        // Sort entries by intersection ratio to get the most visible section
        const sortedEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (sortedEntries.length > 0) {
          setActiveSection(sortedEntries[0].target.id);
        } else {
          // If no sections are intersecting, clear active section
          setActiveSection("");
        }
      },
      {
        threshold: [0.1, 0.3, 0.5],
        // Multiple thresholds for better detection
        rootMargin: "-80px 0px -40% 0px", // Offset to account for navbar height
      },
    );
    sectionElements.forEach((section) => {
      if (section) observer.observe(section);
    });
    return () => {
      sectionElements.forEach((section) => {
        if (section) observer.unobserve(section);
      });
    };
  }, []); // Helper function to check if section is active
  const isActiveSection = (href) => {
    const sectionId = href.replace("#", "");
    return activeSection === sectionId;
  };

  // Helper function to check if any section is currently active (for hover management)
  const isAnySectionActive = () => {
    return activeSection !== "" && allSections.includes(activeSection);
  };
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuState) {
        const target = event.target;
        if (!target.closest("[data-mobile-menu]")) {
          setMenuState(false);
        }
      }
    };
    if (menuState) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [menuState]);

  // Lock body scroll when mobile menu is open
  React.useEffect(() => {
    if (menuState) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [menuState]);
  return /*#__PURE__*/ React.createElement(
    "header",
    {
      className: "relative z-[999]",
    },
    /*#__PURE__*/ React.createElement(
      motion.nav,
      {
        initial: {
          y: -100,
        },
        animate: {
          y: 0,
        },
        transition: {
          duration: 0.8,
          ease: [0.22, 1, 0.36, 1],
        },
        className: "fixed top-0 w-full transform-gpu",
      },
      "                ",
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: cn(
            "transition-all duration-500 ease-out mx-auto px-4 xs:px-5 sm:px-6",
            "mt-2 mb-1 sm:mt-2 sm:mb-0",
            scrolled ? "max-w-6xl" : "max-w-7xl",
          ),
        },
        "                ",
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: cn(
              "relative overflow-hidden transition-all duration-700 ease-out transform-gpu",
              "border rounded-xl",
              scrolled
                ? "bg-white border-gray-200"
                : "bg-white border-gray-200",
            ),
          },
          "                          ",
          /*#__PURE__*/ React.createElement("div", {
            className:
              "absolute inset-0 bg-gradient-to-br from-gray-100/30 via-white/20 to-blue-100/20 opacity-50 hover:opacity-80 transition-all duration-1000",
          }),
          /*#__PURE__*/ React.createElement("div", {
            className: cn(
              "absolute inset-0 transition-all duration-700",
              "bg-gradient-to-r from-blue-200/10 via-transparent to-purple-200/10",
              scrolled ? "opacity-40" : "opacity-20",
            ),
          }),
          /*#__PURE__*/ React.createElement("div", {
            className:
              "absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-transparent",
          }),
          "                        ",
          /*#__PURE__*/ React.createElement(
            motion.div,
            {
              className: cn(
                "relative flex items-center justify-between transition-all duration-300",
                scrolled
                  ? "px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-3"
                  : "px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-4",
              ),
            },
            /*#__PURE__*/ React.createElement(
              motion.div,
              {
                whileHover: {
                  scale: 1.05,
                },
                whileTap: {
                  scale: 0.95,
                },
                transition: {
                  duration: 0.2,
                },
              },
              /*#__PURE__*/ React.createElement(
                Link,
                {
                  href: "/",
                  "aria-label": "home",
                  className: "flex items-center space-x-2 group",
                },
                /*#__PURE__*/ React.createElement(Logo, {
                  className: "[&_img]:rounded-lg",
                  uniColor: true,
                }),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "hidden lg:block flex-1 px-6",
              },
              /*#__PURE__*/ React.createElement(
                "ul",
                {
                  className: "flex items-center gap-2",
                },
                menuItems.map((item, index) =>
                  /*#__PURE__*/ React.createElement(
                    "li",
                    {
                      key: index,
                      className: "relative",
                    },
                    "                                            ",
                    /*#__PURE__*/ React.createElement(
                      Link,
                      {
                        href: item.href,
                        onMouseEnter: () => setHoveredItem(index),
                        onMouseLeave: () => setHoveredItem(null),
                        className: cn(
                          "relative flex items-center px-3 py-2 text-sm font-medium",
                          "transition-all duration-300 group overflow-hidden",
                          isActiveSection(item.href)
                            ? "text-blue-600"
                            : "text-gray-700 hover:text-blue-600",
                        ),
                      },
                      /*#__PURE__*/ React.createElement(
                        "span",
                        {
                          className: "relative z-10 flex items-center gap-2",
                        },
                        item.name,
                      ),
                      /*#__PURE__*/ React.createElement(motion.div, {
                        className:
                          "absolute inset-0 bg-gradient-to-r from-blue-100/80 via-blue-50 to-blue-100/80 border border-blue-300 rounded-lg",
                        initial: {
                          opacity: 0,
                          scale: 0.8,
                        },
                        animate: {
                          opacity: isActiveSection(item.href) ? 1 : 0,
                          scale: isActiveSection(item.href) ? 1 : 0.8,
                        },
                        transition: {
                          duration: 0.3,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      }),
                      /*#__PURE__*/ React.createElement(motion.div, {
                        className:
                          "absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent",
                        initial: {
                          x: "-100%",
                          opacity: 0,
                        },
                        animate: {
                          x:
                            (hoveredItem === index &&
                              !isActiveSection(item.href)) ||
                            isActiveSection(item.href)
                              ? "100%"
                              : "-100%",
                          opacity:
                            (hoveredItem === index &&
                              !isActiveSection(item.href)) ||
                            isActiveSection(item.href)
                              ? 1
                              : 0,
                        },
                        transition: {
                          duration: 0.6,
                          ease: "easeInOut",
                          repeat: isActiveSection(item.href) ? Infinity : 0,
                          repeatType: "loop",
                          repeatDelay: isActiveSection(item.href) ? 2 : 0,
                        },
                      }),
                    ),
                  ),
                ),
              ),
            ),
            "                            ",
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "hidden lg:flex items-center gap-3",
              },
              /*#__PURE__*/ React.createElement(
                ButtonGroup,
                null,
                /*#__PURE__*/ React.createElement(
                  motion.div,
                  {
                    whileTap: {
                      scale: 0.97,
                    },
                  },
                  /*#__PURE__*/ React.createElement(
                    Link,
                    {
                      href: "/early-access",
                    },
                    /*#__PURE__*/ React.createElement(
                      Button,
                      {
                        size: "sm",
                        variant: "outline",
                        className: cn(
                          "text-gray-700 border-gray-300 hover:bg-gray-50",
                          "font-medium px-3 sm:px-4 h-8 sm:h-9 text-xs",
                          "group transition-all duration-300 flex items-center gap-2",
                          "border-r-0 rounded-l-lg rounded-r-none",
                        ),
                      },
                      /*#__PURE__*/ React.createElement(Sparkles, {
                        className: "w-4 h-4",
                      }),
                      "early access",
                    ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  motion.div,
                  {
                    whileTap: {
                      scale: 0.97,
                    },
                  },
                  /*#__PURE__*/ React.createElement(
                    Button,
                    {
                      size: "sm",
                      className: cn(
                        "bg-blue-600 text-white hover:bg-blue-700",
                        "font-semibold px-3 sm:px-4 h-8 sm:h-9 text-xs",
                        "group transition-all duration-300 border border-blue-500",
                        "hover:border-blue-600 rounded-r-lg rounded-l-none",
                      ),
                    },
                    "contact us",
                  ),
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              motion.button,
              {
                "data-mobile-menu": true,
                onClick: () => setMenuState(!menuState),
                "aria-label": menuState ? "Close Menu" : "Open Menu",
                whileTap: {
                  scale: 0.95,
                },
                className: cn(
                  "relative p-2 lg:hidden",
                  "border border-gray-300 bg-white backdrop-blur-sm",
                  "hover:bg-gray-50 hover:border-gray-400 transition-all duration-300",
                  "shadow-sm hover:shadow-md",
                ),
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "relative w-4 h-4",
                },
                /*#__PURE__*/ React.createElement(
                  motion.div,
                  {
                    animate: {
                      rotate: menuState ? 180 : 0,
                      opacity: menuState ? 0 : 1,
                      scale: menuState ? 0.8 : 1,
                    },
                    transition: {
                      duration: 0.3,
                      ease: [0.22, 1, 0.36, 1],
                    },
                    className: "absolute inset-0",
                  },
                  /*#__PURE__*/ React.createElement(Menu, {
                    className: "w-4 h-4 text-gray-900",
                  }),
                ),
                /*#__PURE__*/ React.createElement(
                  motion.div,
                  {
                    animate: {
                      rotate: menuState ? 0 : -180,
                      opacity: menuState ? 1 : 0,
                      scale: menuState ? 1 : 0.8,
                    },
                    transition: {
                      duration: 0.3,
                      ease: [0.22, 1, 0.36, 1],
                    },
                    className: "absolute inset-0",
                  },
                  /*#__PURE__*/ React.createElement(X, {
                    className: "w-4 h-4 text-gray-900",
                  }),
                ),
              ),
            ),
          ),
        ),
      ),
      /*#__PURE__*/ React.createElement(
        AnimatePresence,
        null,
        menuState &&
          /*#__PURE__*/ React.createElement(
            React.Fragment,
            null,
            "                            ",
            /*#__PURE__*/ React.createElement(motion.div, {
              initial: {
                opacity: 0,
              },
              animate: {
                opacity: 1,
              },
              exit: {
                opacity: 0,
              },
              transition: {
                duration: 0.2,
              },
              className:
                "fixed inset-0 bg-gray-900/20 backdrop-blur-sm lg:hidden",
              onClick: () => setMenuState(false),
            }),
            /*#__PURE__*/ React.createElement(
              motion.div,
              {
                "data-mobile-menu": true,
                initial: {
                  opacity: 0,
                  y: -20,
                  scale: 0.95,
                },
                animate: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                },
                exit: {
                  opacity: 0,
                  y: -20,
                  scale: 0.95,
                },
                transition: {
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                },
                className: cn(
                  "absolute top-full left-4 right-4 mt-3 lg:hidden",
                  "bg-white/95 backdrop-blur-md border border-gray-200",
                  "overflow-hidden",
                ),
              },
              /*#__PURE__*/ React.createElement("div", {
                className:
                  "absolute inset-0 bg-gradient-to-br from-gray-50/50 via-transparent to-blue-50/30",
              }),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "relative p-4 space-y-1",
                },
                menuItems.map((item, index) =>
                  /*#__PURE__*/ React.createElement(
                    motion.div,
                    {
                      key: index,
                      initial: {
                        opacity: 0,
                        x: -30,
                      },
                      animate: {
                        opacity: 1,
                        x: 0,
                      },
                      transition: {
                        duration: 0.4,
                        delay: index * 0.1,
                        ease: [0.22, 1, 0.36, 1],
                      },
                    },
                    "                                            ",
                    /*#__PURE__*/ React.createElement(
                      Link,
                      {
                        href: item.href,
                        onClick: () => setMenuState(false),
                        className: cn(
                          "flex items-center justify-between w-full p-3",
                          "transition-all duration-300 group border",
                          "hover:bg-gray-50 hover:border-gray-200 hover:shadow-md backdrop-blur-sm",
                          isActiveSection(item.href)
                            ? "text-gray-900 bg-blue-50 border-blue-200"
                            : "text-gray-900 hover:text-gray-900 border-transparent",
                        ),
                      },
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "flex items-center gap-3",
                        },
                        /*#__PURE__*/ React.createElement(
                          "div",
                          null,
                          /*#__PURE__*/ React.createElement(
                            "div",
                            {
                              className: "font-semibold text-sm",
                            },
                            item.name,
                          ),
                          /*#__PURE__*/ React.createElement(
                            "div",
                            {
                              className: "text-xs text-gray-600 mt-0.5",
                            },
                            item.description,
                          ),
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(ChevronRight, {
                        className: cn(
                          "w-4 h-4 group-hover:translate-x-1 transition-all duration-300",
                          isActiveSection(item.href)
                            ? "text-blue-600"
                            : "text-gray-400 group-hover:text-gray-600",
                        ),
                      }),
                    ),
                  ),
                ),
              ),
              "                                ",
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "border-t border-gray-200 p-4 bg-gray-50/50",
                },
                /*#__PURE__*/ React.createElement(
                  ButtonGroup,
                  {
                    orientation: "vertical",
                    className: "w-full flex-col gap-0",
                  },
                  /*#__PURE__*/ React.createElement(
                    motion.div,
                    {
                      whileTap: {
                        scale: 0.97,
                      },
                      className: "w-full",
                    },
                    /*#__PURE__*/ React.createElement(
                      Link,
                      {
                        href: "/early-access",
                        className: "w-full block",
                      },
                      /*#__PURE__*/ React.createElement(
                        Button,
                        {
                          variant: "outline",
                          className: cn(
                            "w-full justify-center text-gray-700 border-gray-300 hover:bg-gray-50",
                            "font-medium h-10 border text-sm",
                            "transition-all duration-300 flex items-center gap-2",
                            "rounded-t-lg rounded-b-none border-b-0",
                          ),
                          onClick: () => setMenuState(false),
                        },
                        /*#__PURE__*/ React.createElement(Sparkles, {
                          className: "w-4 h-4",
                        }),
                        "early access",
                      ),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    motion.div,
                    {
                      whileTap: {
                        scale: 0.97,
                      },
                      className: "w-full",
                    },
                    /*#__PURE__*/ React.createElement(
                      Button,
                      {
                        className: cn(
                          "w-full justify-center bg-blue-600 text-white",
                          "hover:bg-blue-700",
                          "font-semibold h-10 group border border-blue-500 text-sm",
                          "transition-all duration-300 hover:border-blue-600",
                          "rounded-b-lg rounded-t-none",
                        ),
                        onClick: () => setMenuState(false),
                      },
                      "contact us",
                    ),
                  ),
                ),
              ),
            ),
          ),
      ),
    ),
  );
};
