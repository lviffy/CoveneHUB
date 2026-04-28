"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/convene/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import EditEventForm from "@/components/admin/edit-event-form";
function EditEventContent() {
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("id");
  const requestedReturnTo = searchParams.get("returnTo");
  const returnTo =
    requestedReturnTo && requestedReturnTo.startsWith("/")
      ? requestedReturnTo
      : "/admin";
  const requestedActorRole = searchParams.get("actorRole");
  const actorRole =
    requestedActorRole === "organizer" ? "organizer" : "admin_team";
  const isOrganizerFlow = returnTo.startsWith("/organizer");
  const { toast } = useToast();
  const supabase = createClient();
  useEffect(() => {
    if (!eventId) {
      toast({
        title: "Error",
        description: "No event ID provided",
        variant: "destructive",
      });
      router.push(returnTo);
      return;
    }
    fetchEvent();
  }, [eventId, returnTo]);
  const fetchEvent = async () => {
    if (!eventId) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("event_id", eventId)
        .single();
      if (error) throw error;
      if (!data) {
        toast({
          title: "Error",
          description: "Event not found",
          variant: "destructive",
        });
        router.push(returnTo);
        return;
      }
      setEvent(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load event",
        variant: "destructive",
      });
      router.push(returnTo);
    } finally {
      setIsLoading(false);
    }
  };
  if (isLoading) {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "flex items-center justify-center min-h-screen",
      },
      /*#__PURE__*/ React.createElement(Spinner, {
        className: "h-8 w-8 text-[#195ADC]",
      }),
    );
  }
  if (!event) {
    return null;
  }
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className: "min-h-screen bg-gray-50 py-8",
    },
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8",
      },
      /*#__PURE__*/ React.createElement(
        Button,
        {
          variant: "ghost",
          onClick: () => router.push(returnTo),
          className: "mb-6",
        },
        /*#__PURE__*/ React.createElement(ArrowLeft, {
          className: "h-4 w-4 mr-2",
        }),
        isOrganizerFlow ? "Back to Organizer Dashboard" : "Back to Dashboard",
      ),
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "bg-white rounded-lg shadow-sm p-6",
        },
        /*#__PURE__*/ React.createElement(
          "h1",
          {
            className: "text-2xl font-bold mb-6",
          },
          "Edit Event",
        ),
        /*#__PURE__*/ React.createElement(EditEventForm, {
          event: event,
          actorRole: actorRole,
          successRedirectPath: returnTo,
          cancelRedirectPath: returnTo,
        }),
      ),
    ),
  );
}
export default function EditEventPage() {
  return /*#__PURE__*/ React.createElement(
    Suspense,
    {
      fallback: /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "flex items-center justify-center min-h-screen",
        },
        /*#__PURE__*/ React.createElement(Spinner, {
          className: "h-8 w-8 text-[#195ADC]",
        }),
      ),
    },
    /*#__PURE__*/ React.createElement(EditEventContent, null),
  );
}
