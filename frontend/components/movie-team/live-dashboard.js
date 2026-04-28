"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  Play,
  Square,
  CheckCircle2,
  FileText,
  RefreshCw,
  User,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
export default function LiveDashboard({
  eventId,
  eventTitle,
  eventStatus,
  eventDateTime,
  capacity,
  onStatusChange,
}) {
  const [stats, setStats] = useState({
    totalBooked: 0,
    checkedIn: 0,
    remaining: capacity,
    percentageFilled: 0,
    percentageCheckedIn: 0,
  });
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [checkedInUsers, setCheckedInUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  useEffect(() => {
    fetchStats();
    fetchNotes();
    fetchCheckedInUsers();

    // Poll for updates every 3 seconds for real-time feel
    const interval = setInterval(() => {
      fetchStats();
      fetchCheckedInUsers();
    }, 3000);
    return () => clearInterval(interval);
  }, [eventId]);

  // Auto-open check-in when event time arrives
  useEffect(() => {
    const checkAndOpenCheckin = () => {
      const now = new Date();
      const eventTime = new Date(eventDateTime);

      // Auto-open check-in 30 minutes before event time
      const checkinOpenTime = new Date(eventTime.getTime() - 30 * 60 * 1000);

      // If current time >= checkin time and status is still published, auto-open check-in
      if (now >= checkinOpenTime && eventStatus === "published") {
        handleStatusChange("checkin_open");
      }

      // Auto-start event when actual event time arrives
      if (now >= eventTime && eventStatus === "checkin_open") {
        handleStatusChange("in_progress");
      }
    };

    // Check immediately
    checkAndOpenCheckin();

    // Then check every minute
    const interval = setInterval(checkAndOpenCheckin, 60000);
    return () => clearInterval(interval);
  }, [eventDateTime, eventStatus]);
  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/stats`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };
  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/notes`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || "");
      }
    } catch (error) {
      // Handle error silently
    }
  };
  const fetchCheckedInUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetch(
        `/api/organizer/events/${eventId}/checked-in-users`,
      );
      if (response.ok) {
        const data = await response.json();
        setCheckedInUsers(data.checkedInUsers || []);
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setLoadingUsers(false);
    }
  };
  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notes,
        }),
      });
      if (response.ok) {
        // Show success feedback
      }
    } catch (error) {
    } finally {
      setSavingNotes(false);
    }
  };
  const handleStatusChange = async (newStatus) => {
    setStatusChanging(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });
      if (response.ok && onStatusChange) {
        onStatusChange(newStatus);
      }
    } catch (error) {
    } finally {
      setStatusChanging(false);
    }
  };
  const getStatusConfig = (status) => {
    const configs = {
      draft: {
        label: "Draft",
        icon: /*#__PURE__*/ React.createElement(FileText, {
          className: "h-4 w-4",
        }),
      },
      published: {
        label: "Published",
        icon: /*#__PURE__*/ React.createElement(Clock, {
          className: "h-4 w-4",
        }),
      },
      checkin_open: {
        label: "Check-in Open",
        icon: /*#__PURE__*/ React.createElement(Play, {
          className: "h-4 w-4",
        }),
      },
      in_progress: {
        label: "In Progress",
        icon: /*#__PURE__*/ React.createElement(TrendingUp, {
          className: "h-4 w-4",
        }),
      },
      ended: {
        label: "Ended",
        icon: /*#__PURE__*/ React.createElement(Square, {
          className: "h-4 w-4",
        }),
      },
    };
    return configs[status] || configs.draft;
  };
  const statusConfig = getStatusConfig(eventStatus);
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className:
        "space-y-4 sm:space-y-6 p-3 sm:p-4 bg-white rounded-xl border border-gray-200 shadow-sm",
    },
    /*#__PURE__*/ React.createElement(
      Card,
      {
        className: "border-gray-200 shadow-sm rounded-xl overflow-hidden",
      },
      /*#__PURE__*/ React.createElement(
        CardHeader,
        {
          className: "bg-white border-b border-gray-200",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className:
              "flex flex-col sm:flex-row sm:items-center justify-between gap-3",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            null,
            /*#__PURE__*/ React.createElement(
              CardTitle,
              {
                className: "text-xl sm:text-2xl mb-2",
              },
              eventTitle,
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center gap-2 flex-wrap",
              },
              /*#__PURE__*/ React.createElement(
                Badge,
                {
                  variant: "outline",
                  className: "border-gray-300",
                },
                statusConfig.icon,
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "ml-1",
                  },
                  statusConfig.label,
                ),
              ),
              /*#__PURE__*/ React.createElement(
                Button,
                {
                  variant: "ghost",
                  size: "sm",
                  onClick: fetchStats,
                  className: "h-7 px-2",
                  disabled: loading,
                },
                /*#__PURE__*/ React.createElement(RefreshCw, {
                  className: cn("h-3.5 w-3.5", loading && "animate-spin"),
                }),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "flex flex-wrap gap-2",
            },
            eventStatus === "published" &&
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-50 rounded-lg border border-blue-200",
                },
                /*#__PURE__*/ React.createElement(Clock, {
                  className: "h-4 w-4 text-blue-600 flex-shrink-0",
                }),
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "text-xs sm:text-sm text-blue-700",
                  },
                  "Check-in opens 30 min before",
                ),
              ),
            eventStatus === "checkin_open" &&
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-50 rounded-lg border border-green-200",
                },
                /*#__PURE__*/ React.createElement(CheckCircle2, {
                  className: "h-4 w-4 text-green-600 flex-shrink-0",
                }),
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "text-xs sm:text-sm text-green-700",
                  },
                  "Check-in is now open",
                ),
              ),
            eventStatus === "in_progress" &&
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-50 rounded-lg border border-purple-200",
                },
                /*#__PURE__*/ React.createElement(TrendingUp, {
                  className: "h-4 w-4 text-purple-600 flex-shrink-0",
                }),
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "text-xs sm:text-sm text-purple-700",
                  },
                  "Event in progress",
                ),
              ),
            eventStatus === "ended" &&
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-50 rounded-lg border border-gray-200",
                },
                /*#__PURE__*/ React.createElement(CheckCircle2, {
                  className: "h-4 w-4 text-gray-600 flex-shrink-0",
                }),
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "text-xs sm:text-sm text-gray-700",
                  },
                  "Event ended",
                ),
              ),
          ),
        ),
      ),
    ),
    loading &&
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "text-center py-8",
        },
        /*#__PURE__*/ React.createElement(RefreshCw, {
          className: "h-8 w-8 animate-spin mx-auto text-gray-400 mb-2",
        }),
        /*#__PURE__*/ React.createElement(
          "p",
          {
            className: "text-gray-500",
          },
          "Loading statistics...",
        ),
      ),
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4",
      },
      /*#__PURE__*/ React.createElement(
        motion.div,
        {
          initial: {
            opacity: 0,
            y: 10,
          },
          animate: {
            opacity: 1,
            y: 0,
          },
          transition: {
            duration: 0.4,
            ease: "easeOut",
          },
        },
        /*#__PURE__*/ React.createElement(
          Card,
          {
            className: "border border-gray-200 bg-white",
          },
          /*#__PURE__*/ React.createElement(
            CardContent,
            {
              className: "p-4 sm:p-6",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center justify-between mb-2",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-100 flex items-center justify-center",
                },
                /*#__PURE__*/ React.createElement(Users, {
                  className: "h-4 w-4 sm:h-5 sm:w-5 text-gray-700",
                }),
              ),
              /*#__PURE__*/ React.createElement(
                Badge,
                {
                  variant: "secondary",
                  className: "text-xs bg-gray-100 text-gray-700",
                },
                stats.percentageFilled.toFixed(0),
                "%",
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              null,
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-xs sm:text-sm text-gray-600 mb-1",
                },
                "Total Booked",
              ),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-2xl sm:text-3xl font-bold text-gray-900",
                },
                stats.totalBooked,
              ),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-xs text-gray-500 mt-1",
                },
                "of ",
                capacity,
                " capacity",
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
            y: 10,
          },
          animate: {
            opacity: 1,
            y: 0,
          },
          transition: {
            duration: 0.4,
            ease: "easeOut",
          },
        },
        /*#__PURE__*/ React.createElement(
          Card,
          {
            className: "border border-gray-200 bg-white",
          },
          /*#__PURE__*/ React.createElement(
            CardContent,
            {
              className: "p-4 sm:p-6",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center justify-between mb-2",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-100 flex items-center justify-center",
                },
                /*#__PURE__*/ React.createElement(UserCheck, {
                  className: "h-4 w-4 sm:h-5 sm:w-5 text-gray-700",
                }),
              ),
              /*#__PURE__*/ React.createElement(
                Badge,
                {
                  variant: "secondary",
                  className: "text-xs bg-gray-100 text-gray-700",
                },
                stats.percentageCheckedIn.toFixed(0),
                "%",
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              null,
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-xs sm:text-sm text-gray-600 mb-1",
                },
                "Checked In",
              ),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-2xl sm:text-3xl font-bold text-gray-900",
                },
                stats.checkedIn,
              ),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-xs text-gray-500 mt-1",
                },
                "of ",
                stats.totalBooked,
                " booked",
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
            y: 10,
          },
          animate: {
            opacity: 1,
            y: 0,
          },
          transition: {
            duration: 0.4,
            ease: "easeOut",
          },
        },
        /*#__PURE__*/ React.createElement(
          Card,
          {
            className: "border border-gray-200 bg-white",
          },
          /*#__PURE__*/ React.createElement(
            CardContent,
            {
              className: "p-4 sm:p-6",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center justify-between mb-2",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-100 flex items-center justify-center",
                },
                /*#__PURE__*/ React.createElement(Clock, {
                  className: "h-4 w-4 sm:h-5 sm:w-5 text-gray-700",
                }),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              null,
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-xs sm:text-sm text-gray-600 mb-1",
                },
                "Remaining Slots",
              ),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-2xl sm:text-3xl font-bold text-gray-900",
                },
                stats.remaining,
              ),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-xs text-gray-500 mt-1",
                },
                "available spots",
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
            y: 10,
          },
          animate: {
            opacity: 1,
            y: 0,
          },
          transition: {
            duration: 0.4,
            ease: "easeOut",
          },
        },
        /*#__PURE__*/ React.createElement(
          Card,
          {
            className: "border border-gray-200 bg-white",
          },
          /*#__PURE__*/ React.createElement(
            CardContent,
            {
              className: "p-4 sm:p-6",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center justify-between mb-2",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-100 flex items-center justify-center",
                },
                /*#__PURE__*/ React.createElement(TrendingUp, {
                  className: "h-4 w-4 sm:h-5 sm:w-5 text-gray-700",
                }),
              ),
              /*#__PURE__*/ React.createElement(CheckCircle2, {
                className: "h-4 w-4 sm:h-5 sm:w-5 text-gray-700",
              }),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              null,
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-xs sm:text-sm text-gray-600 mb-1",
                },
                "Attendance Rate",
              ),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-2xl sm:text-3xl font-bold text-gray-900",
                },
                stats.totalBooked > 0
                  ? stats.percentageCheckedIn.toFixed(0)
                  : 0,
                "%",
              ),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-xs text-gray-500 mt-1",
                },
                "check-in completion",
              ),
            ),
          ),
        ),
      ),
    ),
    /*#__PURE__*/ React.createElement(
      Card,
      {
        className: "border-gray-200 shadow-sm",
      },
      /*#__PURE__*/ React.createElement(
        CardHeader,
        null,
        /*#__PURE__*/ React.createElement(
          CardTitle,
          {
            className: "text-lg",
          },
          "Event Progress",
        ),
      ),
      /*#__PURE__*/ React.createElement(
        CardContent,
        {
          className: "space-y-4",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          null,
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "flex items-center justify-between text-sm mb-2",
            },
            /*#__PURE__*/ React.createElement(
              "span",
              {
                className: "text-gray-600",
              },
              "Capacity Filled",
            ),
            /*#__PURE__*/ React.createElement(
              "span",
              {
                className: "font-medium",
              },
              stats.totalBooked,
              " / ",
              capacity,
            ),
          ),
          /*#__PURE__*/ React.createElement(Progress, {
            value: stats.percentageFilled,
            className: "h-2",
          }),
        ),
        /*#__PURE__*/ React.createElement(
          "div",
          null,
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "flex items-center justify-between text-sm mb-2",
            },
            /*#__PURE__*/ React.createElement(
              "span",
              {
                className: "text-gray-600",
              },
              "Check-in Progress",
            ),
            /*#__PURE__*/ React.createElement(
              "span",
              {
                className: "font-medium",
              },
              stats.checkedIn,
              " / ",
              stats.totalBooked,
            ),
          ),
          /*#__PURE__*/ React.createElement(Progress, {
            value: stats.percentageCheckedIn,
            className: "h-2 [&>div]:bg-green-500",
          }),
        ),
      ),
    ),
    /*#__PURE__*/ React.createElement(
      Card,
      {
        className: "border-gray-200 shadow-sm",
      },
      /*#__PURE__*/ React.createElement(
        CardHeader,
        {
          className: "border-b border-gray-100",
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
            /*#__PURE__*/ React.createElement(UserCheck, {
              className: "h-5 w-5 text-green-600",
            }),
            /*#__PURE__*/ React.createElement(
              "div",
              null,
              /*#__PURE__*/ React.createElement(
                CardTitle,
                {
                  className: "text-lg",
                },
                "Checked-In Attendees",
              ),
              /*#__PURE__*/ React.createElement(
                CardDescription,
                {
                  className: "mt-1",
                },
                checkedInUsers.length,
                " ",
                checkedInUsers.length === 1 ? "ticket has" : "tickets have",
                " been checked in",
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            Button,
            {
              variant: "ghost",
              size: "sm",
              onClick: fetchCheckedInUsers,
              disabled: loadingUsers,
            },
            /*#__PURE__*/ React.createElement(RefreshCw, {
              className: cn("h-4 w-4", loadingUsers && "animate-spin"),
            }),
          ),
        ),
      ),
      /*#__PURE__*/ React.createElement(
        CardContent,
        {
          className: "p-6",
        },
        loadingUsers && checkedInUsers.length === 0
          ? /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "text-center py-8",
              },
              /*#__PURE__*/ React.createElement(RefreshCw, {
                className: "h-8 w-8 animate-spin mx-auto text-gray-400 mb-2",
              }),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-gray-500",
                },
                "Loading checked-in users...",
              ),
            )
          : checkedInUsers.length === 0
            ? /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "text-center py-8",
                },
                /*#__PURE__*/ React.createElement(UserCheck, {
                  className: "h-12 w-12 text-gray-300 mx-auto mb-3",
                }),
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "text-gray-500",
                  },
                  "No attendees have checked in yet",
                ),
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "text-sm text-gray-400 mt-1",
                  },
                  "Check-in data will appear here in real-time",
                ),
              )
            : /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "space-y-3 max-h-[500px] overflow-y-auto",
                },
                checkedInUsers.map((checkedIn) =>
                  /*#__PURE__*/ React.createElement(
                    motion.div,
                    {
                      key: checkedIn.ticketId,
                      initial: {
                        opacity: 0,
                        y: 10,
                      },
                      animate: {
                        opacity: 1,
                        y: 0,
                      },
                      className:
                        "p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all",
                    },
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className:
                          "flex flex-col sm:flex-row sm:items-start justify-between mb-3 gap-2 sm:gap-0",
                      },
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className:
                            "flex items-center gap-3 w-full sm:flex-1 min-w-0",
                        },
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className:
                              "h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0",
                          },
                          /*#__PURE__*/ React.createElement(User, {
                            className: "h-5 w-5 text-green-600",
                          }),
                        ),
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className: "min-w-0 flex-1",
                          },
                          /*#__PURE__*/ React.createElement(
                            "h4",
                            {
                              className: "font-semibold text-gray-900",
                            },
                            checkedIn.user.fullName,
                          ),
                          /*#__PURE__*/ React.createElement(
                            "p",
                            {
                              className: "text-xs text-gray-500 break-words",
                            },
                            "Ticket: ",
                            checkedIn.ticketCode,
                            " \u2022 Booking: ",
                            checkedIn.bookingCode,
                          ),
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className:
                            "flex flex-wrap items-center gap-2 flex-shrink-0 sm:ml-2 pl-[52px] sm:pl-0",
                        },
                        checkedIn.user.city &&
                          /*#__PURE__*/ React.createElement(
                            "div",
                            {
                              className:
                                "flex items-center gap-1 text-xs text-gray-600",
                            },
                            /*#__PURE__*/ React.createElement(MapPin, {
                              className: "h-3 w-3 text-gray-400",
                            }),
                            /*#__PURE__*/ React.createElement(
                              "span",
                              null,
                              checkedIn.user.city,
                            ),
                          ),
                        /*#__PURE__*/ React.createElement(
                          Badge,
                          {
                            variant: "outline",
                            className:
                              "border-green-200 bg-green-50 text-green-700 whitespace-nowrap",
                          },
                          /*#__PURE__*/ React.createElement(CheckCircle2, {
                            className: "h-3 w-3 mr-1",
                          }),
                          "Checked In",
                        ),
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className:
                          "flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 text-sm pl-[52px] sm:pl-0",
                      },
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "space-y-1 flex-1 min-w-0",
                        },
                        checkedIn.user.email &&
                          /*#__PURE__*/ React.createElement(
                            "div",
                            {
                              className:
                                "flex items-center gap-2 text-gray-600",
                            },
                            /*#__PURE__*/ React.createElement(Mail, {
                              className: "h-4 w-4 text-gray-400 flex-shrink-0",
                            }),
                            /*#__PURE__*/ React.createElement(
                              "span",
                              {
                                className: "truncate",
                              },
                              checkedIn.user.email,
                            ),
                          ),
                        checkedIn.user.phone &&
                          /*#__PURE__*/ React.createElement(
                            "div",
                            {
                              className:
                                "flex items-center gap-2 text-gray-600",
                            },
                            /*#__PURE__*/ React.createElement(Phone, {
                              className: "h-4 w-4 text-gray-400 flex-shrink-0",
                            }),
                            /*#__PURE__*/ React.createElement(
                              "span",
                              null,
                              checkedIn.user.phone,
                            ),
                          ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className:
                            "flex items-center gap-2 text-gray-600 flex-shrink-0",
                        },
                        /*#__PURE__*/ React.createElement(Clock, {
                          className: "h-4 w-4 text-gray-400",
                        }),
                        /*#__PURE__*/ React.createElement(
                          "span",
                          {
                            className:
                              "bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium",
                          },
                          new Date(checkedIn.checkedInAt).toLocaleString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          ),
                        ),
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className:
                          "mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500",
                      },
                      /*#__PURE__*/ React.createElement(
                        "span",
                        null,
                        "Checked in by: ",
                        /*#__PURE__*/ React.createElement(
                          "span",
                          {
                            className: "font-medium text-gray-700",
                          },
                          checkedIn.checkedInBy,
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "span",
                        null,
                        "Ticket #",
                        checkedIn.ticketNumber,
                        " of ",
                        checkedIn.ticketsCount,
                      ),
                    ),
                  ),
                ),
              ),
      ),
    ),
  );
}
