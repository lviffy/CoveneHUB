"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/convene/client";
function Countdown({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    mins: 0,
  });
  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          mins: Math.floor((difference / 1000 / 60) % 60),
        });
      }
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, [targetDate]);
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className: "flex items-center gap-1.5 text-xs font-mono",
    },
    /*#__PURE__*/ React.createElement(Clock, {
      className: "w-3 h-3",
    }),
    /*#__PURE__*/ React.createElement("span", null, timeLeft.days, "d"),
    /*#__PURE__*/ React.createElement(
      "span",
      {
        className: "text-gray-400",
      },
      ":",
    ),
    /*#__PURE__*/ React.createElement("span", null, timeLeft.hours, "h"),
    /*#__PURE__*/ React.createElement(
      "span",
      {
        className: "text-gray-400",
      },
      ":",
    ),
    /*#__PURE__*/ React.createElement("span", null, timeLeft.mins, "m"),
  );
}
export default function FeaturedExperiences() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  useEffect(() => {
    const fetchFeaturedEvents = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "published")
        .gt("date_time", new Date().toISOString())
        .order("date_time", {
          ascending: true,
        })
        .limit(6);
      if (!error && data) {
        setEvents(data);
      }
      setLoading(false);
    };
    fetchFeaturedEvents();
  }, []);
  const updateScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };
  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 340;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
      setTimeout(updateScrollButtons, 300);
    }
  };
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", updateScrollButtons);
      updateScrollButtons();
      return () =>
        scrollElement.removeEventListener("scroll", updateScrollButtons);
    }
  }, [events]);
  if (loading) {
    return /*#__PURE__*/ React.createElement(
      "section",
      {
        className: "py-16 sm:py-20 bg-white",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "max-w-7xl mx-auto px-4 sm:px-6",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "animate-pulse space-y-4",
          },
          /*#__PURE__*/ React.createElement("div", {
            className: "h-8 bg-gray-200 rounded w-48",
          }),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "flex gap-6",
            },
            [1, 2, 3].map((i) =>
              /*#__PURE__*/ React.createElement("div", {
                key: i,
                className: "w-80 h-64 bg-gray-200 rounded-2xl flex-shrink-0",
              }),
            ),
          ),
        ),
      ),
    );
  }
  if (events.length === 0) return null;
  return /*#__PURE__*/ React.createElement(
    "section",
    {
      className: "py-16 sm:py-20 bg-white",
    },
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "max-w-7xl mx-auto px-4 sm:px-6",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "flex items-center justify-between mb-8",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          null,
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-xs uppercase tracking-widest text-gray-500 mb-2",
            },
            "Don't miss out",
          ),
          /*#__PURE__*/ React.createElement(
            "h2",
            {
              className: "text-2xl sm:text-3xl font-bold text-gray-900",
            },
            "Featured Experiences",
          ),
        ),
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "hidden sm:flex items-center gap-2",
          },
          /*#__PURE__*/ React.createElement(
            Button,
            {
              variant: "outline",
              size: "icon",
              onClick: () => scroll("left"),
              disabled: !canScrollLeft,
              className:
                "h-10 w-10 rounded-full border-gray-200 disabled:opacity-30",
            },
            /*#__PURE__*/ React.createElement(ChevronLeft, {
              className: "h-5 w-5",
            }),
          ),
          /*#__PURE__*/ React.createElement(
            Button,
            {
              variant: "outline",
              size: "icon",
              onClick: () => scroll("right"),
              disabled: !canScrollRight,
              className:
                "h-10 w-10 rounded-full border-gray-200 disabled:opacity-30",
            },
            /*#__PURE__*/ React.createElement(ChevronRight, {
              className: "h-5 w-5",
            }),
          ),
        ),
      ),
      /*#__PURE__*/ React.createElement(
        "div",
        {
          ref: scrollRef,
          className:
            "flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4",
          style: {
            scrollSnapType: "x mandatory",
          },
        },
        events.map((event, index) =>
          /*#__PURE__*/ React.createElement(
            motion.a,
            {
              key: event.event_id,
              href: `/events/${event.event_id}`,
              initial: {
                opacity: 0,
                y: 20,
              },
              animate: {
                opacity: 1,
                y: 0,
              },
              transition: {
                duration: 0.4,
                delay: index * 0.1,
              },
              className: "group flex-shrink-0 w-80 snap-start",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors duration-300",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "relative h-44 overflow-hidden",
                },
                /*#__PURE__*/ React.createElement(Image, {
                  src: event.event_image || "/event-placeholder.jpg",
                  alt: event.title,
                  fill: true,
                  className:
                    "object-cover group-hover:scale-105 transition-transform duration-500",
                }),
                event.remaining > 0 &&
                  event.remaining <= 20 &&
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "absolute top-3 left-3 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-full",
                    },
                    "Limited Spots: ",
                    event.remaining,
                    " left",
                  ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "p-5",
                },
                /*#__PURE__*/ React.createElement(
                  "h3",
                  {
                    className:
                      "font-semibold text-gray-900 text-lg mb-2 line-clamp-1 group-hover:text-gray-700 transition-colors",
                  },
                  event.title,
                ),
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "text-sm text-gray-500 mb-4 line-clamp-1",
                  },
                  event.venue_name,
                  ", ",
                  event.city,
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "flex items-center justify-between pt-4 border-t border-gray-100",
                  },
                  /*#__PURE__*/ React.createElement(Countdown, {
                    targetDate: event.date_time,
                  }),
                  /*#__PURE__*/ React.createElement(
                    "span",
                    {
                      className: "text-sm font-semibold text-gray-900",
                    },
                    event.ticket_price === 0
                      ? "Free"
                      : `₹${event.ticket_price}`,
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "flex justify-center gap-2 mt-6 sm:hidden",
        },
        events.slice(0, 5).map((_, index) =>
          /*#__PURE__*/ React.createElement("div", {
            key: index,
            className: `w-2 h-2 rounded-full ${index === 0 ? "bg-gray-900" : "bg-gray-300"}`,
          }),
        ),
      ),
    ),
  );
}
