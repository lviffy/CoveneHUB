"use client";

import React from "react";
import { motion } from "framer-motion";
export default function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Browse",
      description: "Explore upcoming events",
    },
    {
      number: "02",
      title: "Book",
      description: "Reserve your spot",
    },
    {
      number: "03",
      title: "Receive",
      description: "Get your QR ticket",
    },
    {
      number: "04",
      title: "Experience",
      description: "Check in and enjoy the event",
    },
  ];
  return /*#__PURE__*/ React.createElement(
    "section",
    {
      className: "relative py-24 md:py-32 px-6 bg-white overflow-hidden",
    },
    /*#__PURE__*/ React.createElement(
      motion.div,
      {
        className: "relative mx-auto max-w-[1312px]",
        initial: {
          filter: "blur(10px)",
        },
        whileInView: {
          filter: "blur(0px)",
        },
        viewport: {
          once: true,
          margin: "-80px",
          amount: 0.2,
        },
        transition: {
          duration: 0.8,
          ease: [0.16, 1, 0.3, 1],
          filter: {
            duration: 0.6,
          },
        },
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "text-center mb-16 md:mb-24",
        },
        /*#__PURE__*/ React.createElement(
          motion.div,
          {
            initial: {
              opacity: 0,
              y: 20,
              scale: 0.9,
            },
            whileInView: {
              opacity: 1,
              y: 0,
              scale: 1,
            },
            viewport: {
              once: true,
              margin: "-50px",
            },
            transition: {
              duration: 0.7,
              delay: 0.3,
              ease: [0.16, 1, 0.3, 1],
            },
            className: "flex items-center justify-center gap-3 mb-6",
          },
          /*#__PURE__*/ React.createElement(motion.div, {
            initial: {
              scaleX: 0,
              opacity: 0,
            },
            whileInView: {
              scaleX: 1,
              opacity: 1,
            },
            viewport: {
              once: true,
            },
            transition: {
              duration: 0.8,
              delay: 0.5,
              ease: [0.16, 1, 0.3, 1],
            },
            className: "w-12 h-[1px] bg-gray-300 origin-right",
          }),
          /*#__PURE__*/ React.createElement(
            "span",
            {
              className:
                "text-sm font-medium text-gray-500 uppercase tracking-wide",
            },
            "How It Works",
          ),
          /*#__PURE__*/ React.createElement(motion.div, {
            initial: {
              scaleX: 0,
              opacity: 0,
            },
            whileInView: {
              scaleX: 1,
              opacity: 1,
            },
            viewport: {
              once: true,
            },
            transition: {
              duration: 0.8,
              delay: 0.5,
              ease: [0.16, 1, 0.3, 1],
            },
            className: "w-12 h-[1px] bg-gray-300 origin-left",
          }),
        ),
        /*#__PURE__*/ React.createElement(
          motion.h2,
          {
            initial: {
              opacity: 0,
              y: 30,
              scale: 0.95,
            },
            whileInView: {
              opacity: 1,
              y: 0,
              scale: 1,
            },
            viewport: {
              once: true,
              margin: "-50px",
            },
            transition: {
              duration: 0.9,
              delay: 0.45,
              ease: [0.16, 1, 0.3, 1],
              scale: {
                duration: 1,
                ease: [0.16, 1, 0.3, 1],
              },
            },
            className:
              "text-5xl md:text-6xl lg:text-7xl font-semibold text-gray-900 mb-4 tracking-tight",
          },
          "Four Simple Steps",
        ),
        /*#__PURE__*/ React.createElement(
          motion.p,
          {
            initial: {
              opacity: 0,
              y: 20,
            },
            whileInView: {
              opacity: 1,
              y: 0,
            },
            viewport: {
              once: true,
              margin: "-50px",
            },
            transition: {
              duration: 0.7,
              delay: 0.6,
              ease: [0.16, 1, 0.3, 1],
            },
            className: "text-gray-600 text-base md:text-lg max-w-2xl mx-auto",
          },
          "From discovery to check-in in just a few taps",
        ),
      ),
      /*#__PURE__*/ React.createElement(
        motion.div,
        {
          className:
            "grid grid-cols-1 md:grid-cols-4 gap-0 md:gap-0 origin-top",
        },
        steps.map((step, index) =>
          /*#__PURE__*/ React.createElement(
            motion.div,
            {
              key: index,
              initial: {
                opacity: 0,
                y: 30,
                filter: "blur(4px)",
              },
              whileInView: {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
              },
              viewport: {
                once: true,
                margin: "50px",
              },
              transition: {
                duration: 0.5,
                delay: 0.1 + index * 0.08,
                ease: [0.16, 1, 0.3, 1],
                filter: {
                  duration: 0.3,
                },
              },
              className:
                "relative border-t border-gray-200 pt-8 pb-12 md:pb-8 group hover:bg-gray-50/50 transition-colors duration-300 md:px-6",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "relative mb-6",
              },
              /*#__PURE__*/ React.createElement(
                motion.div,
                {
                  initial: {
                    opacity: 0,
                    scale: 0.8,
                  },
                  whileInView: {
                    opacity: 1,
                    scale: 1,
                  },
                  viewport: {
                    once: true,
                    margin: "50px",
                  },
                  transition: {
                    duration: 0.4,
                    delay: 0.15 + index * 0.08,
                    ease: [0.16, 1, 0.3, 1],
                  },
                  className:
                    "text-[120px] md:text-[140px] font-bold text-gray-100 leading-none select-none transition-colors duration-300 group-hover:text-gray-200",
                },
                step.number,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "relative -mt-16 md:-mt-20",
              },
              /*#__PURE__*/ React.createElement(
                "h3",
                {
                  className:
                    "text-xl md:text-2xl font-bold text-gray-900 mb-2 tracking-tight",
                },
                step.title,
              ),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className:
                    "text-sm md:text-base text-gray-600 leading-relaxed",
                },
                step.description,
              ),
            ),
            index < steps.length - 1 &&
              /*#__PURE__*/ React.createElement(
                motion.div,
                {
                  initial: {
                    opacity: 0,
                    x: -15,
                    scale: 0.5,
                  },
                  whileInView: {
                    opacity: 1,
                    x: 0,
                    scale: 1,
                  },
                  viewport: {
                    once: true,
                  },
                  transition: {
                    duration: 0.6,
                    delay: 1 + index * 0.12,
                    ease: [0.16, 1, 0.3, 1],
                    scale: {
                      duration: 0.5,
                      ease: [0.16, 1, 0.3, 1],
                    },
                  },
                  className:
                    "hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 text-gray-300 group-hover:text-gray-400 transition-colors duration-300",
                },
                /*#__PURE__*/ React.createElement(
                  "svg",
                  {
                    width: "24",
                    height: "24",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "2",
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                  },
                  /*#__PURE__*/ React.createElement("path", {
                    d: "M5 12h14M12 5l7 7-7 7",
                  }),
                ),
              ),
          ),
        ),
      ),
    ),
  );
}
