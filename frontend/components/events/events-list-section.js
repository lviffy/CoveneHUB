"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ArrowRight,
  Circle,
  Film,
  CheckCircle2,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/convene/client";
import { Spinner } from "@/components/ui/spinner";
import { resolveAssetUrl } from "@/lib/storage";
export default function EventsListSection() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL filters
  const locationFilter = searchParams.get("location") || "";
  const dateFilter = searchParams.get("date") || "";
  const genreFilter = searchParams.get("genre") || "";
  const hasFilters = locationFilter || dateFilter || genreFilter;
  const [selectedCity, setSelectedCity] = useState("All");
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cities, setCities] = useState(["All"]);
  const [user, setUser] = useState(null);
  const [userBookings, setUserBookings] = useState(new Set());
  const supabase = useMemo(() => createClient(), []);

  // Clear URL filters
  const clearFilters = () => {
    router.push("/#events-list");
  };

  // Memoized fetch events function
  const fetchEvents = useCallback(async () => {
    try {
      // Don't show loading spinner on refresh (only on initial load)
      const isInitialLoad = events.length === 0;
      if (isInitialLoad) {
        setIsLoading(true);
      }

      // Use public API endpoint that bypasses RLS to get accurate booking counts
      // Add cache busting parameter to ensure fresh data
      const response = await fetch(`/api/v1/events/public?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      if (!response.ok) {
        return;
      }
      const { events: fetchedEvents, timestamp } = await response.json();
      const normalizedEvents = (fetchedEvents || []).map((event) => ({
        ...event,
        event_image: resolveAssetUrl(event.event_image || ""),
      }));
      if (normalizedEvents.length > 0) {
        setEvents(normalizedEvents);

        // Extract unique cities from events (with normalization)
        const eventCities = normalizedEvents
          .map((event) => event.city)
          .filter(Boolean)
          .map((city) => city.trim()); // Normalize whitespace
        const uniqueCities = [
          "All",
          ...Array.from(new Set(eventCities)).sort(),
        ]; // Sort alphabetically
        setCities(uniqueCities);
      } else {
        setEvents([]);
        setCities(["All"]);
      }
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, [events.length]);

  // Fetch user authentication state
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      setUser(authUser);
      if (authUser) {
        fetchUserBookings(authUser.id);
      }
    };
    getUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchUserBookings(session.user.id);
      } else {
        setUserBookings(new Set());
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Fetch user's bookings
  const fetchUserBookings = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("event_id")
        .eq("user_id", userId)
        .neq("booking_status", "cancelled");
      if (!error && data) {
        const bookedEventIds = new Set(data.map((booking) => booking.event_id));
        setUserBookings(bookedEventIds);
      }
    } catch (error) {
      // Handle error silently or with proper error handling
    }
  };

  // Fetch events from Supabase
  useEffect(() => {
    fetchEvents();

    // Debounce timer for real-time updates
    let debounceTimer;

    // Set up real-time subscription for booking changes
    const channel = supabase
      .channel("public-events-bookings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        (payload) => {
          // Debounce updates to prevent excessive re-fetches (wait 2 seconds)
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            fetchEvents();
            // Refresh user bookings if user is logged in
            if (user) {
              fetchUserBookings(user.id);
            }
          }, 2000);
        },
      )
      .subscribe();
    return () => {
      clearTimeout(debounceTimer);
      channel.unsubscribe();
    };
  }, [user, fetchEvents, supabase]);

  // Memoize filtered events to prevent unnecessary recalculations
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // City filter (from pills)
      if (selectedCity !== "All" && event.city !== selectedCity) {
        return false;
      }

      // Location filter (from search bar - matches city or venue name)
      if (locationFilter) {
        const locationLower = locationFilter.toLowerCase();
        const cityMatch = event.city?.toLowerCase().includes(locationLower);
        const venueMatch = event.venue_name
          ?.toLowerCase()
          .includes(locationLower);
        if (!cityMatch && !venueMatch) {
          return false;
        }
      }

      // Date filter (matches event date)
      if (dateFilter) {
        const filterDate = new Date(dateFilter).toDateString();
        const eventDate = new Date(event.date_time).toDateString();
        if (filterDate !== eventDate) {
          return false;
        }
      }

      // Genre filter (placeholder - events don't have genre field yet)
      // For now, we'll skip this filter but the infrastructure is ready
      // when genre field is added to the Event type

      return true;
    });
  }, [events, selectedCity, locationFilter, dateFilter]);

  // Loading state
  if (isLoading) {
    return /*#__PURE__*/ React.createElement(
      "section",
      {
        id: "events-list",
        className:
          "relative py-16 xs:py-20 sm:py-24 px-4 xs:px-5 sm:px-6 bg-white",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "relative mx-auto max-w-7xl",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "flex items-center justify-center py-16 xs:py-20",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "text-center",
            },
            /*#__PURE__*/ React.createElement(Spinner, {
              className:
                "w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 text-[#195ADC] mx-auto mb-3 xs:mb-4",
            }),
            /*#__PURE__*/ React.createElement(
              "p",
              {
                className: "text-sm xs:text-base text-gray-600",
              },
              "Loading events...",
            ),
          ),
        ),
      ),
    );
  }

  // Empty state
  if (events.length === 0) {
    return /*#__PURE__*/ React.createElement(
      "section",
      {
        id: "events-list",
        className:
          "relative py-16 xs:py-20 sm:py-24 px-4 xs:px-5 sm:px-6 bg-white",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "relative mx-auto max-w-7xl",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "text-center py-16 xs:py-20",
          },
          /*#__PURE__*/ React.createElement(Film, {
            className:
              "w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 mx-auto mb-3 xs:mb-4 text-gray-400",
          }),
          /*#__PURE__*/ React.createElement(
            "h3",
            {
              className: "text-xl xs:text-2xl font-bold text-gray-900 mb-2",
            },
            "No Events Available",
          ),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-sm xs:text-base text-gray-600",
            },
            "Check back soon for exciting upcoming events!",
          ),
        ),
      ),
    );
  }
  return /*#__PURE__*/ React.createElement(
    "section",
    {
      id: "events-list",
      className:
        "relative py-16 xs:py-20 sm:py-24 px-4 xs:px-5 sm:px-6 bg-white",
    },
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "relative mx-auto max-w-7xl",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "mb-10 xs:mb-12 sm:mb-16",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className:
              "flex flex-col xs:flex-row xs:items-center xs:justify-between mb-6 xs:mb-8 gap-2 xs:gap-4",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            null,
            /*#__PURE__*/ React.createElement(
              "h2",
              {
                className:
                  "text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-1 xs:mb-2",
              },
              "Upcoming Events",
            ),
            /*#__PURE__*/ React.createElement(
              "p",
              {
                className: "text-sm xs:text-base text-gray-500",
              },
              filteredEvents.length,
              " ",
              filteredEvents.length === 1 ? "event" : "events",
              " available",
            ),
          ),
        ),
        hasFilters &&
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "mb-4 flex flex-wrap items-center gap-2",
            },
            /*#__PURE__*/ React.createElement(
              "span",
              {
                className: "text-xs text-gray-500 mr-1",
              },
              "Filters:",
            ),
            locationFilter &&
              /*#__PURE__*/ React.createElement(
                "span",
                {
                  className:
                    "inline-flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-full",
                },
                /*#__PURE__*/ React.createElement(MapPin, {
                  className: "w-3 h-3",
                }),
                locationFilter,
              ),
            dateFilter &&
              /*#__PURE__*/ React.createElement(
                "span",
                {
                  className:
                    "inline-flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-full",
                },
                /*#__PURE__*/ React.createElement(Calendar, {
                  className: "w-3 h-3",
                }),
                new Date(dateFilter).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
              ),
            genreFilter &&
              /*#__PURE__*/ React.createElement(
                "span",
                {
                  className:
                    "inline-flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-full",
                },
                /*#__PURE__*/ React.createElement(Film, {
                  className: "w-3 h-3",
                }),
                genreFilter,
              ),
            /*#__PURE__*/ React.createElement(
              "button",
              {
                onClick: clearFilters,
                className:
                  "inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full hover:bg-gray-200 transition-colors",
              },
              /*#__PURE__*/ React.createElement(X, {
                className: "w-3 h-3",
              }),
              "Clear all",
            ),
          ),
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className:
              "flex items-center gap-1.5 xs:gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1",
          },
          cities.map((city) =>
            /*#__PURE__*/ React.createElement(
              "button",
              {
                key: city,
                onClick: () => setSelectedCity(city),
                className: cn(
                  "relative px-3 xs:px-4 sm:px-5 py-2 xs:py-2.5 text-xs xs:text-sm font-medium rounded-full whitespace-nowrap transition-all duration-300 ease-out",
                  selectedCity === city
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105",
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
          className: "space-y-4 xs:space-y-5 sm:space-y-6",
        },
        filteredEvents.map((event, index) => {
          const isSoldOut = event.remaining === 0;
          const isBooked = userBookings.has(event.event_id);
          const booked = event.capacity - event.remaining;
          const fillPercentage = (booked / event.capacity) * 100;
          const eventDate = new Date(event.date_time);
          return /*#__PURE__*/ React.createElement(
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
                duration: 0.4,
                delay: index * 0.04,
                ease: [0.25, 0.1, 0.25, 1],
              },
              className: cn(
                "group relative bg-white border border-gray-200 rounded-xl xs:rounded-2xl p-4 xs:p-5 sm:p-6 md:p-8 transition-all duration-300 ease-out",
                isSoldOut ? "opacity-50" : "hover:border-gray-300",
              ),
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 xs:gap-5 sm:gap-6",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex-1 space-y-3 xs:space-y-4",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  null,
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "flex items-start gap-2 xs:gap-3 mb-2",
                    },
                    event.event_image
                      ? /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className:
                              "w-14 h-14 xs:w-16 xs:h-16 md:w-20 md:h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative",
                          },
                          /*#__PURE__*/ React.createElement(Image, {
                            src: event.event_image,
                            alt: event.title,
                            fill: true,
                            sizes:
                              "(max-width: 640px) 56px, (max-width: 768px) 64px, 80px",
                            className: "object-cover",
                            loading: "lazy",
                          }),
                        )
                      : /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className:
                              "w-9 h-9 xs:w-10 xs:h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0",
                          },
                          /*#__PURE__*/ React.createElement(Film, {
                            className: "w-4 h-4 xs:w-5 xs:h-5 text-gray-600",
                          }),
                        ),
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "flex-1 min-w-0",
                      },
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "flex items-center gap-2 flex-wrap mb-1",
                        },
                        /*#__PURE__*/ React.createElement(
                          "h3",
                          {
                            className:
                              "text-lg xs:text-xl md:text-2xl font-bold text-gray-900 group-hover:text-gray-900 transition-colors truncate",
                          },
                          event.title,
                        ),
                        /*#__PURE__*/ React.createElement(
                          "span",
                          {
                            className: cn(
                              "px-2 xs:px-3 py-0.5 xs:py-1 text-[10px] xs:text-xs font-medium rounded-full flex-shrink-0",
                              event.status === "published"
                                ? "bg-green-100 text-green-700"
                                : event.status === "checkin_open"
                                  ? "bg-blue-100 text-blue-700"
                                  : event.status === "in_progress"
                                    ? "bg-orange-100 text-orange-700"
                                    : event.status === "ended"
                                      ? "bg-gray-100 text-gray-600"
                                      : "bg-gray-100 text-gray-600",
                            ),
                          },
                          event.status.replace("_", " ").toUpperCase(),
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "p",
                        {
                          className:
                            "text-gray-600 text-xs xs:text-sm line-clamp-2",
                        },
                        event.description,
                      ),
                    ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-3 sm:gap-4 text-xs xs:text-sm pl-0 xs:pl-0 md:pl-13",
                  },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "flex items-center gap-1.5 xs:gap-2 text-gray-600",
                    },
                    /*#__PURE__*/ React.createElement(Calendar, {
                      className: "w-3.5 h-3.5 xs:w-4 xs:h-4 flex-shrink-0",
                    }),
                    /*#__PURE__*/ React.createElement(
                      "span",
                      {
                        className: "truncate",
                      },
                      eventDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "flex items-center gap-1.5 xs:gap-2 text-gray-600",
                    },
                    /*#__PURE__*/ React.createElement(Clock, {
                      className: "w-3.5 h-3.5 xs:w-4 xs:h-4 flex-shrink-0",
                    }),
                    /*#__PURE__*/ React.createElement(
                      "span",
                      null,
                      eventDate.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      }),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "flex items-center gap-1.5 xs:gap-2 text-gray-600",
                    },
                    /*#__PURE__*/ React.createElement(MapPin, {
                      className: "w-3.5 h-3.5 xs:w-4 xs:h-4 flex-shrink-0",
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
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "flex items-center gap-1.5 xs:gap-2 text-gray-600",
                    },
                    /*#__PURE__*/ React.createElement(Users, {
                      className: "w-3.5 h-3.5 xs:w-4 xs:h-4 flex-shrink-0",
                    }),
                    /*#__PURE__*/ React.createElement(
                      "span",
                      null,
                      isSoldOut
                        ? "Sold Out"
                        : `${event.remaining} ${event.remaining === 1 ? "slot" : "slots"} left`,
                    ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "flex flex-wrap gap-2 pl-0 xs:pl-0 md:pl-13",
                  },
                  event.remaining > 0 &&
                    event.remaining <= 10 &&
                    /*#__PURE__*/ React.createElement(
                      "span",
                      {
                        className:
                          "inline-flex items-center px-2.5 py-1 text-[10px] xs:text-xs font-medium bg-gray-900 text-white rounded-full",
                      },
                      "Limited to ",
                      event.capacity,
                      " Visitors",
                    ),
                  (event.venue_name?.toLowerCase().includes("outdoor") ||
                    event.venue_name?.toLowerCase().includes("garden") ||
                    event.venue_name?.toLowerCase().includes("beach") ||
                    event.venue_name?.toLowerCase().includes("park")) &&
                    /*#__PURE__*/ React.createElement(
                      "span",
                      {
                        className:
                          "inline-flex items-center px-2.5 py-1 text-[10px] xs:text-xs font-medium border border-gray-300 text-gray-700 rounded-full",
                      },
                      "Outdoor Scene",
                    ),
                  event.ticket_price === 0 &&
                    /*#__PURE__*/ React.createElement(
                      "span",
                      {
                        className:
                          "inline-flex items-center px-2.5 py-1 text-[10px] xs:text-xs font-medium bg-green-100 text-green-700 rounded-full",
                      },
                      "Free Entry",
                    ),
                  fillPercentage >= 70 &&
                    fillPercentage < 100 &&
                    /*#__PURE__*/ React.createElement(
                      "span",
                      {
                        className:
                          "inline-flex items-center px-2.5 py-1 text-[10px] xs:text-xs font-medium border border-orange-300 text-orange-700 rounded-full",
                      },
                      "Filling Fast",
                    ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "flex flex-col xs:flex-row xs:items-center gap-3 xs:gap-4 sm:gap-6 pl-0 xs:pl-0 md:pl-13",
                  },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "flex items-center gap-2",
                    },
                    /*#__PURE__*/ React.createElement(
                      "span",
                      {
                        className: "text-xs xs:text-sm text-gray-500",
                      },
                      "Price:",
                    ),
                    /*#__PURE__*/ React.createElement(
                      "span",
                      {
                        className:
                          "text-base xs:text-lg font-bold text-gray-900",
                      },
                      event.ticket_price === 0
                        ? /*#__PURE__*/ React.createElement(
                            "span",
                            {
                              className: "text-green-600",
                            },
                            "FREE",
                          )
                        : `₹${event.ticket_price.toLocaleString("en-IN")}`,
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "flex-1 flex items-center gap-2 xs:gap-3",
                    },
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className:
                          "flex-1 h-1 xs:h-1.5 bg-gray-100 rounded-full overflow-hidden",
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
                          delay: index * 0.04 + 0.2,
                          ease: [0.25, 0.1, 0.25, 1],
                        },
                        className: cn(
                          "h-full rounded-full",
                          isSoldOut ? "bg-gray-400" : "bg-gray-900",
                        ),
                      }),
                    ),
                    /*#__PURE__*/ React.createElement(
                      "span",
                      {
                        className:
                          "text-[10px] xs:text-xs font-medium text-gray-500 tabular-nums",
                      },
                      booked,
                      "/",
                      event.capacity,
                    ),
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "lg:w-48 flex lg:justify-end",
                },
                /*#__PURE__*/ React.createElement(
                  Button,
                  {
                    className: cn(
                      "w-full lg:w-auto px-6 xs:px-8 h-10 xs:h-12 rounded-full font-medium text-sm xs:text-base transition-colors",
                      isSoldOut
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : isBooked
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-gray-900 text-white hover:bg-gray-800",
                    ),
                    disabled: isSoldOut,
                    onClick: () =>
                      !isSoldOut && router.push(`/events/${event.event_id}`),
                  },
                  isSoldOut
                    ? /*#__PURE__*/ React.createElement(
                        "span",
                        null,
                        "Sold Out",
                      )
                    : isBooked
                      ? /*#__PURE__*/ React.createElement(
                          "span",
                          {
                            className: "flex items-center gap-2",
                          },
                          /*#__PURE__*/ React.createElement(CheckCircle2, {
                            className: "w-4 h-4",
                          }),
                          "View Booking",
                        )
                      : /*#__PURE__*/ React.createElement(
                          "span",
                          {
                            className: "flex items-center gap-2",
                          },
                          "Book Now",
                          /*#__PURE__*/ React.createElement(ArrowRight, {
                            className: "w-4 h-4",
                          }),
                        ),
                ),
              ),
            ),
            !isSoldOut &&
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "absolute top-4 right-4 xs:top-6 xs:right-6 sm:top-8 sm:right-8 flex items-center gap-1.5 xs:gap-2",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "relative",
                  },
                  /*#__PURE__*/ React.createElement(Circle, {
                    className:
                      "w-1.5 h-1.5 xs:w-2 xs:h-2 fill-green-500 text-green-500",
                  }),
                  /*#__PURE__*/ React.createElement(Circle, {
                    className:
                      "w-1.5 h-1.5 xs:w-2 xs:h-2 fill-green-500 text-green-500 absolute inset-0 animate-ping opacity-75",
                  }),
                ),
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className:
                      "text-[10px] xs:text-xs font-medium text-green-600 hidden xs:inline",
                  },
                  "Available",
                ),
              ),
          );
        }),
      ),
      filteredEvents.length === 0 &&
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "text-center py-16 xs:py-20",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 xs:mb-4",
            },
            /*#__PURE__*/ React.createElement(Calendar, {
              className: "w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 text-gray-400",
            }),
          ),
          /*#__PURE__*/ React.createElement(
            "h3",
            {
              className: "text-lg xs:text-xl font-bold text-gray-900 mb-2",
            },
            "No events in ",
            selectedCity,
          ),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-sm xs:text-base text-gray-600 mb-4 xs:mb-6",
            },
            "Try selecting a different city",
          ),
          /*#__PURE__*/ React.createElement(
            Button,
            {
              onClick: () => setSelectedCity("All"),
              variant: "outline",
              className: "rounded-full text-sm xs:text-base",
            },
            "View All Events",
          ),
        ),
    ),
  );
}
