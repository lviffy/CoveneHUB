"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import { Star, Plus } from "lucide-react";
import { motion } from "framer-motion";
const TestimonialRating = () =>
  /*#__PURE__*/ React.createElement(
    "div",
    {
      className: "flex gap-1 text-[#FFB02E] text-[10px]",
    },
    [...Array(5)].map((_, i) =>
      /*#__PURE__*/ React.createElement(Star, {
        key: i,
        className: "fill-current w-3 h-3",
      }),
    ),
  );

// Testimonial data for mobile carousel
const testimonials = [
  {
    name: "Priya Sharma",
    role: "Event Attendee • Mumbai",
    avatar: "/images/avatars/priya-sharma.png",
    quote:
      "The event was incredibly well organized from entry to exit. Easily one of my best live experiences.",
  },
  {
    name: "Rahul Verma",
    role: "Content Creator • Delhi",
    avatar: "/images/avatars/rahul-verma.png",
    quote:
      "Booking was smooth, check-in was instant, and updates were always on time. Super reliable platform.",
  },
  {
    name: "Ananya Patel",
    role: "Community Lead • Bangalore",
    avatar: "/images/avatars/ananya-patel.png",
    quote:
      "From ticket purchase to QR entry, everything worked flawlessly. Highly recommended for event teams.",
  },
];

// Mobile Carousel Component
const MobileTestimonialCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Auto-scroll effect
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused]);
  const handleTouchStart = (e) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < testimonials.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
    // Resume auto-scroll after 5 seconds
    setTimeout(() => setIsPaused(false), 5000);
  };
  const goToSlide = (index) => {
    setCurrentIndex(index);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 5000);
  };
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className: "md:hidden",
    },
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "bg-gray-50 rounded-2xl p-6 mb-4",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "flex items-center justify-between",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          null,
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "flex items-end gap-1 mb-1",
            },
            /*#__PURE__*/ React.createElement(
              "span",
              {
                className: "text-4xl font-semibold tracking-tight",
              },
              "4.9",
            ),
            /*#__PURE__*/ React.createElement(
              "span",
              {
                className: "text-lg text-neutral-400 mb-1",
              },
              "/5",
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-sm text-neutral-500",
            },
            /*#__PURE__*/ React.createElement(
              "span",
              {
                className: "text-black font-medium",
              },
              "50+",
            ),
            " happy visitors",
          ),
        ),
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "flex -space-x-2",
          },
          testimonials.slice(0, 3).map((t, i) =>
            /*#__PURE__*/ React.createElement(
              "div",
              {
                key: i,
                className:
                  "w-10 h-10 rounded-full bg-neutral-200 border-2 border-white overflow-hidden relative",
              },
              /*#__PURE__*/ React.createElement(Image, {
                src: t.avatar,
                alt: t.name,
                fill: true,
                className: "object-cover",
              }),
            ),
          ),
        ),
      ),
    ),
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "relative overflow-hidden rounded-2xl",
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
      },
      /*#__PURE__*/ React.createElement(
        motion.div,
        {
          className: "flex",
          animate: {
            x: `-${currentIndex * 100}%`,
          },
          transition: {
            type: "spring",
            stiffness: 300,
            damping: 30,
          },
        },
        testimonials.map((testimonial, index) =>
          /*#__PURE__*/ React.createElement(
            "div",
            {
              key: index,
              className: "w-full flex-shrink-0 bg-gray-50 rounded-2xl p-6",
            },
            /*#__PURE__*/ React.createElement(
              "p",
              {
                className:
                  "text-lg font-medium leading-relaxed text-gray-900 mb-6",
              },
              '"',
              testimonial.quote,
              '"',
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center gap-3",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "w-10 h-10 rounded-full overflow-hidden relative",
                },
                /*#__PURE__*/ React.createElement(Image, {
                  src: testimonial.avatar,
                  alt: testimonial.name,
                  fill: true,
                  className: "object-cover",
                }),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                null,
                /*#__PURE__*/ React.createElement(
                  "h4",
                  {
                    className: "font-semibold text-sm text-gray-900",
                  },
                  testimonial.name,
                ),
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "text-xs text-neutral-500",
                  },
                  testimonial.role,
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "ml-auto",
                },
                /*#__PURE__*/ React.createElement(TestimonialRating, null),
              ),
            ),
          ),
        ),
      ),
    ),
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "flex justify-center gap-2 mt-4",
      },
      testimonials.map((_, index) =>
        /*#__PURE__*/ React.createElement("button", {
          key: index,
          onClick: () => goToSlide(index),
          className: `w-2 h-2 rounded-full transition-all duration-300 ${index === currentIndex ? "bg-gray-900 w-6" : "bg-gray-300"}`,
          "aria-label": `Go to testimonial ${index + 1}`,
        }),
      ),
    ),
  );
};

