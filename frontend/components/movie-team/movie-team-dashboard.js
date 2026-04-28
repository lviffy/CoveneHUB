"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ScanLine,
  ClipboardList,
  BarChart3,
  Calendar,
  MapPin,
  Users,
  LogOut,
  Home,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/convene/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import CheckinModal from "./checkin-modal";
import LiveDashboard from "./live-dashboard";
import ProfileModal from "@/components/ui/profile-modal";
import { format } from "date-fns";
import { Sidebar, SidebarBody } from "@/components/ui/sidebar";
export default function MovieTeamDashboard({ profile, userEmail }) {
  const [activeTab, setActiveTab] = useState("events");
  const [hoveredTab, setHoveredTab] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [organizerEvents, setOrganizerEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [onGroundNotes, setOnGroundNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesError, setNotesError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  // Fetch organizer-owned events on component mount
  useEffect(() => {
    fetchOrganizerEvents();
  }, []);
  const fetchOrganizerEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/organizer/my-events");
      if (!response.ok) {
        throw new Error("Failed to fetch organizer events");
      }
      const data = await response.json();
      setOrganizerEvents(data.events || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out error:", error);
      window.location.href = "/";
    }
  };
  const handleSaveNotes = async () => {
    if (!selectedEvent) {
      alert("Please select an event first");
      return;
    }
    setSavingNotes(true);
    setNotesError("");
    setNotesSaved(false);
    try {
      const response = await fetch(
        `/api/organizer/events/${selectedEvent.event_id}/notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            notes: onGroundNotes,
          }),
        },
      );
      if (response.ok) {
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 3000); // Hide success message after 3s
      } else {
        const errorData = await response.json();
        setNotesError(errorData.error || "Failed to save notes");
      }
    } catch (error) {
      setNotesError("Failed to save notes. Please try again.");
    } finally {
      setSavingNotes(false);
    }
  };
  const handleOpenCheckin = (event) => {
    setSelectedEvent(event);
    setIsCheckinModalOpen(true);
  };

  // Check if check-in is available (status is checkin_open/in_progress, OR 30 minutes before event)
  const isCheckinAvailable = (dateTime, status) => {
    // If event is ended, check-in is not available
    if (status === "ended") return false;

    // If status is explicitly set to checkin_open or in_progress, allow check-in
    if (status === "checkin_open" || status === "in_progress") return true;

    // Otherwise, check if we're within 30 minutes of event time
    const now = new Date();
    const eventTime = new Date(dateTime);
    const checkinOpenTime = new Date(eventTime.getTime() - 30 * 60 * 1000); // 30 minutes before
    return now >= checkinOpenTime;
  };

  // Get time until check-in opens
  const getTimeUntilCheckin = (dateTime) => {
    const now = new Date();
    const eventTime = new Date(dateTime);
    const checkinOpenTime = new Date(eventTime.getTime() - 30 * 60 * 1000);
    const diffMinutes = Math.ceil(
      (checkinOpenTime.getTime() - now.getTime()) / 60000,
    );
    if (diffMinutes <= 0) return null;
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };
  const handleEventStatusChange = (eventId, newStatus) => {
    setOrganizerEvents((prev) =>
      prev.map((event) =>
        event.event_id === eventId
          ? {
              ...event,
              status: newStatus,
            }
          : event,
      ),
    );
  };
  const getStatusBadge = (status) => {
    const variants = {
      draft: {
        variant: "secondary",
        label: "Draft",
      },
      published: {
        variant: "default",
        label: "Published",
      },
      checkin_open: {
        variant: "default",
        label: "Check-in Open",
      },
      in_progress: {
        variant: "default",
        label: "In Progress",
      },
      ended: {
        variant: "outline",
        label: "Ended",
      },
    };
    const config = variants[status] || {
      variant: "default",
      label: status,
    };
    return /*#__PURE__*/ React.createElement(
      Badge,
      {
        variant: config.variant,
      },
      config.label,
    );
  };
  const sidebarLinks = [
    {
      label: "My Events",
      href: "#events",
      icon: /*#__PURE__*/ React.createElement(ClipboardList, {
        className:
          "text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0",
      }),
    },
    {
      label: "Notes",
      href: "#notes",
      icon: /*#__PURE__*/ React.createElement(StickyNote, {
        className:
          "text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0",
      }),
    },
    {
      label: "Home",
      href: "/",
      icon: /*#__PURE__*/ React.createElement(Home, {
        className:
          "text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0",
      }),
    },
  ];
  const handleNavigation = (href) => {
    if (href.startsWith("#")) {
      const tab = href.replace("#", "");
      setActiveTab(tab);
    } else {
      router.push(href);
    }
  };
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className:
        "flex flex-col md:flex-row w-full min-h-screen bg-white dark:bg-neutral-900",
    },
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "md:fixed md:top-0 md:left-0 md:h-screen md:z-40",
      },
      /*#__PURE__*/ React.createElement(
        Sidebar,
        {
          open: sidebarOpen,
          setOpen: setSidebarOpen,
        },
        /*#__PURE__*/ React.createElement(
          SidebarBody,
          {
            className: "justify-between gap-10",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "flex flex-col flex-1 overflow-y-auto overflow-x-hidden",
            },
            /*#__PURE__*/ React.createElement(
              motion.div,
              {
                initial: {
                  opacity: 0,
                },
                animate: {
                  opacity: 1,
                },
                className: "py-1 mb-4",
              },
              /*#__PURE__*/ React.createElement(
                Link,
                {
                  href: "/",
                  className:
                    "font-normal flex items-center text-sm text-black dark:text-white py-1 relative z-20",
                },
                /*#__PURE__*/ React.createElement(Logo, {
                  uniColor: true,
                }),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "mt-4 flex flex-col gap-1",
              },
              sidebarLinks.map((link, idx) =>
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    key: idx,
                    onClick: () => handleNavigation(link.href),
                    className: cn(
                      "cursor-pointer rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors",
                      activeTab === link.href.replace("#", "") &&
                        "bg-blue-50 dark:bg-blue-900/20",
                    ),
                  },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "flex items-center justify-start gap-3 px-3 py-2.5 group/sidebar",
                    },
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: cn(
                          "flex-shrink-0",
                          activeTab === link.href.replace("#", "") &&
                            "text-[#195ADC]",
                        ),
                      },
                      link.icon,
                    ),
                    /*#__PURE__*/ React.createElement(
                      motion.span,
                      {
                        initial: false,
                        animate: {
                          width: sidebarOpen ? "auto" : 0,
                          opacity: sidebarOpen ? 1 : 0,
                        },
                        transition: {
                          duration: 0.15,
                          ease: "easeInOut",
                        },
                        className: cn(
                          "text-sm font-medium overflow-hidden whitespace-nowrap",
                          activeTab === link.href.replace("#", "")
                            ? "text-[#195ADC] dark:text-blue-400"
                            : "text-neutral-700 dark:text-neutral-200",
                        ),
                      },
                      link.label,
                    ),
                  ),
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "border-t border-neutral-200 dark:border-neutral-700 pt-4",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                onClick: () => setIsProfileModalOpen(true),
                className: cn(
                  "flex items-center group/sidebar py-2 cursor-pointer rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors",
                  sidebarOpen ? "gap-3" : "justify-center",
                ),
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold transition-all duration-150",
                },
                profile.full_name.charAt(0).toUpperCase(),
              ),
              /*#__PURE__*/ React.createElement(
                motion.div,
                {
                  initial: false,
                  animate: {
                    width: sidebarOpen ? "auto" : 0,
                    opacity: sidebarOpen ? 1 : 0,
                  },
                  transition: {
                    duration: 0.15,
                    ease: "easeInOut",
                  },
                  className:
                    "text-neutral-700 dark:text-neutral-200 text-sm overflow-hidden whitespace-nowrap min-w-0 flex-1",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "font-medium truncate",
                  },
                  profile.full_name,
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "text-xs text-neutral-500 truncate",
                  },
                  profile.city,
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                onClick: handleSignOut,
                className:
                  "cursor-pointer rounded-lg px-3 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-1",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "flex items-center justify-start gap-3 group/sidebar",
                },
                /*#__PURE__*/ React.createElement(LogOut, {
                  className:
                    "text-neutral-700 dark:text-neutral-200 group-hover/sidebar:text-red-600 h-5 w-5 flex-shrink-0 transition-colors duration-200",
                }),
                /*#__PURE__*/ React.createElement(
                  motion.span,
                  {
                    initial: false,
                    animate: {
                      width: sidebarOpen ? "auto" : 0,
                      opacity: sidebarOpen ? 1 : 0,
                    },
                    transition: {
                      duration: 0.15,
                      ease: "easeInOut",
                    },
                    className:
                      "text-neutral-700 dark:text-neutral-200 group-hover/sidebar:text-red-600 text-sm font-medium transition-colors overflow-hidden whitespace-nowrap",
                  },
                  "Logout",
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
        className: "flex-1 w-full overflow-auto md:ml-[70px]",
      },
      /*#__PURE__*/ React.createElement(
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
            className:
              "relative z-10 container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-7xl",
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
                delay: 0.2,
                duration: 0.5,
              },
              className: "mb-6 sm:mb-8",
            },
            /*#__PURE__*/ React.createElement(
              "h1",
              {
                className:
                  "text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2",
              },
              "Event Operations Dashboard",
            ),
            /*#__PURE__*/ React.createElement(
              "p",
              {
                className: "text-sm sm:text-base text-gray-600",
              },
              "Manage check-ins, live updates, and your events",
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
                delay: 0.3,
                duration: 0.5,
              },
              className: "mb-8",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "flex gap-1 sm:gap-2 p-1 bg-gray-100 rounded-lg w-full overflow-x-auto scrollbar-hide mb-6 sm:mb-8",
              },
              [
                {
                  value: "events",
                  label: "My Events",
                  shortLabel: "Events",
                  icon: ClipboardList,
                },
                {
                  value: "live-dash",
                  label: "Live Dashboard",
                  shortLabel: "Live",
                  icon: BarChart3,
                },
                {
                  value: "on-ground-notes",
                  label: "On Ground Notes",
                  shortLabel: "Notes",
                  icon: StickyNote,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.value;
                const isHovered = hoveredTab === tab.value;
                return /*#__PURE__*/ React.createElement(
                  "button",
                  {
                    key: tab.value,
                    onClick: () => setActiveTab(tab.value),
                    onMouseEnter: () => setHoveredTab(tab.value),
                    onMouseLeave: () => setHoveredTab(null),
                    className: cn(
                      "relative flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-300",
                      "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2",
                      isActive
                        ? "text-[#195ADC] bg-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900",
                    ),
                  },
                  /*#__PURE__*/ React.createElement(Icon, {
                    className: "h-4 w-4",
                  }),
                  /*#__PURE__*/ React.createElement(
                    "span",
                    {
                      className: "hidden sm:inline",
                    },
                    tab.label,
                  ),
                  /*#__PURE__*/ React.createElement(
                    "span",
                    {
                      className: "sm:hidden text-xs",
                    },
                    tab.shortLabel,
                  ),
                );
              }),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "space-y-6",
              },
              activeTab === "events" &&
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
                      duration: 0.4,
                    },
                  },
                  /*#__PURE__*/ React.createElement(
                    Card,
                    {
                      className: "border-gray-200 shadow-sm",
                    },
                    /*#__PURE__*/ React.createElement(
                      CardHeader,
                      {
                        className: "border-b border-gray-100 bg-gray-50/50",
                      },
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "flex items-center gap-2",
                        },
                        /*#__PURE__*/ React.createElement(ClipboardList, {
                          className: "h-5 w-5 text-[#195ADC]",
                        }),
                        /*#__PURE__*/ React.createElement(
                          "div",
                          null,
                          /*#__PURE__*/ React.createElement(
                            CardTitle,
                            {
                              className: "text-xl",
                            },
                            "My Events",
                          ),
                          /*#__PURE__*/ React.createElement(
                            CardDescription,
                            {
                              className: "mt-1",
                            },
                            "View and manage events created by you",
                          ),
                        ),
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      CardContent,
                      {
                        className: "p-6",
                      },
                      loading
                        ? /*#__PURE__*/ React.createElement(
                            "div",
                            {
                              className: "text-center py-16",
                            },
                            /*#__PURE__*/ React.createElement(Spinner, {
                              className: "h-8 w-8 text-[#195ADC] mx-auto mb-4",
                            }),
                            /*#__PURE__*/ React.createElement(
                              "p",
                              {
                                className: "text-gray-500",
                              },
                              "Loading your events...",
                            ),
                          )
                        : error
                          ? /*#__PURE__*/ React.createElement(
                              "div",
                              {
                                className: "text-center py-16",
                              },
                              /*#__PURE__*/ React.createElement(
                                "div",
                                {
                                  className:
                                    "inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4",
                                },
                                /*#__PURE__*/ React.createElement(
                                  "span",
                                  {
                                    className: "text-2xl",
                                  },
                                  "\u26A0\uFE0F",
                                ),
                              ),
                              /*#__PURE__*/ React.createElement(
                                "h3",
                                {
                                  className:
                                    "text-lg font-semibold text-gray-900 mb-2",
                                },
                                "Error Loading Events",
                              ),
                              /*#__PURE__*/ React.createElement(
                                "p",
                                {
                                  className:
                                    "text-gray-500 max-w-sm mx-auto mb-4",
                                },
                                error,
                              ),
                              /*#__PURE__*/ React.createElement(
                                Button,
                                {
                                  onClick: fetchOrganizerEvents,
                                  variant: "outline",
                                },
                                "Try Again",
                              ),
                            )
                          : organizerEvents.length === 0
                            ? /*#__PURE__*/ React.createElement(
                                "div",
                                {
                                  className: "text-center py-16",
                                },
                                /*#__PURE__*/ React.createElement(
                                  "div",
                                  {
                                    className:
                                      "inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#195ADC]/10 mb-4",
                                  },
                                  /*#__PURE__*/ React.createElement(
                                    ClipboardList,
                                    {
                                      className: "h-8 w-8 text-[#195ADC]",
                                    },
                                  ),
                                ),
                                /*#__PURE__*/ React.createElement(
                                  "h3",
                                  {
                                    className:
                                      "text-lg font-semibold text-gray-900 mb-2",
                                  },
                                  "No Events Yet",
                                ),
                                /*#__PURE__*/ React.createElement(
                                  "p",
                                  {
                                    className: "text-gray-500 max-w-sm mx-auto",
                                  },
                                  "You have not created any events yet. Once you create one, it will appear here.",
                                ),
                              )
                            : /*#__PURE__*/ React.createElement(
                                "div",
                                {
                                  className:
                                    "grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
                                },
                                organizerEvents.map((event) =>
                                  /*#__PURE__*/ React.createElement(
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
                                        duration: 0.2,
                                      },
                                    },
                                    /*#__PURE__*/ React.createElement(
                                      Card,
                                      {
                                        className: "h-full",
                                      },
                                      /*#__PURE__*/ React.createElement(
                                        CardHeader,
                                        {
                                          className: "pb-3",
                                        },
                                        /*#__PURE__*/ React.createElement(
                                          "div",
                                          {
                                            className:
                                              "flex items-start justify-between mb-2",
                                          },
                                          /*#__PURE__*/ React.createElement(
                                            CardTitle,
                                            {
                                              className: "text-lg line-clamp-2",
                                            },
                                            event.title,
                                          ),
                                          getStatusBadge(event.status),
                                        ),
                                        /*#__PURE__*/ React.createElement(
                                          CardDescription,
                                          {
                                            className: "line-clamp-2",
                                          },
                                          event.description,
                                        ),
                                      ),
                                      /*#__PURE__*/ React.createElement(
                                        CardContent,
                                        {
                                          className: "space-y-3",
                                        },
                                        /*#__PURE__*/ React.createElement(
                                          "div",
                                          {
                                            className:
                                              "flex items-start gap-2 text-sm",
                                          },
                                          /*#__PURE__*/ React.createElement(
                                            Calendar,
                                            {
                                              className:
                                                "h-4 w-4 text-[#195ADC] mt-0.5 flex-shrink-0",
                                            },
                                          ),
                                          /*#__PURE__*/ React.createElement(
                                            "span",
                                            {
                                              className: "text-gray-600",
                                            },
                                            format(
                                              new Date(event.date_time),
                                              "PPP p",
                                            ),
                                          ),
                                        ),
                                        /*#__PURE__*/ React.createElement(
                                          "div",
                                          {
                                            className:
                                              "flex items-start gap-2 text-sm",
                                          },
                                          /*#__PURE__*/ React.createElement(
                                            MapPin,
                                            {
                                              className:
                                                "h-4 w-4 text-[#195ADC] mt-0.5 flex-shrink-0",
                                            },
                                          ),
                                          /*#__PURE__*/ React.createElement(
                                            "div",
                                            {
                                              className: "text-gray-600",
                                            },
                                            /*#__PURE__*/ React.createElement(
                                              "div",
                                              {
                                                className: "font-medium",
                                              },
                                              event.venue_name,
                                            ),
                                            /*#__PURE__*/ React.createElement(
                                              "div",
                                              {
                                                className:
                                                  "text-xs text-gray-500",
                                              },
                                              event.city,
                                            ),
                                          ),
                                        ),
                                        /*#__PURE__*/ React.createElement(
                                          "div",
                                          {
                                            className:
                                              "flex items-center gap-2 text-sm",
                                          },
                                          /*#__PURE__*/ React.createElement(
                                            Users,
                                            {
                                              className:
                                                "h-4 w-4 text-[#195ADC] flex-shrink-0",
                                            },
                                          ),
                                          /*#__PURE__*/ React.createElement(
                                            "span",
                                            {
                                              className: "text-gray-600",
                                            },
                                            event.remaining,
                                            " / ",
                                            event.capacity,
                                            " spots available",
                                          ),
                                        ),
                                        /*#__PURE__*/ React.createElement(
                                          "div",
                                          {
                                            className:
                                              "pt-3 border-t border-gray-100",
                                          },
                                          /*#__PURE__*/ React.createElement(
                                            "p",
                                            {
                                              className:
                                                "text-xs text-gray-500",
                                            },
                                            "Created: ",
                                            format(
                                              new Date(event.assigned_at),
                                              "PPP",
                                            ),
                                          ),
                                        ),
                                        /*#__PURE__*/ React.createElement(
                                          "div",
                                          {
                                            className: "grid grid-cols-2 gap-2",
                                          },
                                          isCheckinAvailable(
                                            event.date_time,
                                            event.status,
                                          )
                                            ? /*#__PURE__*/ React.createElement(
                                                Button,
                                                {
                                                  className:
                                                    "bg-[#195ADC] hover:bg-[#195ADC]/90",
                                                  onClick: () =>
                                                    handleOpenCheckin(event),
                                                },
                                                /*#__PURE__*/ React.createElement(
                                                  ScanLine,
                                                  {
                                                    className: "mr-2 h-4 w-4",
                                                  },
                                                ),
                                                "Check-in",
                                              )
                                            : /*#__PURE__*/ React.createElement(
                                                "div",
                                                {
                                                  className: "relative group",
                                                },
                                                /*#__PURE__*/ React.createElement(
                                                  Button,
                                                  {
                                                    className:
                                                      "bg-gray-300 text-gray-500 cursor-not-allowed w-full",
                                                    disabled: true,
                                                  },
                                                  /*#__PURE__*/ React.createElement(
                                                    ScanLine,
                                                    {
                                                      className: "mr-2 h-4 w-4",
                                                    },
                                                  ),
                                                  "Check-in",
                                                ),
                                                /*#__PURE__*/ React.createElement(
                                                  "div",
                                                  {
                                                    className:
                                                      "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10",
                                                  },
                                                  event.status === "ended"
                                                    ? "Event has ended"
                                                    : `Opens in ${getTimeUntilCheckin(event.date_time)}`,
                                                  /*#__PURE__*/ React.createElement(
                                                    "div",
                                                    {
                                                      className:
                                                        "absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900",
                                                    },
                                                  ),
                                                ),
                                              ),
                                          /*#__PURE__*/ React.createElement(
                                            Button,
                                            {
                                              variant: "outline",
                                              onClick: () => {
                                                setSelectedEvent(event);
                                                setActiveTab("live-dash");
                                              },
                                            },
                                            "Live Stats",
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                    ),
                  ),
                ),
              activeTab === "live-dash" &&
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
                      duration: 0.4,
                    },
                  },
                  organizerEvents.length > 0
                    ? /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "space-y-6",
                        },
                        [...organizerEvents]
                          .sort(
                            (a, b) =>
                              new Date(b.date_time).getTime() -
                              new Date(a.date_time).getTime(),
                          )
                          .map((event) =>
                            /*#__PURE__*/ React.createElement(LiveDashboard, {
                              key: event.event_id,
                              eventId: event.event_id,
                              eventTitle: event.title,
                              eventStatus: event.status,
                              eventDateTime: event.date_time,
                              capacity: event.capacity,
                              onStatusChange: (newStatus) =>
                                handleEventStatusChange(
                                  event.event_id,
                                  newStatus,
                                ),
                            }),
                          ),
                      )
                    : /*#__PURE__*/ React.createElement(
                        Card,
                        {
                          className: "border-gray-200 shadow-sm",
                        },
                        /*#__PURE__*/ React.createElement(
                          CardContent,
                          {
                            className: "p-16 text-center",
                          },
                          /*#__PURE__*/ React.createElement(BarChart3, {
                            className: "h-16 w-16 text-gray-400 mx-auto mb-4",
                          }),
                          /*#__PURE__*/ React.createElement(
                            "h3",
                            {
                              className:
                                "text-lg font-semibold text-gray-900 mb-2",
                            },
                            "No Events",
                          ),
                          /*#__PURE__*/ React.createElement(
                            "p",
                            {
                              className: "text-gray-500 max-w-sm mx-auto mb-4",
                            },
                            "Create an event first to see live stats.",
                          ),
                          /*#__PURE__*/ React.createElement(
                            Button,
                            {
                              onClick: () => setActiveTab("events"),
                            },
                            "View My Events",
                          ),
                        ),
                      ),
                ),
              activeTab === "on-ground-notes" &&
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
                      duration: 0.4,
                    },
                  },
                  /*#__PURE__*/ React.createElement(
                    Card,
                    {
                      className: "border-gray-200 shadow-sm",
                    },
                    /*#__PURE__*/ React.createElement(
                      CardHeader,
                      {
                        className: "border-b border-gray-100 bg-gray-50/50",
                      },
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "flex items-center gap-2",
                        },
                        /*#__PURE__*/ React.createElement(StickyNote, {
                          className: "h-5 w-5 text-[#195ADC]",
                        }),
                        /*#__PURE__*/ React.createElement(
                          "div",
                          null,
                          /*#__PURE__*/ React.createElement(
                            CardTitle,
                            {
                              className: "text-xl",
                            },
                            "On-Ground Notes",
                          ),
                          /*#__PURE__*/ React.createElement(
                            CardDescription,
                            {
                              className: "mt-1",
                            },
                            "Add feedback, incident remarks, or important observations",
                          ),
                        ),
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      CardContent,
                      {
                        className: "p-6",
                      },
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "space-y-4",
                        },
                        /*#__PURE__*/ React.createElement(
                          "div",
                          null,
                          /*#__PURE__*/ React.createElement(
                            "label",
                            {
                              htmlFor: "event-select",
                              className:
                                "block text-sm font-semibold text-gray-800 mb-3",
                            },
                            "Select Event",
                          ),
                          /*#__PURE__*/ React.createElement(
                            "div",
                            {
                              className: "relative",
                            },
                            /*#__PURE__*/ React.createElement(
                              "select",
                              {
                                id: "event-select",
                                value: selectedEvent?.event_id || "",
                                onChange: async (e) => {
                                  const event = organizerEvents.find(
                                    (ev) => ev.event_id === e.target.value,
                                  );
                                  setSelectedEvent(event || null);
                                  // Load notes for selected event
                                  if (event) {
                                    try {
                                      const response = await fetch(
                                        `/api/organizer/events/${event.event_id}/notes`,
                                      );
                                      if (response.ok) {
                                        const data = await response.json();
                                        setOnGroundNotes(data.notes || "");
                                      }
                                    } catch (error) {}
                                  } else {
                                    setOnGroundNotes("");
                                  }
                                },
                                className:
                                  "w-full px-4 py-3.5 pr-10 text-sm sm:text-base border-2 border-gray-200 rounded-xl  bg-white hover:bg-gray-50 hover:border-[#195ADC]/50  focus:ring-4 focus:ring-[#195ADC]/20 focus:border-[#195ADC] focus:outline-none transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md appearance-none font-medium text-gray-700 truncate",
                              },
                              /*#__PURE__*/ React.createElement(
                                "option",
                                {
                                  value: "",
                                  className: "text-gray-500",
                                },
                                "-- Select an event --",
                              ),
                              organizerEvents.map((event) =>
                                /*#__PURE__*/ React.createElement(
                                  "option",
                                  {
                                    key: event.event_id,
                                    value: event.event_id,
                                    className: "text-gray-900 py-2",
                                  },
                                  event.title,
                                  " - ",
                                  format(
                                    new Date(event.date_time),
                                    "MMM d, yyyy",
                                  ),
                                ),
                              ),
                            ),
                            /*#__PURE__*/ React.createElement(
                              "div",
                              {
                                className:
                                  "absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none",
                              },
                              /*#__PURE__*/ React.createElement(
                                "svg",
                                {
                                  className: "w-5 h-5 text-gray-400",
                                  fill: "none",
                                  stroke: "currentColor",
                                  viewBox: "0 0 24 24",
                                },
                                /*#__PURE__*/ React.createElement("path", {
                                  strokeLinecap: "round",
                                  strokeLinejoin: "round",
                                  strokeWidth: 2.5,
                                  d: "M19 9l-7 7-7-7",
                                }),
                              ),
                            ),
                          ),
                        ),
                        selectedEvent &&
                          /*#__PURE__*/ React.createElement(
                            React.Fragment,
                            null,
                            /*#__PURE__*/ React.createElement(
                              "div",
                              null,
                              /*#__PURE__*/ React.createElement(
                                "label",
                                {
                                  htmlFor: "event-notes",
                                  className:
                                    "block text-sm font-medium text-gray-700 mb-2",
                                },
                                "Event Notes & Feedback",
                              ),
                              /*#__PURE__*/ React.createElement("textarea", {
                                id: "event-notes",
                                value: onGroundNotes,
                                onChange: (e) =>
                                  setOnGroundNotes(e.target.value),
                                placeholder:
                                  "Enter any observations, incidents, or feedback from the event...",
                                className:
                                  "w-full min-h-[200px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#195ADC] focus:border-transparent resize-vertical",
                              }),
                            ),
                            notesSaved &&
                              /*#__PURE__*/ React.createElement(
                                "div",
                                {
                                  className:
                                    "bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg",
                                },
                                "\u2713 Notes saved successfully!",
                              ),
                            notesError &&
                              /*#__PURE__*/ React.createElement(
                                "div",
                                {
                                  className:
                                    "bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg",
                                },
                                "\u2717 ",
                                notesError,
                              ),
                            /*#__PURE__*/ React.createElement(
                              Button,
                              {
                                onClick: handleSaveNotes,
                                disabled: savingNotes,
                                className:
                                  "bg-[#195ADC] hover:bg-[#1450c0] text-white",
                              },
                              /*#__PURE__*/ React.createElement(StickyNote, {
                                className: "mr-2 h-4 w-4",
                              }),
                              savingNotes ? "Saving..." : "Save Notes",
                            ),
                          ),
                        !selectedEvent &&
                          /*#__PURE__*/ React.createElement(
                            "div",
                            {
                              className: "text-center py-8 text-gray-500",
                            },
                            "Please select an event to add notes",
                          ),
                      ),
                    ),
                  ),
                ),
            ),
          ),
        ),
        selectedEvent &&
          /*#__PURE__*/ React.createElement(CheckinModal, {
            isOpen: isCheckinModalOpen,
            onClose: () => setIsCheckinModalOpen(false),
            eventId: selectedEvent.event_id,
            eventTitle: selectedEvent.title,
          }),
        /*#__PURE__*/ React.createElement(ProfileModal, {
          isOpen: isProfileModalOpen,
          onClose: () => setIsProfileModalOpen(false),
          userName: profile.full_name,
          userCity: profile.city,
          userEmail: userEmail,
          userPhone: profile.phone || "",
          userRole: profile.role,
          joinedDate: new Date(profile.created_at).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          }),
          accentColor: "#195ADC",
          onEditProfile: () => {
            // TODO: Implement edit profile functionality
          },
        }),
      ),
    ),
  );
}
