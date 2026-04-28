"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Search,
  X,
  SlidersHorizontal,
  Grid3X3,
  LayoutList,
  Ticket,
  Sparkles,
  Filter,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/convene/client";
import { Spinner } from "@/components/ui/spinner";
import { resolveAssetUrl } from "@/lib/storage";
export default function EventsBrowsePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // State
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("All");
  const [cities, setCities] = useState(["All"]);
  const [priceFilter, setPriceFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [user, setUser] = useState(null);
  const [userBookings, setUserBookings] = useState(new Set());

  // Fetch events
  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/v1/events/public?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      if (!response.ok) return;
      const { events: fetchedEvents } = await response.json();
      const normalizedEvents = (fetchedEvents || []).map((event) => ({
        ...event,
        event_image: resolveAssetUrl(event.event_image || ""),
      }));
      if (normalizedEvents.length > 0) {
        setEvents(normalizedEvents);
        const eventCities = normalizedEvents
          .map((event) => event.city)
          .filter(Boolean)
          .map((city) => city.trim());
        const uniqueCities = [
          "All",
          ...Array.from(new Set(eventCities)).sort(),
        ];
        setCities(uniqueCities);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch user bookings
  const fetchUserBookings = async (userId) => {
    try {
      const { data } = await supabase
        .from("bookings")
        .select("event_id")
        .eq("user_id", userId)
        .neq("booking_status", "cancelled");
      if (data) {
        setUserBookings(new Set(data.map((b) => b.event_id)));
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  };
  useEffect(() => {
    fetchEvents();
    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser);
      if (authUser) fetchUserBookings(authUser.id);
    };
    getUser();
  }, [fetchEvents, supabase]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          event.title.toLowerCase().includes(query) ||
          event.venue_name?.toLowerCase().includes(query) ||
          event.city?.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      if (selectedCity !== "All" && event.city !== selectedCity) return false;
      if (priceFilter === "free" && event.ticket_price > 0) return false;
      if (priceFilter === "paid" && event.ticket_price === 0) return false;
      if (availabilityFilter === "available" && event.remaining === 0)
        return false;
      if (
        availabilityFilter === "limited" &&
        (event.remaining === 0 || event.remaining > 10)
      )
        return false;
      return true;
    });
  }, [events, searchQuery, selectedCity, priceFilter, availabilityFilter]);
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCity("All");
    setPriceFilter("all");
    setAvailabilityFilter("all");
  };
  const hasActiveFilters =
    searchQuery ||
    selectedCity !== "All" ||
    priceFilter !== "all" ||
    availabilityFilter !== "all";

  // Loading state
  if (isLoading) {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "min-h-[80vh] flex items-center justify-center",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "text-center",
        },
        /*#__PURE__*/ React.createElement(Spinner, {
          className: "w-10 h-10 text-[#195ADC] mx-auto",
        }),
        /*#__PURE__*/ React.createElement(
          "p",
          {
            className: "text-gray-500 mt-4 text-sm font-medium",
          },
          "Loading experiences...",
        ),
      ),
    );
  }
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className: "min-h-screen bg-white relative",
    },
    /*#__PURE__*/ React.createElement("div", {
      className: "fixed inset-0 z-0 pointer-events-none",
      style: {
        backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
        backgroundSize: "32px 32px",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, transparent 40%, #000 100%)",
        maskImage:
          "linear-gradient(to bottom, transparent 0%, transparent 40%, #000 100%)",
      },
    }),
    /*#__PURE__*/ React.createElement(
      "main",
      {
        className: "relative z-10 px-6 lg:px-10 xl:px-16 py-6 sm:py-8",
      },
      /*#__PURE__*/ React.createElement(
        motion.div,
        {
          initial: {
            opacity: 0,
            y: 20,
          },
          animate: {
            opacity: 1,
            y: 0,
          },
          transition: {
            delay: 0.15,
            duration: 0.5,
          },
          className: "mb-6",
        },
        /*#__PURE__*/ React.createElement(
          Card,
          {
            className: "border-gray-200 shadow-sm",
          },
          /*#__PURE__*/ React.createElement(
            CardContent,
            {
              className: "p-4",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex flex-col sm:flex-row gap-4",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex-1 relative",
                },
                /*#__PURE__*/ React.createElement(Search, {
                  className:
                    "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400",
                }),
                /*#__PURE__*/ React.createElement("input", {
                  type: "text",
                  placeholder: "Search events, venues, or cities...",
                  value: searchQuery,
                  onChange: (e) => setSearchQuery(e.target.value),
                  className:
                    "w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#195ADC]/20 focus:border-[#195ADC] transition-all",
                }),
                searchQuery &&
                  /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      onClick: () => setSearchQuery(""),
                      className:
                        "absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all",
                    },
                    /*#__PURE__*/ React.createElement(X, {
                      className: "w-4 h-4",
                    }),
                  ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex items-center gap-2",
                },
                /*#__PURE__*/ React.createElement(
                  "button",
                  {
                    onClick: () => setShowMobileFilters(!showMobileFilters),
                    className:
                      "lg:hidden flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-all",
                  },
                  /*#__PURE__*/ React.createElement(SlidersHorizontal, {
                    className: "w-4 h-4",
                  }),
                  "Filters",
                  hasActiveFilters &&
                    /*#__PURE__*/ React.createElement("span", {
                      className: "w-2 h-2 rounded-full bg-[#195ADC]",
                    }),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "flex items-center p-1 bg-gray-100 rounded-lg",
                  },
                  /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      onClick: () => setViewMode("grid"),
                      className: cn(
                        "p-2.5 rounded-md transition-all",
                        viewMode === "grid"
                          ? "bg-white shadow-sm text-[#195ADC]"
                          : "text-gray-400 hover:text-gray-600",
                      ),
                    },
                    /*#__PURE__*/ React.createElement(Grid3X3, {
                      className: "w-4 h-4",
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      onClick: () => setViewMode("list"),
                      className: cn(
                        "p-2.5 rounded-md transition-all",
                        viewMode === "list"
                          ? "bg-white shadow-sm text-[#195ADC]"
                          : "text-gray-400 hover:text-gray-600",
                      ),
                    },
                    /*#__PURE__*/ React.createElement(LayoutList, {
                      className: "w-4 h-4",
                    }),
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
          className: "flex gap-8",
        },
        /*#__PURE__*/ React.createElement(
          motion.aside,
          {
            initial: {
              opacity: 0,
              x: -20,
            },
            animate: {
              opacity: 1,
              x: 0,
            },
            transition: {
              delay: 0.2,
              duration: 0.5,
            },
            className: "hidden lg:block w-72 flex-shrink-0",
          },
          /*#__PURE__*/ React.createElement(
            Card,
            {
              className: "border-gray-200 shadow-sm sticky top-24",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "border-b border-gray-100 bg-gray-50/50 px-5 py-4",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex items-center justify-between",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "flex items-center gap-2",
                  },
                  /*#__PURE__*/ React.createElement(Filter, {
                    className: "w-4 h-4 text-[#195ADC]",
                  }),
                  /*#__PURE__*/ React.createElement(
                    "span",
                    {
                      className: "font-semibold text-gray-900",
                    },
                    "Filters",
                  ),
                ),
                hasActiveFilters &&
                  /*#__PURE__*/ React.createElement(
                    "button",
                    {
                      onClick: clearFilters,
                      className:
                        "text-sm text-[#195ADC] hover:text-[#195ADC]/80 font-medium transition-colors",
                    },
                    "Clear all",
                  ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              CardContent,
              {
                className: "p-5 space-y-6",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                null,
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "flex items-center gap-2 mb-3",
                  },
                  /*#__PURE__*/ React.createElement(MapPin, {
                    className: "w-4 h-4 text-gray-400",
                  }),
                  /*#__PURE__*/ React.createElement(
                    "h4",
                    {
                      className: "font-medium text-gray-700 text-sm",
                    },
                    "Location",
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "space-y-1",
                  },
                  cities.map((city) =>
                    /*#__PURE__*/ React.createElement(
                      "button",
                      {
                        key: city,
                        onClick: () => setSelectedCity(city),
                        className: cn(
                          "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                          selectedCity === city
                            ? "bg-[#195ADC] text-white"
                            : "text-gray-600 hover:bg-gray-100",
                        ),
                      },
                      city,
                    ),
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "pt-4 border-t border-gray-100",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "flex items-center gap-2 mb-3",
                  },
                  /*#__PURE__*/ React.createElement(Ticket, {
                    className: "w-4 h-4 text-gray-400",
                  }),
                  /*#__PURE__*/ React.createElement(
                    "h4",
                    {
                      className: "font-medium text-gray-700 text-sm",
                    },
                    "Price",
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "space-y-1",
                  },
                  [
                    {
                      value: "all",
                      label: "All Events",
                    },
                    {
                      value: "free",
                      label: "Free Events",
                    },
                    {
                      value: "paid",
                      label: "Paid Events",
                    },
                  ].map((option) =>
                    /*#__PURE__*/ React.createElement(
                      "button",
                      {
                        key: option.value,
                        onClick: () => setPriceFilter(option.value),
                        className: cn(
                          "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                          priceFilter === option.value
                            ? "bg-[#195ADC] text-white"
                            : "text-gray-600 hover:bg-gray-100",
                        ),
                      },
                      option.label,
                    ),
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "pt-4 border-t border-gray-100",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "flex items-center gap-2 mb-3",
                  },
                  /*#__PURE__*/ React.createElement(Users, {
                    className: "w-4 h-4 text-gray-400",
                  }),
                  /*#__PURE__*/ React.createElement(
                    "h4",
                    {
                      className: "font-medium text-gray-700 text-sm",
                    },
                    "Availability",
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "space-y-1",
                  },
                  [
                    {
                      value: "all",
                      label: "All",
                    },
                    {
                      value: "available",
                      label: "Available",
                    },
                    {
                      value: "limited",
                      label: "Limited Spots",
                    },
                  ].map((option) =>
                    /*#__PURE__*/ React.createElement(
                      "button",
                      {
                        key: option.value,
                        onClick: () => setAvailabilityFilter(option.value),
                        className: cn(
                          "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                          availabilityFilter === option.value
                            ? "bg-[#195ADC] text-white"
                            : "text-gray-600 hover:bg-gray-100",
                        ),
                      },
                      option.label,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        /*#__PURE__*/ React.createElement(
          AnimatePresence,
          null,
          showMobileFilters &&
            /*#__PURE__*/ React.createElement(
              React.Fragment,
              null,
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
                onClick: () => setShowMobileFilters(false),
                className:
                  "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden",
              }),
              /*#__PURE__*/ React.createElement(
                motion.div,
                {
                  initial: {
                    x: "100%",
                  },
                  animate: {
                    x: 0,
                  },
                  exit: {
                    x: "100%",
                  },
                  transition: {
                    type: "spring",
                    damping: 30,
                    stiffness: 300,
                  },
                  className:
                    "fixed right-0 top-0 bottom-0 w-[320px] bg-white z-50 lg:hidden overflow-y-auto shadow-2xl",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "border-b border-gray-100 bg-gray-50/50 px-6 py-4",
                  },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "flex items-center justify-between",
                    },
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "flex items-center gap-2",
                      },
                      /*#__PURE__*/ React.createElement(Filter, {
                        className: "w-4 h-4 text-[#195ADC]",
                      }),
                      /*#__PURE__*/ React.createElement(
                        "span",
                        {
                          className: "font-semibold text-gray-900",
                        },
                        "Filters",
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      "button",
                      {
                        onClick: () => setShowMobileFilters(false),
                        className:
                          "p-2 rounded-full hover:bg-gray-100 transition-colors",
                      },
                      /*#__PURE__*/ React.createElement(X, {
                        className: "w-5 h-5 text-gray-500",
                      }),
                    ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "p-6 space-y-6",
                  },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    null,
                    /*#__PURE__*/ React.createElement(
                      "h4",
                      {
                        className: "font-medium text-gray-700 text-sm mb-3",
                      },
                      "Location",
                    ),
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "space-y-1",
                      },
                      cities.map((city) =>
                        /*#__PURE__*/ React.createElement(
                          "button",
                          {
                            key: city,
                            onClick: () => setSelectedCity(city),
                            className: cn(
                              "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                              selectedCity === city
                                ? "bg-[#195ADC] text-white"
                                : "text-gray-600 hover:bg-gray-100",
                            ),
                          },
                          city,
                        ),
                      ),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "pt-4 border-t border-gray-100",
                    },
                    /*#__PURE__*/ React.createElement(
                      "h4",
                      {
                        className: "font-medium text-gray-700 text-sm mb-3",
                      },
                      "Price",
                    ),
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "space-y-1",
                      },
                      [
                        {
                          value: "all",
                          label: "All Events",
                        },
                        {
                          value: "free",
                          label: "Free Events",
                        },
                        {
                          value: "paid",
                          label: "Paid Events",
                        },
                      ].map((option) =>
                        /*#__PURE__*/ React.createElement(
                          "button",
                          {
                            key: option.value,
                            onClick: () => setPriceFilter(option.value),
                            className: cn(
                              "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                              priceFilter === option.value
                                ? "bg-[#195ADC] text-white"
                                : "text-gray-600 hover:bg-gray-100",
                            ),
                          },
                          option.label,
                        ),
                      ),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "pt-4 border-t border-gray-100",
                    },
                    /*#__PURE__*/ React.createElement(
                      Button,
                      {
                        onClick: () => setShowMobileFilters(false),
                        className:
                          "w-full bg-[#195ADC] hover:bg-[#195ADC]/90 text-white rounded-xl h-12 font-medium",
                      },
                      "Apply Filters",
                    ),
                  ),
                ),
              ),
            ),
        ),
        /*#__PURE__*/ React.createElement(
          motion.div,
          {
            initial: {
              opacity: 0,
              y: 20,
            },
            animate: {
              opacity: 1,
              y: 0,
            },
            transition: {
              delay: 0.25,
              duration: 0.5,
            },
            className: "flex-1 min-w-0",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "flex items-center justify-between mb-6",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center gap-3",
              },
              /*#__PURE__*/ React.createElement(Calendar, {
                className: "w-5 h-5 text-[#195ADC]",
              }),
              /*#__PURE__*/ React.createElement(
                "div",
                null,
                /*#__PURE__*/ React.createElement(
                  "h2",
                  {
                    className: "font-semibold text-gray-900",
                  },
                  "Upcoming Events",
                ),
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "text-sm text-gray-500",
                  },
                  filteredEvents.length,
                  " ",
                  filteredEvents.length === 1 ? "event" : "events",
                  " found",
                ),
              ),
            ),
            hasActiveFilters &&
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "hidden md:flex items-center gap-2",
                },
                selectedCity !== "All" &&
                  /*#__PURE__*/ React.createElement(
                    "span",
                    {
                      className:
                        "inline-flex items-center gap-2 px-3 py-1.5 bg-[#195ADC]/10 text-[#195ADC] text-sm font-medium rounded-full",
                    },
                    /*#__PURE__*/ React.createElement(MapPin, {
                      className: "w-3.5 h-3.5",
                    }),
                    selectedCity,
                    /*#__PURE__*/ React.createElement(
                      "button",
                      {
                        onClick: () => setSelectedCity("All"),
                        className: "hover:text-[#195ADC]/70",
                      },
                      /*#__PURE__*/ React.createElement(X, {
                        className: "w-3.5 h-3.5",
                      }),
                    ),
                  ),
                priceFilter !== "all" &&
                  /*#__PURE__*/ React.createElement(
                    "span",
                    {
                      className:
                        "inline-flex items-center gap-2 px-3 py-1.5 bg-[#195ADC]/10 text-[#195ADC] text-sm font-medium rounded-full",
                    },
                    /*#__PURE__*/ React.createElement(Ticket, {
                      className: "w-3.5 h-3.5",
                    }),
                    priceFilter === "free" ? "Free" : "Paid",
                    /*#__PURE__*/ React.createElement(
                      "button",
                      {
                        onClick: () => setPriceFilter("all"),
                        className: "hover:text-[#195ADC]/70",
                      },
                      /*#__PURE__*/ React.createElement(X, {
                        className: "w-3.5 h-3.5",
                      }),
                    ),
                  ),
              ),
          ),
          filteredEvents.length === 0
            ? /*#__PURE__*/ React.createElement(
                Card,
                {
                  className: "border-gray-200 shadow-sm",
                },
                /*#__PURE__*/ React.createElement(
                  CardContent,
                  {
                    className: "py-16 text-center",
                  },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#195ADC]/10 mb-4",
                    },
                    /*#__PURE__*/ React.createElement(Calendar, {
                      className: "w-8 h-8 text-[#195ADC]",
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "h3",
                    {
                      className: "text-lg font-semibold text-gray-900 mb-2",
                    },
                    "No events found",
                  ),
                  /*#__PURE__*/ React.createElement(
                    "p",
                    {
                      className: "text-gray-500 max-w-sm mx-auto mb-6",
                    },
                    "Try adjusting your filters or search to find what you're looking for",
                  ),
                  /*#__PURE__*/ React.createElement(
                    Button,
                    {
                      onClick: clearFilters,
                      variant: "outline",
                      className:
                        "border-[#195ADC] text-[#195ADC] hover:bg-[#195ADC]/5",
                    },
                    "Clear Filters",
                  ),
                ),
              )
            : /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: cn(
                    viewMode === "grid"
                      ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                      : "space-y-3",
                  ),
                },
                filteredEvents.map((event, index) => {
                  const isSoldOut = event.remaining === 0;
                  const eventDate = new Date(event.date_time);
                  const fillPercentage =
                    ((event.capacity - event.remaining) / event.capacity) * 100;
                  return viewMode === "grid"
                    ? /*#__PURE__*/ React.createElement(
                        motion.div,
                        {
                          key: event.event_id,
                          initial: {
                            opacity: 0,
                            y: 20,
                          },
                          animate: {
                            opacity: 1,
                            y: 0,
                          },
                          transition: {
                            duration: 0.3,
                            delay: index * 0.05,
                          },
                        },
                        /*#__PURE__*/ React.createElement(
                          Card,
                          {
                            onClick: () =>
                              router.push(`/events/${event.event_id}`),
                            className: cn(
                              "group cursor-pointer border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden",
                              isSoldOut && "opacity-60",
                            ),
                          },
                          /*#__PURE__*/ React.createElement(
                            "div",
                            {
                              className:
                                "relative aspect-video bg-gray-100 overflow-hidden",
                            },
                            event.event_image
                              ? /*#__PURE__*/ React.createElement(Image, {
                                  src: event.event_image,
                                  alt: event.title,
                                  fill: true,
                                  className:
                                    "object-cover group-hover:scale-105 transition-transform duration-500",
                                })
                              : /*#__PURE__*/ React.createElement(
                                  "div",
                                  {
                                    className:
                                      "w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100",
                                  },
                                  /*#__PURE__*/ React.createElement(Calendar, {
                                    className: "w-12 h-12 text-gray-300",
                                  }),
                                ),
                            isSoldOut &&
                              /*#__PURE__*/ React.createElement(
                                "div",
                                {
                                  className: "absolute top-3 left-3",
                                },
                                /*#__PURE__*/ React.createElement(
                                  "span",
                                  {
                                    className:
                                      "px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500 text-white",
                                  },
                                  "Sold Out",
                                ),
                              ),
                            !isSoldOut &&
                              event.remaining <= 10 &&
                              /*#__PURE__*/ React.createElement(
                                "div",
                                {
                                  className: "absolute top-3 left-3",
                                },
                                /*#__PURE__*/ React.createElement(
                                  "span",
                                  {
                                    className:
                                      "px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-500 text-white flex items-center gap-1",
                                  },
                                  /*#__PURE__*/ React.createElement(Sparkles, {
                                    className: "w-3 h-3",
                                  }),
                                  event.remaining,
                                  " left",
                                ),
                              ),
                          ),
                          /*#__PURE__*/ React.createElement(
                            CardContent,
                            {
                              className: "p-4",
                            },
                            /*#__PURE__*/ React.createElement(
                              "div",
                              {
                                className:
                                  "flex items-start justify-between gap-3 mb-3",
                              },
                              /*#__PURE__*/ React.createElement(
                                "h3",
                                {
                                  className:
                                    "font-semibold text-gray-900 line-clamp-1 group-hover:text-[#195ADC] transition-colors",
                                },
                                event.title,
                              ),
                              /*#__PURE__*/ React.createElement(
                                "span",
                                {
                                  className: cn(
                                    "text-sm font-bold flex-shrink-0",
                                    event.ticket_price === 0
                                      ? "text-green-600"
                                      : "text-gray-900",
                                  ),
                                },
                                event.ticket_price === 0
                                  ? "FREE"
                                  : `₹${event.ticket_price.toLocaleString()}`,
                              ),
                            ),
                            /*#__PURE__*/ React.createElement(
                              "div",
                              {
                                className: "space-y-2 mb-4",
                              },
                              /*#__PURE__*/ React.createElement(
                                "div",
                                {
                                  className:
                                    "flex items-center gap-2 text-sm text-gray-500",
                                },
                                /*#__PURE__*/ React.createElement(Calendar, {
                                  className:
                                    "w-4 h-4 text-gray-400 flex-shrink-0",
                                }),
                                /*#__PURE__*/ React.createElement(
                                  "span",
                                  null,
                                  eventDate.toLocaleDateString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  }),
                                ),
                                /*#__PURE__*/ React.createElement(
                                  "span",
                                  {
                                    className: "text-gray-300",
                                  },
                                  "\u2022",
                                ),
                                /*#__PURE__*/ React.createElement(
                                  "span",
                                  null,
                                  eventDate.toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  }),
                                ),
                              ),
                              /*#__PURE__*/ React.createElement(
                                "div",
                                {
                                  className:
                                    "flex items-center gap-2 text-sm text-gray-500",
                                },
                                /*#__PURE__*/ React.createElement(MapPin, {
                                  className:
                                    "w-4 h-4 text-gray-400 flex-shrink-0",
                                }),
                                /*#__PURE__*/ React.createElement(
                                  "span",
                                  {
                                    className: "truncate",
                                  },
                                  event.venue_name,
                                  ", ",
                                  event.city,
                                ),
                              ),
                            ),
                            /*#__PURE__*/ React.createElement(
                              "div",
                              {
                                className: "flex items-center gap-3",
                              },
                              /*#__PURE__*/ React.createElement(
                                "div",
                                {
                                  className:
                                    "flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden",
                                },
                                /*#__PURE__*/ React.createElement(motion.div, {
                                  initial: {
                                    width: 0,
                                  },
                                  animate: {
                                    width: `${fillPercentage}%`,
                                  },
                                  transition: {
                                    duration: 0.8,
                                    delay: 0.2,
                                  },
                                  className: cn(
                                    "h-full rounded-full",
                                    fillPercentage >= 90
                                      ? "bg-red-500"
                                      : fillPercentage >= 70
                                        ? "bg-orange-500"
                                        : "bg-[#195ADC]",
                                  ),
                                }),
                              ),
                              /*#__PURE__*/ React.createElement(
                                "span",
                                {
                                  className:
                                    "text-xs font-medium text-gray-400 tabular-nums whitespace-nowrap",
                                },
                                event.remaining,
                                " left",
                              ),
                            ),
                          ),
                        ),
                      )
                    : /*#__PURE__*/
                      // List View
                      React.createElement(
                        motion.div,
                        {
                          key: event.event_id,
                          initial: {
                            opacity: 0,
                            x: -20,
                          },
                          animate: {
                            opacity: 1,
                            x: 0,
                          },
                          transition: {
                            duration: 0.3,
                            delay: index * 0.05,
                          },
                        },
                        /*#__PURE__*/ React.createElement(
                          Card,
                          {
                            onClick: () =>
                              router.push(`/events/${event.event_id}`),
                            className: cn(
                              "group cursor-pointer border-gray-200 shadow-sm hover:shadow-md hover:border-[#195ADC]/30 transition-all duration-300",
                              isSoldOut && "opacity-60",
                            ),
                          },
                          /*#__PURE__*/ React.createElement(
                            CardContent,
                            {
                              className: "p-4 flex gap-4",
                            },
                            /*#__PURE__*/ React.createElement(
                              "div",
                              {
                                className:
                                  "relative aspect-video w-36 sm:w-48 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100",
                              },
                              event.event_image
                                ? /*#__PURE__*/ React.createElement(Image, {
                                    src: event.event_image,
                                    alt: event.title,
                                    fill: true,
                                    className:
                                      "object-cover group-hover:scale-105 transition-transform duration-500",
                                  })
                                : /*#__PURE__*/ React.createElement(
                                    "div",
                                    {
                                      className:
                                        "w-full h-full flex items-center justify-center",
                                    },
                                    /*#__PURE__*/ React.createElement(
                                      Calendar,
                                      {
                                        className: "w-8 h-8 text-gray-300",
                                      },
                                    ),
                                  ),
                            ),
                            /*#__PURE__*/ React.createElement(
                              "div",
                              {
                                className:
                                  "flex-1 min-w-0 flex flex-col justify-between",
                              },
                              /*#__PURE__*/ React.createElement(
                                "div",
                                null,
                                /*#__PURE__*/ React.createElement(
                                  "h3",
                                  {
                                    className:
                                      "font-semibold text-gray-900 mb-1 group-hover:text-[#195ADC] transition-colors line-clamp-1",
                                  },
                                  event.title,
                                ),
                                /*#__PURE__*/ React.createElement(
                                  "div",
                                  {
                                    className:
                                      "flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500",
                                  },
                                  /*#__PURE__*/ React.createElement(
                                    "span",
                                    {
                                      className: "flex items-center gap-1",
                                    },
                                    /*#__PURE__*/ React.createElement(
                                      Calendar,
                                      {
                                        className: "w-3.5 h-3.5",
                                      },
                                    ),
                                    eventDate.toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    }),
                                  ),
                                  /*#__PURE__*/ React.createElement(
                                    "span",
                                    {
                                      className: "flex items-center gap-1",
                                    },
                                    /*#__PURE__*/ React.createElement(Clock, {
                                      className: "w-3.5 h-3.5",
                                    }),
                                    eventDate.toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    }),
                                  ),
                                  /*#__PURE__*/ React.createElement(
                                    "span",
                                    {
                                      className: "flex items-center gap-1",
                                    },
                                    /*#__PURE__*/ React.createElement(MapPin, {
                                      className: "w-3.5 h-3.5",
                                    }),
                                    event.city,
                                  ),
                                ),
                              ),
                              /*#__PURE__*/ React.createElement(
                                "div",
                                {
                                  className:
                                    "flex items-center justify-between mt-2",
                                },
                                /*#__PURE__*/ React.createElement(
                                  "span",
                                  {
                                    className: cn(
                                      "text-lg font-bold",
                                      event.ticket_price === 0
                                        ? "text-green-600"
                                        : "text-gray-900",
                                    ),
                                  },
                                  event.ticket_price === 0
                                    ? "FREE"
                                    : `₹${event.ticket_price.toLocaleString()}`,
                                ),
                                /*#__PURE__*/ React.createElement(
                                  "span",
                                  {
                                    className: "text-sm text-gray-400",
                                  },
                                  event.remaining,
                                  " spots left",
                                ),
                              ),
                            ),
                            /*#__PURE__*/ React.createElement(
                              "div",
                              {
                                className: "hidden sm:flex items-center",
                              },
                              /*#__PURE__*/ React.createElement(ArrowRight, {
                                className:
                                  "w-5 h-5 text-gray-300 group-hover:text-[#195ADC] group-hover:translate-x-1 transition-all",
                              }),
                            ),
                          ),
                        ),
                      );
                }),
              ),
        ),
      ),
    ),
  );
}