// Desktop Grid Component (existing layout)
const DesktopTestimonialsGrid = () =>
  /*#__PURE__*/ React.createElement(
    "div",
    {
      className: "hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-2",
    },
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "flex flex-col gap-2",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className:
            "bg-gray-50 rounded-xl p-8 h-full flex flex-col justify-between",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "mb-12",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "flex items-end gap-1 mb-2",
            },
            /*#__PURE__*/ React.createElement(
              "span",
              {
                className: "text-6xl font-medium tracking-tighter",
              },
              "4.9",
            ),
            /*#__PURE__*/ React.createElement(
              "span",
              {
                className: "text-xl text-neutral-400 mb-2",
              },
              "/5",
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className:
                "text-neutral-500 leading-tight text-[15px] font-medium max-w-[200px]",
            },
            "We've served ",
            /*#__PURE__*/ React.createElement(
              "span",
              {
                className: "text-black",
              },
              "50+ attendees",
            ),
            " across high-energy live events in India.",
          ),
        ),
        /*#__PURE__*/ React.createElement(
          "div",
          null,
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "mb-6",
            },
            /*#__PURE__*/ React.createElement(
              "h3",
              {
                className: "font-bold text-lg mb-3",
              },
              "ConveneHub",
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center gap-2 mb-2",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex -space-x-3",
                },
                [
                  "/images/avatars/priya-sharma.png",
                  "/images/avatars/rahul-verma.png",
                  "/images/avatars/ananya-patel.png",
                ].map((src, i) =>
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      key: i,
                      className:
                        "w-8 h-8 rounded-full bg-neutral-200 border-2 border-white overflow-hidden relative",
                    },
                    /*#__PURE__*/ React.createElement(Image, {
                      src: src,
                      alt: "User",
                      fill: true,
                      className: "object-cover opacity-80",
                    }),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "w-8 h-8 rounded-full bg-black border-2 border-white flex items-center justify-center text-white text-[10px] z-10",
                  },
                  "10+",
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "p",
              {
                className: "text-xs text-neutral-500 font-medium",
              },
              "Happy visitors across India",
            ),
          ),
        ),
      ),
    ),
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className:
          "flex flex-col gap-2 transition-all duration-300 hover:gap-0 group cursor-pointer",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className:
            "bg-gray-50 rounded-xl p-5 flex items-center gap-4 transition-all duration-300 group-hover:rounded-b-none",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "w-12 h-12 rounded-xl overflow-hidden relative shrink-0",
          },
          /*#__PURE__*/ React.createElement(Image, {
            src: "/images/avatars/priya-sharma.png",
            alt: "Priya Sharma",
            fill: true,
            className: "object-cover",
          }),
        ),
        /*#__PURE__*/ React.createElement(
          "div",
          null,
          /*#__PURE__*/ React.createElement(
            "h4",
            {
              className: "font-bold text-sm",
            },
            "Priya Sharma",
          ),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-xs text-neutral-400 font-medium",
            },
            "Event Attendee \u2022 Mumbai",
          ),
        ),
      ),
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className:
            "bg-gray-50 rounded-xl p-8 grow flex flex-col justify-between relative transition-all duration-300 group-hover:rounded-t-none",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className:
              "absolute top-6 right-6 text-black transition-transform duration-300 group-hover:rotate-90",
          },
          /*#__PURE__*/ React.createElement(Plus, {
            className: "w-5 h-5",
          }),
        ),
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "mb-8",
          },
          /*#__PURE__*/ React.createElement(TestimonialRating, null),
        ),
        /*#__PURE__*/ React.createElement(
          "p",
          {
            className: "text-2xl font-medium tracking-tight leading-tight",
          },
          "The event was incredibly well organized from entry to exit. Easily one of my best live experiences.",
        ),
      ),
    ),
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className:
          "flex flex-col gap-2 transition-all duration-300 hover:gap-0 group cursor-pointer",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className:
            "bg-gray-50 rounded-xl p-8 grow flex flex-col justify-between relative transition-all duration-300 group-hover:rounded-b-none",
        },
        /*#__PURE__*/ React.createElement(
          "p",
          {
            className: "text-2xl font-medium tracking-tight leading-tight mb-8",
          },
          "Booking was smooth, check-in was instant, and updates were always on time. Super reliable platform.",
        ),
        /*#__PURE__*/ React.createElement(
          "div",
          null,
          /*#__PURE__*/ React.createElement(TestimonialRating, null),
        ),
      ),
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className:
            "bg-gray-50 rounded-xl p-5 flex items-center gap-4 transition-all duration-300 group-hover:rounded-t-none",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "w-12 h-12 rounded-xl overflow-hidden relative shrink-0",
          },
          /*#__PURE__*/ React.createElement(Image, {
            src: "/images/avatars/rahul-verma.png",
            alt: "Rahul Verma",
            fill: true,
            className: "object-cover",
          }),
        ),
        /*#__PURE__*/ React.createElement(
          "div",
          null,
          /*#__PURE__*/ React.createElement(
            "h4",
            {
              className: "font-bold text-sm",
            },
            "Rahul Verma",
          ),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-xs text-neutral-400 font-medium",
            },
            "Content Creator \u2022 Delhi",
          ),
        ),
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className:
              "ml-auto text-black transition-transform duration-300 group-hover:rotate-90",
          },
          /*#__PURE__*/ React.createElement(Plus, {
            className: "w-5 h-5",
          }),
        ),
      ),
    ),
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className:
          "flex flex-col gap-2 transition-all duration-300 hover:gap-0 group cursor-pointer",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className:
            "bg-gray-50 rounded-xl p-5 flex items-center gap-4 transition-all duration-300 group-hover:rounded-b-none",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "w-12 h-12 rounded-xl overflow-hidden relative shrink-0",
          },
          /*#__PURE__*/ React.createElement(Image, {
            src: "/images/avatars/ananya-patel.png",
            alt: "Ananya Patel",
            fill: true,
            className: "object-cover",
          }),
        ),
        /*#__PURE__*/ React.createElement(
          "div",
          null,
          /*#__PURE__*/ React.createElement(
            "h4",
            {
              className: "font-bold text-sm",
            },
            "Ananya Patel",
          ),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-xs text-neutral-400 font-medium",
            },
            "Community Lead \u2022 Bangalore",
          ),
        ),
      ),
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className:
            "bg-gray-50 rounded-xl p-8 grow flex flex-col justify-between relative transition-all duration-300 group-hover:rounded-t-none",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className:
              "absolute top-6 right-6 text-black transition-transform duration-300 group-hover:rotate-90",
          },
          /*#__PURE__*/ React.createElement(Plus, {
            className: "w-5 h-5",
          }),
        ),
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "mb-8",
          },
          /*#__PURE__*/ React.createElement(TestimonialRating, null),
        ),
        /*#__PURE__*/ React.createElement(
          "p",
          {
            className: "text-2xl font-medium tracking-tight leading-tight",
          },
          "From ticket purchase to QR entry, everything worked flawlessly. Highly recommended for event teams.",
        ),
      ),
    ),
  );
export default function TestimonialsSection() {
  return /*#__PURE__*/ React.createElement(
    "section",
    {
      className: "py-12 px-4 md:px-6 bg-white text-black overflow-hidden",
    },
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "max-w-7xl mx-auto",
      },
      /*#__PURE__*/ React.createElement(MobileTestimonialCarousel, null),
      /*#__PURE__*/ React.createElement(DesktopTestimonialsGrid, null),
    ),
  );
}
