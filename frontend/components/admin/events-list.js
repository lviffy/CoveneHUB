"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/convene/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MapPin,
  Users,
  Eye,
  Edit,
  Trash2,
  Download,
  FileText,
  RefreshCw,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import {
  downloadCSV,
  formatBookingsForCSV,
  formatCheckInsForCSV,
  generateCSVFilename,
} from "@/lib/csv-export";
import { extractUploadPath } from "@/lib/storage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EventNotesModal from "./event-notes-modal";
export default function EventsList() {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportingEvent, setExportingEvent] = useState(null);
  const [selectedEventNotes, setSelectedEventNotes] = useState(null);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();
  useEffect(() => {
    fetchEvents();
  }, []);
  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", {
          ascending: false,
        });
      if (error) {
        throw error;
      }

      // Calculate REAL remaining count for each event from actual bookings (same as movie team dashboard)
      const eventsWithRealCount = await Promise.all(
        (data || []).map(async (event) => {
          // Get all tickets from confirmed bookings
          const { data: bookings } = await supabase
            .from("bookings")
            .select("tickets_count")
            .eq("event_id", event.event_id)
            .neq("booking_status", "cancelled");

          // Sum up all tickets
          const totalTickets =
            bookings?.reduce(
              (sum, booking) => sum + (booking.tickets_count || 1),
              0,
            ) ?? 0;
          const calculatedRemaining = event.capacity - totalTickets;
          return {
            ...event,
            remaining: calculatedRemaining,
            notes: event.notes || "", // Include notes field
          };
        }),
      );
      setEvents(eventsWithRealCount);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: {
        label: "Draft",
        variant: "secondary",
      },
      published: {
        label: "Published",
        variant: "default",
      },
      checkin_open: {
        label: "Check-in Open",
        variant: "default",
      },
      in_progress: {
        label: "In Progress",
        variant: "default",
      },
      ended: {
        label: "Ended",
        variant: "outline",
      },
    };
    const config = statusConfig[status];
    return /*#__PURE__*/ React.createElement(
      Badge,
      {
        variant: config.variant,
      },
      config.label,
    );
  };
  const handleView = (eventId) => {
    // Navigate to event detail page
    router.push(`/events/${eventId}`);
  };
  const handleEdit = (eventId) => {
    // Navigate to edit page
    router.push(`/admin/events/edit?id=${eventId}`);
  };
  const handleDeleteClick = (event) => {
    setEventToDelete(event);
  };
  const handleExportBookings = async (eventId, eventTitle) => {
    try {
      setExportingEvent(`${eventId}-bookings`);
      const response = await fetch(
        `/api/admin/events/${eventId}/export-bookings`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to export bookings");
      }

      // Generate CSV
      const csvContent = formatBookingsForCSV(data.bookings);
      const filename = generateCSVFilename(eventTitle, "bookings");

      // Download
      downloadCSV(csvContent, filename);
      toast({
        title: "Export successful",
        description: `Downloaded ${data.bookings.length} bookings`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export bookings",
        variant: "destructive",
      });
    } finally {
      setExportingEvent(null);
    }
  };
  const handleExportCheckIns = async (eventId, eventTitle) => {
    try {
      setExportingEvent(`${eventId}-checkins`);
      const response = await fetch(
        `/api/admin/events/${eventId}/export-checkins`,
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to export check-ins");
      }
      if (data.checkIns.length === 0) {
        toast({
          title: "No check-ins",
          description: "This event has no check-ins yet",
          variant: "destructive",
        });
        return;
      }

      // Generate CSV
      const csvContent = formatCheckInsForCSV(data.checkIns);
      const filename = generateCSVFilename(eventTitle, "checkins");

      // Download
      downloadCSV(csvContent, filename);
      toast({
        title: "Export successful",
        description: `Downloaded ${data.checkIns.length} check-ins`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export check-ins",
        variant: "destructive",
      });
    } finally {
      setExportingEvent(null);
    }
  };
  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;
    setIsDeleting(true);
    try {
      // Delete image from storage if it exists
      if (eventToDelete.event_image) {
        try {
          const filePath = extractUploadPath(eventToDelete.event_image);
          if (filePath) {
            // Delete from storage
            const { data, error: storageError } = await supabase.storage
              .from("events")
              .remove([filePath]);
            if (storageError) {
              // Don't throw - still proceed with event deletion
            } else {
            }
          }
        } catch (urlError) {
          // Continue with event deletion even if image deletion fails
        }
      }

      // Delete the event from database
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("event_id", eventToDelete.event_id);
      if (error) throw error;
      toast({
        title: "Event deleted",
        description: `"${eventToDelete.title}" has been deleted successfully.`,
      });

      // Refresh events list
      fetchEvents();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete event",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setEventToDelete(null);
    }
  };
  if (isLoading) {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "flex items-center justify-center py-12",
      },
      /*#__PURE__*/ React.createElement(Spinner, {
        className: "h-8 w-8 text-[#195ADC]",
      }),
    );
  }
  if (events.length === 0) {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "text-center py-12",
      },
      /*#__PURE__*/ React.createElement(Calendar, {
        className: "h-12 w-12 mx-auto mb-4 text-slate-400",
      }),
      /*#__PURE__*/ React.createElement(
        "h3",
        {
          className: "text-lg font-semibold text-slate-700 mb-2",
        },
        "No events yet",
      ),
      /*#__PURE__*/ React.createElement(
        "p",
        {
          className: "text-slate-500",
        },
        "Create your first event to get started",
      ),
    );
  }
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className: "space-y-4",
    },
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "flex justify-between items-center",
      },
      /*#__PURE__*/ React.createElement(
        "p",
        {
          className: "text-sm text-slate-600",
        },
        events.length,
        " ",
        events.length === 1 ? "event" : "events",
        " total",
      ),
      /*#__PURE__*/ React.createElement(
        Button,
        {
          variant: "outline",
          size: "sm",
          onClick: fetchEvents,
          disabled: isLoading,
          className: "gap-2",
        },
        /*#__PURE__*/ React.createElement(RefreshCw, {
          className: `h-4 w-4 ${isLoading ? "animate-spin" : ""}`,
        }),
        "Refresh",
      ),
    ),
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "rounded-md border overflow-hidden",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "overflow-x-auto",
        },
        /*#__PURE__*/ React.createElement(
          Table,
          {
            className: "min-w-[800px]",
          },
          /*#__PURE__*/ React.createElement(
            TableHeader,
            null,
            /*#__PURE__*/ React.createElement(
              TableRow,
              null,
              /*#__PURE__*/ React.createElement(
                TableHead,
                {
                  className: "min-w-[180px]",
                },
                "Event",
              ),
              /*#__PURE__*/ React.createElement(
                TableHead,
                {
                  className: "min-w-[80px]",
                },
                "City",
              ),
              /*#__PURE__*/ React.createElement(
                TableHead,
                {
                  className: "min-w-[120px]",
                },
                "Date & Time",
              ),
              /*#__PURE__*/ React.createElement(
                TableHead,
                {
                  className: "min-w-[90px]",
                },
                "Capacity",
              ),
              /*#__PURE__*/ React.createElement(
                TableHead,
                {
                  className: "min-w-[80px]",
                },
                "Price",
              ),
              /*#__PURE__*/ React.createElement(
                TableHead,
                {
                  className: "min-w-[100px]",
                },
                "Status",
              ),
              /*#__PURE__*/ React.createElement(
                TableHead,
                {
                  className: "text-right min-w-[150px]",
                },
                "Actions",
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            TableBody,
            null,
            events.map((event) =>
              /*#__PURE__*/ React.createElement(
                TableRow,
                {
                  key: event.event_id,
                },
                /*#__PURE__*/ React.createElement(
                  TableCell,
                  null,
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "space-y-1",
                    },
                    /*#__PURE__*/ React.createElement(
                      "p",
                      {
                        className: "font-medium",
                      },
                      event.title,
                    ),
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className:
                          "flex items-center gap-1 text-xs text-slate-500",
                      },
                      /*#__PURE__*/ React.createElement(MapPin, {
                        className: "h-3 w-3",
                      }),
                      event.venue_name,
                    ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  TableCell,
                  null,
                  /*#__PURE__*/ React.createElement(
                    Badge,
                    {
                      variant: "outline",
                    },
                    event.city,
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  TableCell,
                  null,
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "text-sm",
                    },
                    format(new Date(event.date_time), "MMM dd, yyyy"),
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "text-xs text-slate-500",
                      },
                      format(new Date(event.date_time), "hh:mm a"),
                    ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  TableCell,
                  null,
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "flex items-center gap-2",
                    },
                    /*#__PURE__*/ React.createElement(Users, {
                      className: "h-4 w-4 text-slate-400",
                    }),
                    /*#__PURE__*/ React.createElement(
                      "span",
                      {
                        className: "text-sm",
                      },
                      event.remaining,
                      "/",
                      event.capacity,
                    ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  TableCell,
                  null,
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "text-sm font-medium",
                    },
                    event.ticket_price === 0
                      ? /*#__PURE__*/ React.createElement(
                          "span",
                          {
                            className: "text-green-600",
                          },
                          "FREE",
                        )
                      : /*#__PURE__*/ React.createElement(
                          "span",
                          null,
                          "\u20B9",
                          event.ticket_price.toLocaleString("en-IN"),
                        ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  TableCell,
                  null,
                  getStatusBadge(event.status),
                ),
                /*#__PURE__*/ React.createElement(
                  TableCell,
                  {
                    className: "text-right",
                  },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "flex justify-end gap-2",
                    },
                    /*#__PURE__*/ React.createElement(
                      Button,
                      {
                        variant: "ghost",
                        size: "sm",
                        onClick: () =>
                          setSelectedEventNotes({
                            title: event.title,
                            notes: event.notes || "",
                          }),
                        title: "View notes",
                        className:
                          event.notes && event.notes.trim() !== ""
                            ? "text-blue-600 hover:text-blue-700"
                            : "",
                      },
                      /*#__PURE__*/ React.createElement(FileText, {
                        className: "h-4 w-4",
                      }),
                      event.notes &&
                        event.notes.trim() !== "" &&
                        /*#__PURE__*/ React.createElement(
                          "span",
                          {
                            className: "ml-1 text-xs",
                          },
                          "\u2022",
                        ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      Button,
                      {
                        variant: "ghost",
                        size: "sm",
                        onClick: () => handleView(event.event_id),
                        title: "View event",
                      },
                      /*#__PURE__*/ React.createElement(Eye, {
                        className: "h-4 w-4",
                      }),
                    ),
                    /*#__PURE__*/ React.createElement(
                      Button,
                      {
                        variant: "ghost",
                        size: "sm",
                        onClick: () => handleEdit(event.event_id),
                        title: "Edit event",
                      },
                      /*#__PURE__*/ React.createElement(Edit, {
                        className: "h-4 w-4",
                      }),
                    ),
                    /*#__PURE__*/ React.createElement(
                      DropdownMenu,
                      null,
                      /*#__PURE__*/ React.createElement(
                        DropdownMenuTrigger,
                        {
                          asChild: true,
                        },
                        /*#__PURE__*/ React.createElement(
                          Button,
                          {
                            variant: "ghost",
                            size: "sm",
                            disabled:
                              exportingEvent === `${event.event_id}-bookings` ||
                              exportingEvent === `${event.event_id}-checkins`,
                            title: "Export data",
                          },
                          exportingEvent === `${event.event_id}-bookings` ||
                            exportingEvent === `${event.event_id}-checkins`
                            ? /*#__PURE__*/ React.createElement(Spinner, {
                                className: "h-4 w-4",
                              })
                            : /*#__PURE__*/ React.createElement(Download, {
                                className: "h-4 w-4",
                              }),
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        DropdownMenuContent,
                        {
                          align: "end",
                        },
                        /*#__PURE__*/ React.createElement(
                          DropdownMenuItem,
                          {
                            onClick: () =>
                              handleExportBookings(event.event_id, event.title),
                            disabled: exportingEvent !== null,
                          },
                          /*#__PURE__*/ React.createElement(Download, {
                            className: "h-4 w-4 mr-2",
                          }),
                          "Export All Bookings",
                        ),
                        /*#__PURE__*/ React.createElement(
                          DropdownMenuItem,
                          {
                            onClick: () =>
                              handleExportCheckIns(event.event_id, event.title),
                            disabled: exportingEvent !== null,
                          },
                          /*#__PURE__*/ React.createElement(Download, {
                            className: "h-4 w-4 mr-2",
                          }),
                          "Export Check-ins",
                        ),
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      Button,
                      {
                        variant: "ghost",
                        size: "sm",
                        className: "text-red-600 hover:text-red-700",
                        onClick: () => handleDeleteClick(event),
                        title: "Delete event",
                      },
                      /*#__PURE__*/ React.createElement(Trash2, {
                        className: "h-4 w-4",
                      }),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
    /*#__PURE__*/ React.createElement(
      AlertDialog,
      {
        open: !!eventToDelete,
        onOpenChange: () => setEventToDelete(null),
      },
      /*#__PURE__*/ React.createElement(
        AlertDialogContent,
        null,
        /*#__PURE__*/ React.createElement(
          AlertDialogHeader,
          null,
          /*#__PURE__*/ React.createElement(
            AlertDialogTitle,
            null,
            "Are you sure?",
          ),
          /*#__PURE__*/ React.createElement(
            AlertDialogDescription,
            null,
            'This will permanently delete the event "',
            eventToDelete?.title,
            '". This action cannot be undone. All bookings and check-ins related to this event will also be deleted.',
          ),
        ),
        /*#__PURE__*/ React.createElement(
          AlertDialogFooter,
          null,
          /*#__PURE__*/ React.createElement(
            AlertDialogCancel,
            {
              disabled: isDeleting,
            },
            "Cancel",
          ),
          /*#__PURE__*/ React.createElement(
            AlertDialogAction,
            {
              onClick: handleDeleteConfirm,
              disabled: isDeleting,
              className: "bg-red-600 hover:bg-red-700",
            },
            isDeleting ? "Deleting..." : "Delete Event",
          ),
        ),
      ),
    ),
    selectedEventNotes &&
      /*#__PURE__*/ React.createElement(EventNotesModal, {
        isOpen: true,
        onClose: () => setSelectedEventNotes(null),
        eventTitle: selectedEventNotes.title,
        notes: selectedEventNotes.notes,
      }),
  );
}
