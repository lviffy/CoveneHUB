"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ArrowLeft,
  Shield,
  Film,
  CheckCircle2,
  Info,
  Ticket,
  AlertCircle,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { EventsHeader } from "@/components/events-header";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/convene/client";
import { Spinner } from "@/components/ui/spinner";
import { resolveAssetUrl } from "@/lib/storage";
import RazorpayCheckout from "@/components/payments/RazorpayCheckout";
const MAX_TICKETS_PER_USER = 10;
import Footer from "@/components/footer";
import dynamic from "next/dynamic";

// Dynamically import VenueMap to avoid SSR issues with Leaflet
const VenueMap = dynamic(
  () =>
    import("@/components/events/venue-map").then((mod) => ({
      default: mod.VenueMap,
    })),
  {
    ssr: false,
    loading: () =>
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className:
            "w-full h-[300px] bg-gray-100 rounded-xl flex items-center justify-center",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "text-center text-gray-500",
          },
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-sm",
            },
            "Loading map...",
          ),
        ),
      ),
  },
);
const REFERRAL_STORAGE_KEY = "convenehub_referral_last_click";
const REFERRAL_CODE_PATTERN = /^[A-Z0-9-]{5,32}$/;
export default function EventBookingPage({ eventId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  // Core state
  const [event, setEvent] = useState(null);
  const [existingBooking, setExistingBooking] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // Loading states
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState("");
  const [bookingCode, setBookingCode] = useState("");
  const [ticketsCount, setTicketsCount] = useState(1);
  const [selectedTierName, setSelectedTierName] = useState("");

  // Tickets state
  const [tickets, setTickets] = useState([]);
  const [selectedTicketForQR, setSelectedTicketForQR] = useState(null);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingQrTicketId, setLoadingQrTicketId] = useState(null);

  // T&C state
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPaymentConfirmModal, setShowPaymentConfirmModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [proceedToPayment, setProceedToPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [activeReferralCode, setActiveReferralCode] = useState(null);
  const persistReferralForEvent = useCallback(
    (code) => {
      if (typeof window === "undefined") return;
      const now = Date.now();
      const normalizedCode = code.toUpperCase();
      let store = {};
      try {
        const raw = localStorage.getItem(REFERRAL_STORAGE_KEY);
        store = raw ? JSON.parse(raw) : {};
      } catch {
        store = {};
      }
      store[eventId] = {
        code: normalizedCode,
        updatedAt: now,
      };
      localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(store));
      setActiveReferralCode(normalizedCode);
    },
    [eventId],
  );
  const loadStoredReferralForEvent = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(REFERRAL_STORAGE_KEY);
      if (!raw) return null;
      const store = JSON.parse(raw);
      const entry = store[eventId];
      if (!entry?.code) return null;
      const normalizedCode = String(entry.code).toUpperCase();
      if (!REFERRAL_CODE_PATTERN.test(normalizedCode)) return null;
      return normalizedCode;
    } catch {
      return null;
    }
  }, [eventId]);
  useEffect(() => {
    const refQuery = (searchParams.get("ref") || "").trim().toUpperCase();
    if (refQuery && REFERRAL_CODE_PATTERN.test(refQuery)) {
      persistReferralForEvent(refQuery);
      return;
    }
    const storedCode = loadStoredReferralForEvent();
    if (storedCode) {
      setActiveReferralCode(storedCode);
      return;
    }
    setActiveReferralCode(null);
  }, [loadStoredReferralForEvent, persistReferralForEvent, searchParams]);
  useEffect(() => {
    if (!activeReferralCode || !event) return;
    const clickTrackMarker = `convenehub_referral_click_tracked_${event.event_id}_${activeReferralCode}`;
    if (
      typeof window === "undefined" ||
      sessionStorage.getItem(clickTrackMarker)
    ) {
      return;
    }
    void fetch("/api/promoters/track-click", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventId: event.event_id,
        referralCode: activeReferralCode,
      }),
    }).finally(() => {
      sessionStorage.setItem(clickTrackMarker, "1");
    });
  }, [activeReferralCode, event]);

  // Fetch event data with real-time booking count using public API
  const fetchEventData = useCallback(async () => {
    try {
      // Use public API to get accurate booking count (bypasses RLS)
      // Add cache busting parameter to ensure fresh data
      const response = await fetch(`/api/events/public?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      if (!response.ok) {
        setEvent(null);
        return;
      }
      const { events: allEvents, timestamp } = await response.json();
      const normalizedEvents = (allEvents || []).map((entry) => ({
        ...entry,
        event_image: resolveAssetUrl(entry.event_image || ""),
      }));

      // Find the specific event
      const eventData = normalizedEvents.find((e) => e.event_id === eventId);
      if (!eventData) {
        setEvent(null);
        return;
      }

      // The API already calculated the remaining count
      const enhancedEvent = {
        ...eventData,
        actualRemaining: eventData.remaining,
        bookingCount: eventData.booked || 0,
      };
      setEvent(enhancedEvent);
    } catch (error) {
      setEvent(null);
    }
  }, [eventId]);

  // Fetch tickets for the booking
  const fetchTickets = useCallback(async (bookingId) => {
    if (!bookingId) return;
    try {
      setLoadingTickets(true);
      const response = await fetch(`/api/bookings/${bookingId}/tickets`);
      if (!response.ok) {
        throw new Error("Failed to fetch tickets");
      }
      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (error) {
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  // Check user's existing booking
  const checkUserBooking = useCallback(
    async (userId) => {
      try {
        const { data, error } = await supabase
          .from("bookings")
          .select(
            `
          booking_id,
          booking_code,
          booking_status,
          payment_status,
          tickets_count,
          total_amount,
          booked_at,
          checked_in,
          qr_nonce
        `,
          )
          .eq("event_id", eventId)
          .eq("user_id", userId)
          .neq("booking_status", "cancelled")
          .in("payment_status", ["NOT_REQUIRED", "SUCCESSFUL", "PAID"]) // Only show confirmed bookings
          .maybeSingle();
        if (error) {
        }

        // Only set as existing booking if payment was successful or not required
        const validBooking =
          data &&
          (data.payment_status === "NOT_REQUIRED" ||
            data.payment_status === "SUCCESSFUL" ||
            data.payment_status === "PAID");
        setExistingBooking(validBooking ? data : null);

        // Fetch tickets if valid booking exists
        if (validBooking && data && data.booking_id) {
          await fetchTickets(data.booking_id);
        }
      } catch (error) {
        setExistingBooking(null);
      }
    },
    [eventId, supabase, fetchTickets],
  );

  // Initialize all data
  const initializePageData = useCallback(async () => {
    try {
      setIsInitializing(true);

      // Get authenticated user
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) {
        // Handle error silently or with proper error handling
      }
      setUser(authUser);

      // Fetch user profile if authenticated
      if (authUser) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();
        if (profileData) {
          setProfile(profileData);
        }

        // Check existing booking
        await checkUserBooking(authUser.id);
      }

      // Fetch event data
      await fetchEventData();
    } catch (error) {
      // Handle error silently or with proper error handling
    } finally {
      setIsInitializing(false);
    }
  }, [supabase, fetchEventData, checkUserBooking]);

  // Initialize on mount
  useEffect(() => {
    initializePageData();
  }, [initializePageData]);
  useEffect(() => {
    if (!event) return;
    const tiers = (event.ticket_tiers || []).filter(
      (tier) => tier.remaining > 0,
    );
    if (tiers.length === 0) {
      setSelectedTierName("");
      return;
    }
    const hasSelectedTier = tiers.some(
      (tier) => tier.name === selectedTierName,
    );
    if (!hasSelectedTier) {
      setSelectedTierName(tiers[0].name);
    }
  }, [event, selectedTierName]);

  // Set up real-time subscription for booking changes
  useEffect(() => {
    const realtimeClient = supabase;
    const channel = realtimeClient
      .channel(`event-bookings-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          // Refresh event data when any booking changes
          fetchEventData();
        },
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [eventId, supabase, fetchEventData]);

  // Handle QR code display for individual ticket
  const handleShowTicketQR = async (ticket) => {
    setLoadingQrTicketId(ticket.ticket_id);
    try {
      const response = await fetch(`/api/tickets/${ticket.ticket_id}/qr`);
      if (!response.ok) {
        throw new Error("Failed to generate QR code");
      }
      const data = await response.json();
      setSelectedTicketForQR(ticket);
      setQrCodeData(data.qr_code);
      setShowQRModal(true);
    } catch (error) {
      alert("Failed to generate QR code. Please try again.");
    } finally {
      setLoadingQrTicketId(null);
    }
  };

  // Handle QR code display (legacy - for backward compatibility)
  const handleShowQR = async () => {
    if (!existingBooking) return;

    // If we have tickets, show the first ticket's QR
    if (tickets.length > 0) {
      handleShowTicketQR(tickets[0]);
      return;
    }
    try {
      const response = await fetch(
        `/api/bookings/${existingBooking.booking_id}/qr`,
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate QR code");
      }
      const data = await response.json();
      setQrCodeData(data.qr_code);
      setShowQRModal(true);
    } catch (error) {
      alert("Failed to generate QR code. Please try again.");
    }
  };

  // Handle booking submission
  const handleBooking = async () => {
    if (isSubmitting || !user || !event) return;

    // Check if user needs to login
    if (!user) {
      router.push(`/login?redirect=/events/${eventId}`);
      return;
    }

    // Check if profile is complete
    if (!profile?.full_name || !profile?.city) {
      router.push(`/complete-profile?redirect=/events/${eventId}`);
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: event.event_id,
          tierName: selectedTierName || undefined,
          tickets_count: ticketsCount,
          referralCode: activeReferralCode || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        // Handle "already booked" error specially
        if (response.status === 409 && data.existing_booking) {
          // User already has a booking - refresh to show it
          await fetchEventData();
          if (user) {
            await checkUserBooking(user.id);
          }
          if (data.existing_booking.can_add_more) {
            alert(
              `You already have a booking for this event with ${data.existing_booking.current_tickets} ticket(s). You can add up to ${data.existing_booking.max_additional_tickets} more tickets using the "Add More Tickets" section.`,
            );
          } else {
            alert(
              `You already have a booking for this event with the maximum of 10 tickets.`,
            );
          }
          return;
        }
        throw new Error(
          data.message || data.error || "Failed to create booking",
        );
      }

      // Success
      setBookingCode(data.booking.booking_code);
      setShowSuccessModal(true);

      // Refresh data immediately and wait for completion
      await fetchEventData();
      if (user) {
        await checkUserBooking(user.id);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Booking failed. Please try again.";
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  const availableTiers = (event?.ticket_tiers || []).filter(
    (tier) => tier.remaining > 0,
  );
  const selectedTier =
    availableTiers.find((tier) => tier.name === selectedTierName) ||
    availableTiers[0] ||
    null;
  const selectedTierPrice = selectedTier
    ? Number(selectedTier.price || 0)
    : Number(event?.ticket_price || 0);
  const maxTicketsForSelection = Math.max(
    1,
    Math.min(
      MAX_TICKETS_PER_USER,
      event?.actualRemaining || 0,
      selectedTier ? selectedTier.remaining : event?.actualRemaining || 0,
    ),
  );
  // Calculate final amount
  const originalAmount = selectedTierPrice * ticketsCount;
  const finalAmount = originalAmount;
  const isPaidBooking = finalAmount > 0;
  useEffect(() => {
    if (ticketsCount > maxTicketsForSelection) {
      setTicketsCount(maxTicketsForSelection);
    }
  }, [maxTicketsForSelection, ticketsCount]);

  // Loading state
  if (isInitializing) {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "min-h-screen flex items-center justify-center bg-gray-50",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "text-center",
        },
        /*#__PURE__*/ React.createElement(Spinner, {
          className: "w-16 h-16 text-[#195ADC] mx-auto mb-4",
        }),
        /*#__PURE__*/ React.createElement(
          "p",
          {
            className: "text-gray-600",
          },
          "Loading event details...",
        ),
      ),
    );
  }

  // Event not found
  if (!event) {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "min-h-screen flex items-center justify-center bg-gray-50",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "text-center max-w-md mx-auto px-6",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className:
              "w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4",
          },
          /*#__PURE__*/ React.createElement(AlertCircle, {
            className: "w-8 h-8 text-red-600",
          }),
        ),
        /*#__PURE__*/ React.createElement(
          "h1",
          {
            className: "text-2xl font-bold mb-4 text-gray-900",
          },
          "Event Not Found",
        ),
        /*#__PURE__*/ React.createElement(
          "p",
          {
            className: "text-gray-600 mb-6",
          },
          "The event you're looking for doesn't exist or has been removed.",
        ),
        /*#__PURE__*/ React.createElement(
          Button,
          {
            onClick: () => router.push("/events"),
            className: "rounded-full",
          },
          /*#__PURE__*/ React.createElement(ArrowLeft, {
            className: "w-4 h-4 mr-2",
          }),
          "Back to Events",
        ),
      ),
    );
  }

  // Event not available
  if (!["published", "checkin_open", "draft"].includes(event.status)) {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "min-h-screen flex items-center justify-center bg-gray-50",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "text-center max-w-md mx-auto px-6",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className:
              "w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4",
          },
          /*#__PURE__*/ React.createElement(AlertCircle, {
            className: "w-8 h-8 text-yellow-600",
          }),
        ),
        /*#__PURE__*/ React.createElement(
          "h1",
          {
            className: "text-2xl font-bold mb-4 text-gray-900",
          },
          "Event Not Available",
        ),
        /*#__PURE__*/ React.createElement(
          "p",
          {
            className: "text-gray-600 mb-6",
          },
          event.status === "in_progress"
            ? "This event is currently in progress and not accepting new bookings."
            : "This event has ended and is no longer available for booking.",
        ),
        /*#__PURE__*/ React.createElement(
          Button,
          {
            onClick: () => router.push("/events"),
            className: "rounded-full",
          },
          /*#__PURE__*/ React.createElement(ArrowLeft, {
            className: "w-4 h-4 mr-2",
          }),
          "Back to Events",
        ),
      ),
    );
  }

  // Calculate booking status
  const isSoldOut = event.actualRemaining === 0;
  const isBookingOpen =
    event.status === "published" || event.status === "checkin_open";
  const isEventVisible = ["published", "checkin_open"].includes(event.status);
  const hasAvailableTier = availableTiers.length > 0;
  const canBook =
    isBookingOpen &&
    !isSoldOut &&
    isEventVisible &&
    !existingBooking &&
    hasAvailableTier;
  const booked = event.bookingCount;
  const fillPercentage = (booked / event.capacity) * 100;
  const eventDate = new Date(event.date_time);
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className: "min-h-screen bg-gray-50",
    },
    /*#__PURE__*/ React.createElement(EventsHeader, null),
    showSuccessModal &&
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className:
            "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",
        },
        /*#__PURE__*/ React.createElement(
          motion.div,
          {
            initial: {
              opacity: 0,
              scale: 0.95,
            },
            animate: {
              opacity: 1,
              scale: 1,
            },
            className: "bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "text-center",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4",
              },
              /*#__PURE__*/ React.createElement(CheckCircle2, {
                className: "w-8 h-8 text-green-600",
              }),
            ),
            /*#__PURE__*/ React.createElement(
              "h2",
              {
                className: "text-2xl font-bold text-gray-900 mb-2",
              },
              "\uD83C\uDF89 Booking Confirmed!",
            ),
            /*#__PURE__*/ React.createElement(
              "p",
              {
                className: "text-gray-600 mb-6",
              },
              "Your ticket has been successfully booked",
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "bg-gray-50 rounded-xl p-4 mb-6",
              },
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-sm text-gray-600 mb-1",
                },
                "Booking Code",
              ),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className:
                    "text-2xl font-bold text-gray-900 font-mono tracking-wider",
                },
                bookingCode,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "space-y-2",
              },
              /*#__PURE__*/ React.createElement(
                Button,
                {
                  onClick: () => {
                    setShowSuccessModal(false);
                    router.push("/bookings");
                  },
                  className:
                    "w-full bg-gray-900 hover:bg-gray-800 text-white h-12 rounded-xl",
                },
                "View My Bookings",
              ),
              /*#__PURE__*/ React.createElement(
                Button,
                {
                  onClick: () => setShowSuccessModal(false),
                  variant: "outline",
                  className: "w-full h-12 rounded-xl",
                },
                "Stay on This Page",
              ),
            ),
          ),
        ),
      ),
    /*#__PURE__*/ React.createElement(
      "section",
      {
        className: "relative pt-20 pb-0 bg-gray-900 overflow-hidden",
      },
      event.event_image &&
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "absolute inset-0",
          },
          /*#__PURE__*/ React.createElement(Image, {
            src: event.event_image,
            alt: "",
            fill: true,
            priority: true,
            sizes: "100vw",
            className: "object-cover scale-110 blur-2xl opacity-30",
          }),
          /*#__PURE__*/ React.createElement("div", {
            className:
              "absolute inset-0 bg-gradient-to-b from-gray-900/60 via-gray-900/80 to-gray-900",
          }),
        ),
      !event.event_image &&
        /*#__PURE__*/ React.createElement("div", {
          className:
            "absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900",
        }),
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "relative mx-auto max-w-7xl px-4 md:px-6",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "pt-4 pb-6",
          },
          /*#__PURE__*/ React.createElement(
            Button,
            {
              variant: "ghost",
              onClick: () => router.push("/events"),
              className:
                "text-white/80 hover:text-white hover:bg-white/10 pl-0",
            },
            /*#__PURE__*/ React.createElement(ArrowLeft, {
              className: "w-4 h-4 mr-2",
            }),
            "Back to Events",
          ),
        ),
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "flex flex-col md:flex-row gap-8 pb-10",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "flex-1 flex flex-col justify-end pb-2",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center gap-2 flex-wrap mb-4",
              },
              /*#__PURE__*/ React.createElement(
                Badge,
                {
                  className: cn(
                    "text-xs font-semibold px-3 py-1",
                    event.status === "published"
                      ? "bg-green-500 hover:bg-green-600"
                      : event.status === "checkin_open"
                        ? "bg-blue-500 hover:bg-blue-600"
                        : event.status === "in_progress"
                          ? "bg-orange-500 hover:bg-orange-600"
                          : "bg-gray-500 hover:bg-gray-600",
                  ),
                },
                event.status.replace("_", " ").toUpperCase(),
              ),
              isSoldOut &&
                /*#__PURE__*/ React.createElement(
                  Badge,
                  {
                    variant: "destructive",
                    className: "text-xs font-semibold px-3 py-1",
                  },
                  "SOLD OUT",
                ),
              !isSoldOut &&
                event.actualRemaining <= 10 &&
                /*#__PURE__*/ React.createElement(
                  Badge,
                  {
                    className:
                      "bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1",
                  },
                  "ONLY ",
                  event.actualRemaining,
                  " LEFT",
                ),
            ),
            /*#__PURE__*/ React.createElement(
              "h1",
              {
                className:
                  "text-3xl md:text-5xl font-bold text-white mb-5 leading-tight",
              },
              event.title,
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "space-y-3",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex items-center gap-3 text-gray-200",
                },
                /*#__PURE__*/ React.createElement(Calendar, {
                  className: "w-5 h-5 text-gray-400 flex-shrink-0",
                }),
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "text-base",
                  },
                  eventDate.toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex items-center gap-3 text-gray-200",
                },
                /*#__PURE__*/ React.createElement(Clock, {
                  className: "w-5 h-5 text-gray-400 flex-shrink-0",
                }),
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "text-base",
                  },
                  eventDate.toLocaleTimeString("en-IN", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  }),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex items-center gap-3 text-gray-200",
                },
                /*#__PURE__*/ React.createElement(Users, {
                  className: "w-5 h-5 text-gray-400 flex-shrink-0",
                }),
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "text-base",
                  },
                  event.actualRemaining,
                  " of ",
                  event.capacity,
                  " slots available",
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex items-center gap-3 text-gray-200",
                },
                /*#__PURE__*/ React.createElement(MapPin, {
                  className: "w-5 h-5 text-gray-400 flex-shrink-0",
                }),
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "text-base",
                  },
                  event.venue_name,
                  ", ",
                  event.city,
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex items-center gap-3 text-gray-200",
                },
                /*#__PURE__*/ React.createElement(Film, {
                  className: "w-5 h-5 text-gray-400 flex-shrink-0",
                }),
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "text-base",
                  },
                  "Event Access Pass",
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "mt-6 max-w-md",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "flex items-center justify-between text-xs text-gray-400 mb-1.5",
                },
                /*#__PURE__*/ React.createElement(
                  "span",
                  null,
                  "Booking Progress",
                ),
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "font-medium",
                  },
                  Math.round(fillPercentage),
                  "% filled",
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "h-1.5 bg-white/10 rounded-full overflow-hidden",
                },
                /*#__PURE__*/ React.createElement(motion.div, {
                  initial: {
                    width: 0,
                  },
                  animate: {
                    width: `${fillPercentage}%`,
                  },
                  transition: {
                    duration: 1,
                    ease: "easeOut",
                  },
                  className: cn(
                    "h-full rounded-full",
                    fillPercentage >= 90
                      ? "bg-red-500"
                      : fillPercentage >= 70
                        ? "bg-orange-500"
                        : "bg-green-500",
                  ),
                }),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "flex-shrink-0 mx-auto md:mx-0 w-full md:w-[600px] order-first md:order-last",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "rounded-2xl overflow-hidden shadow-2xl bg-gray-800",
              },
              event.event_image
                ? /*#__PURE__*/ React.createElement(Image, {
                    src: event.event_image,
                    alt: event.title,
                    width: 600,
                    height: 340,
                    priority: true,
                    className: "w-full aspect-video object-cover",
                  })
                : /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "w-full aspect-video flex items-center justify-center bg-gray-700",
                    },
                    /*#__PURE__*/ React.createElement(Film, {
                      className: "w-16 h-16 text-gray-500",
                    }),
                  ),
            ),
          ),
        ),
      ),
    ),
    /*#__PURE__*/ React.createElement(
      "section",
      {
        className: "py-10 bg-gray-50",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "mx-auto max-w-7xl px-4 md:px-6",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "grid lg:grid-cols-3 gap-8",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "lg:col-span-2 space-y-6",
            },
            event.description &&
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
                  className:
                    "bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100",
                },
                /*#__PURE__*/ React.createElement(
                  "h2",
                  {
                    className: "text-xl font-bold text-gray-900 mb-4",
                  },
                  "About The Event",
                ),
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "text-gray-700 leading-relaxed",
                  },
                  event.description,
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
                  duration: 0.4,
                  delay: 0.05,
                },
                className:
                  "bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100",
              },
              /*#__PURE__*/ React.createElement(
                "h2",
                {
                  className:
                    "text-xl font-bold text-gray-900 mb-5 flex items-center gap-2",
                },
                /*#__PURE__*/ React.createElement(MapPin, {
                  className: "w-5 h-5 text-gray-500",
                }),
                "Venue Details",
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "space-y-3",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  null,
                  /*#__PURE__*/ React.createElement(
                    "p",
                    {
                      className:
                        "text-xs text-gray-400 uppercase tracking-wide mb-0.5",
                    },
                    "Location",
                  ),
                  /*#__PURE__*/ React.createElement(
                    "p",
                    {
                      className: "text-base font-semibold text-gray-900",
                    },
                    event.venue_name,
                  ),
                  /*#__PURE__*/ React.createElement(
                    "p",
                    {
                      className: "text-sm text-gray-500",
                    },
                    event.venue_address,
                  ),
                ),
                event.latitude &&
                  event.longitude &&
                  /*#__PURE__*/ React.createElement(
                    "div",
                    null,
                    /*#__PURE__*/ React.createElement(
                      "p",
                      {
                        className:
                          "text-xs text-gray-400 uppercase tracking-wide mb-0.5",
                      },
                      "Coordinates",
                    ),
                    /*#__PURE__*/ React.createElement(
                      "p",
                      {
                        className: "text-sm text-gray-500 font-mono",
                      },
                      event.latitude,
                      ", ",
                      event.longitude,
                    ),
                  ),
              ),
            ),
            event.entry_instructions &&
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
                    delay: 0.1,
                  },
                  className:
                    "bg-blue-50 rounded-2xl p-6 md:p-8 border border-blue-100",
                },
                /*#__PURE__*/ React.createElement(
                  "h2",
                  {
                    className:
                      "text-xl font-bold text-gray-900 mb-4 flex items-center gap-2",
                  },
                  /*#__PURE__*/ React.createElement(Info, {
                    className: "w-5 h-5 text-blue-600",
                  }),
                  "Important Information",
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "prose prose-sm text-gray-700",
                  },
                  /*#__PURE__*/ React.createElement(
                    "p",
                    {
                      className: "whitespace-pre-wrap",
                    },
                    event.entry_instructions,
                  ),
                ),
              ),
            event.latitude &&
              event.longitude &&
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
                    delay: 0.3,
                  },
                  className:
                    "bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100",
                },
                /*#__PURE__*/ React.createElement(
                  "h2",
                  {
                    className:
                      "text-xl font-bold text-gray-900 mb-5 flex items-center gap-2",
                  },
                  /*#__PURE__*/ React.createElement(MapPin, {
                    className: "w-5 h-5 text-gray-500",
                  }),
                  "Venue Location",
                ),
                /*#__PURE__*/ React.createElement(VenueMap, {
                  latitude: event.latitude,
                  longitude: event.longitude,
                  venueName: event.venue_name,
                  venueAddress: event.venue_address,
                }),
              ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "lg:col-span-1",
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
                  duration: 0.4,
                },
                className:
                  "sticky top-24 bg-white rounded-2xl shadow-lg border border-gray-100 z-10 overflow-hidden",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "p-5 border-b border-gray-100 space-y-3",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "flex items-center gap-3 text-gray-700",
                  },
                  /*#__PURE__*/ React.createElement(Calendar, {
                    className: "w-4 h-4 text-gray-400 flex-shrink-0",
                  }),
                  /*#__PURE__*/ React.createElement(
                    "span",
                    {
                      className: "text-sm",
                    },
                    eventDate.toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "flex items-center gap-3 text-gray-700",
                  },
                  /*#__PURE__*/ React.createElement(Clock, {
                    className: "w-4 h-4 text-gray-400 flex-shrink-0",
                  }),
                  /*#__PURE__*/ React.createElement(
                    "span",
                    {
                      className: "text-sm",
                    },
                    eventDate.toLocaleTimeString("en-IN", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    }),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "flex items-center gap-3 text-gray-700",
                  },
                  /*#__PURE__*/ React.createElement(MapPin, {
                    className: "w-4 h-4 text-gray-400 flex-shrink-0",
                  }),
                  /*#__PURE__*/ React.createElement(
                    "span",
                    {
                      className: "text-sm",
                    },
                    event.venue_name,
                    ": ",
                    event.city,
                  ),
                ),
              ),
              event.actualRemaining > 0 &&
                event.actualRemaining <= 20 &&
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "px-5 py-3 bg-orange-50 border-b border-orange-100 flex items-center gap-2",
                  },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "relative flex-shrink-0",
                    },
                    /*#__PURE__*/ React.createElement("div", {
                      className: "w-2.5 h-2.5 bg-orange-500 rounded-full",
                    }),
                    /*#__PURE__*/ React.createElement("div", {
                      className:
                        "absolute inset-0 w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping opacity-75",
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "p",
                    {
                      className: "text-xs font-semibold text-orange-800",
                    },
                    "Only ",
                    event.actualRemaining,
                    " ",
                    event.actualRemaining === 1 ? "spot" : "spots",
                    " left!",
                    " ",
                    /*#__PURE__*/ React.createElement(
                      "span",
                      {
                        className: "font-normal text-orange-700",
                      },
                      "Book now before they're gone",
                    ),
                  ),
                ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "p-5 md:p-6",
                },
                existingBooking
                  ? /*#__PURE__*/
                    // User already has booking
                    React.createElement(
                      "div",
                      {
                        className: "space-y-6",
                      },
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "text-center",
                        },
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className:
                              "w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4",
                          },
                          /*#__PURE__*/ React.createElement(CheckCircle2, {
                            className: "w-8 h-8 text-green-600",
                          }),
                        ),
                        /*#__PURE__*/ React.createElement(
                          "h2",
                          {
                            className: "text-2xl font-bold text-gray-900 mb-2",
                          },
                          "Your Booking",
                        ),
                        /*#__PURE__*/ React.createElement(
                          "p",
                          {
                            className: "text-gray-600",
                          },
                          "You have already booked this event",
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "bg-gray-50 rounded-xl p-5 space-y-3",
                        },
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className: "flex items-center justify-between",
                          },
                          /*#__PURE__*/ React.createElement(
                            "span",
                            {
                              className: "text-sm text-gray-600",
                            },
                            "Booking Code:",
                          ),
                          /*#__PURE__*/ React.createElement(
                            "span",
                            {
                              className:
                                "text-base font-bold text-gray-900 font-mono",
                            },
                            existingBooking.booking_code,
                          ),
                        ),
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className: "flex items-center justify-between",
                          },
                          /*#__PURE__*/ React.createElement(
                            "span",
                            {
                              className: "text-sm text-gray-600",
                            },
                            "Status:",
                          ),
                          /*#__PURE__*/ React.createElement(
                            Badge,
                            {
                              className:
                                "bg-green-100 text-green-800 hover:bg-green-200",
                            },
                            existingBooking.booking_status || "confirmed",
                          ),
                        ),
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className: "flex items-center justify-between",
                          },
                          /*#__PURE__*/ React.createElement(
                            "span",
                            {
                              className: "text-sm text-gray-600",
                            },
                            "Tickets:",
                          ),
                          /*#__PURE__*/ React.createElement(
                            "span",
                            {
                              className:
                                "text-base font-semibold text-gray-900",
                            },
                            existingBooking.tickets_count,
                          ),
                        ),
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className: "flex items-center justify-between",
                          },
                          /*#__PURE__*/ React.createElement(
                            "span",
                            {
                              className: "text-sm text-gray-600",
                            },
                            "Booked On:",
                          ),
                          /*#__PURE__*/ React.createElement(
                            "span",
                            {
                              className: "text-sm text-gray-900",
                            },
                            new Date(
                              existingBooking.booked_at,
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }),
                          ),
                        ),
                        existingBooking.checked_in &&
                          /*#__PURE__*/ React.createElement(
                            "div",
                            {
                              className: "pt-3 border-t border-gray-200",
                            },
                            /*#__PURE__*/ React.createElement(
                              "div",
                              {
                                className:
                                  "flex items-center gap-2 text-green-700",
                              },
                              /*#__PURE__*/ React.createElement(CheckCircle2, {
                                className: "w-4 h-4",
                              }),
                              /*#__PURE__*/ React.createElement(
                                "span",
                                {
                                  className: "text-sm font-medium",
                                },
                                "Checked In",
                              ),
                            ),
                          ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "space-y-3",
                        },
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className: "flex items-center justify-between mb-2",
                          },
                          /*#__PURE__*/ React.createElement(
                            "h3",
                            {
                              className: "text-sm font-semibold text-gray-900",
                            },
                            "Your Tickets",
                          ),
                          /*#__PURE__*/ React.createElement(
                            "span",
                            {
                              className: "text-xs text-gray-500",
                            },
                            tickets.filter((t) => t.checked_in).length,
                            "/",
                            tickets.length,
                            " checked in",
                          ),
                        ),
                        loadingTickets
                          ? /*#__PURE__*/ React.createElement(
                              "div",
                              {
                                className: "text-center py-4",
                              },
                              /*#__PURE__*/ React.createElement(Spinner, {
                                className: "mx-auto",
                              }),
                              /*#__PURE__*/ React.createElement(
                                "p",
                                {
                                  className: "text-sm text-gray-500 mt-2",
                                },
                                "Loading tickets...",
                              ),
                            )
                          : tickets.length > 0
                            ? /*#__PURE__*/ React.createElement(
                                "div",
                                {
                                  className: "space-y-2",
                                },
                                tickets.map((ticket) =>
                                  /*#__PURE__*/ React.createElement(
                                    "div",
                                    {
                                      key: ticket.ticket_id,
                                      className:
                                        "bg-gray-50 rounded-lg p-3 border border-gray-200",
                                    },
                                    /*#__PURE__*/ React.createElement(
                                      "div",
                                      {
                                        className:
                                          "flex items-center justify-between mb-2",
                                      },
                                      /*#__PURE__*/ React.createElement(
                                        "div",
                                        null,
                                        /*#__PURE__*/ React.createElement(
                                          "div",
                                          {
                                            className:
                                              "text-sm font-semibold text-gray-900",
                                          },
                                          "Ticket ",
                                          ticket.ticket_number,
                                        ),
                                        /*#__PURE__*/ React.createElement(
                                          "div",
                                          {
                                            className:
                                              "text-xs text-gray-500 font-mono",
                                          },
                                          ticket.ticket_code,
                                        ),
                                      ),
                                      ticket.checked_in &&
                                        /*#__PURE__*/ React.createElement(
                                          Badge,
                                          {
                                            className:
                                              "bg-green-100 text-green-800 text-xs",
                                          },
                                          "\u2713 Checked In",
                                        ),
                                    ),
                                    /*#__PURE__*/ React.createElement(
                                      Button,
                                      {
                                        onClick: () =>
                                          handleShowTicketQR(ticket),
                                        disabled:
                                          ticket.checked_in ||
                                          loadingQrTicketId ===
                                            ticket.ticket_id,
                                        className:
                                          "w-full h-9 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300",
                                      },
                                      loadingQrTicketId === ticket.ticket_id
                                        ? /*#__PURE__*/ React.createElement(
                                            React.Fragment,
                                            null,
                                            /*#__PURE__*/ React.createElement(
                                              Spinner,
                                              {
                                                className: "w-4 h-4 mr-2",
                                              },
                                            ),
                                            "Loading...",
                                          )
                                        : /*#__PURE__*/ React.createElement(
                                            React.Fragment,
                                            null,
                                            /*#__PURE__*/ React.createElement(
                                              Ticket,
                                              {
                                                className: "w-4 h-4 mr-2",
                                              },
                                            ),
                                            ticket.checked_in
                                              ? "Already Used"
                                              : "Show QR Code",
                                          ),
                                    ),
                                  ),
                                ),
                              )
                            : /*#__PURE__*/ React.createElement(
                                "div",
                                {
                                  className:
                                    "text-center py-4 bg-gray-50 rounded-lg",
                                },
                                /*#__PURE__*/ React.createElement(
                                  "p",
                                  {
                                    className: "text-sm text-gray-500",
                                  },
                                  "No tickets found",
                                ),
                              ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "space-y-3 pt-3 border-t border-gray-200",
                        },
                        /*#__PURE__*/ React.createElement(
                          Button,
                          {
                            onClick: () => router.push("/bookings"),
                            className:
                              "w-full bg-gray-900 hover:bg-gray-800 text-white h-12 rounded-xl",
                          },
                          "View My Bookings",
                        ),
                        /*#__PURE__*/ React.createElement(
                          Button,
                          {
                            onClick: () => router.push("/events"),
                            variant: "outline",
                            className: "w-full h-12 rounded-xl",
                          },
                          "Browse Other Events",
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "pt-4 border-t border-gray-200",
                        },
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className:
                              "flex items-start gap-2 text-sm text-gray-600",
                          },
                          /*#__PURE__*/ React.createElement(Info, {
                            className: "w-4 h-4 mt-0.5 flex-shrink-0",
                          }),
                          /*#__PURE__*/ React.createElement(
                            "p",
                            null,
                            "Your QR code ticket was sent to your email. Check your inbox or spam folder.",
                          ),
                        ),
                      ),
                    )
                  : /*#__PURE__*/
                    // Booking form
                    React.createElement(
                      "div",
                      {
                        className: "space-y-5",
                      },
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "flex items-baseline justify-between",
                        },
                        /*#__PURE__*/ React.createElement(
                          "div",
                          null,
                          /*#__PURE__*/ React.createElement(
                            "span",
                            {
                              className: "text-2xl font-bold text-gray-900",
                            },
                            selectedTierPrice === 0
                              ? /*#__PURE__*/ React.createElement(
                                  "span",
                                  {
                                    className: "text-green-600",
                                  },
                                  "FREE",
                                )
                              : /*#__PURE__*/ React.createElement(
                                  React.Fragment,
                                  null,
                                  "\u20B9",
                                  selectedTierPrice.toLocaleString("en-IN"),
                                ),
                          ),
                          selectedTierPrice > 0 &&
                            /*#__PURE__*/ React.createElement(
                              "span",
                              {
                                className: "ml-1 text-sm text-gray-500",
                              },
                              "onwards",
                            ),
                        ),
                        /*#__PURE__*/ React.createElement(
                          Badge,
                          {
                            className:
                              "bg-green-100 text-green-800 text-xs font-medium hover:bg-green-100",
                          },
                          event.actualRemaining > 0 ? "Available" : "Sold Out",
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "div",
                        null,
                        /*#__PURE__*/ React.createElement(
                          "h2",
                          {
                            className:
                              "text-base font-semibold text-gray-900 mb-1 flex items-center gap-2",
                          },
                          /*#__PURE__*/ React.createElement(Ticket, {
                            className: "w-4 h-4 text-gray-500",
                          }),
                          "Book Your Slot",
                        ),
                        !canBook &&
                          !isSoldOut &&
                          isEventVisible &&
                          /*#__PURE__*/ React.createElement(
                            "div",
                            {
                              className:
                                "bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2",
                            },
                            /*#__PURE__*/ React.createElement(
                              "p",
                              {
                                className:
                                  "text-sm text-yellow-800 flex items-start gap-2",
                              },
                              /*#__PURE__*/ React.createElement(AlertCircle, {
                                className: "w-4 h-4 mt-0.5 flex-shrink-0",
                              }),
                              /*#__PURE__*/ React.createElement(
                                "span",
                                null,
                                event.status === "checkin_open"
                                  ? "Bookings are now closed for this event. Check-in has started."
                                  : `Booking is currently not available. Event status: ${event.status.replace("_", " ")}`,
                              ),
                            ),
                          ),
                      ),
                      !user
                        ? /*#__PURE__*/
                          // User not logged in - show login prompt
                          React.createElement(
                            "div",
                            {
                              className: "space-y-4",
                            },
                            /*#__PURE__*/ React.createElement(
                              "div",
                              {
                                className:
                                  "bg-blue-50 border border-blue-100 rounded-xl p-4",
                              },
                              /*#__PURE__*/ React.createElement(
                                "p",
                                {
                                  className:
                                    "text-sm text-blue-800 flex items-start gap-2",
                                },
                                /*#__PURE__*/ React.createElement(Info, {
                                  className: "w-4 h-4 mt-0.5 flex-shrink-0",
                                }),
                                /*#__PURE__*/ React.createElement(
                                  "span",
                                  null,
                                  "Please log in to book tickets for this event.",
                                ),
                              ),
                            ),
                            /*#__PURE__*/ React.createElement(
                              Button,
                              {
                                onClick: () =>
                                  router.push(
                                    `/login?redirect=/events/${eventId}`,
                                  ),
                                className:
                                  "w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-bold rounded-xl",
                              },
                              "Login to Book",
                            ),
                            /*#__PURE__*/ React.createElement(
                              "p",
                              {
                                className: "text-xs text-center text-gray-400",
                              },
                              "Don't have an account? You can sign up during login.",
                            ),
                          )
                        : canBook
                          ? /*#__PURE__*/ React.createElement(
                              "div",
                              {
                                className: "space-y-4",
                              },
                              availableTiers.length > 0 &&
                                /*#__PURE__*/ React.createElement(
                                  "div",
                                  {
                                    className:
                                      "bg-gray-50 rounded-lg p-4 border border-gray-200",
                                  },
                                  /*#__PURE__*/ React.createElement(
                                    "label",
                                    {
                                      className:
                                        "block text-sm font-medium text-gray-700 mb-3",
                                    },
                                    "Ticket Type",
                                  ),
                                  /*#__PURE__*/ React.createElement(
                                    "div",
                                    {
                                      className:
                                        "grid grid-cols-1 sm:grid-cols-2 gap-2",
                                    },
                                    availableTiers.map((tier) => {
                                      const isSelected =
                                        selectedTier?.name === tier.name;
                                      return /*#__PURE__*/ React.createElement(
                                        "button",
                                        {
                                          key: tier.name,
                                          type: "button",
                                          onClick: () =>
                                            setSelectedTierName(tier.name),
                                          className: cn(
                                            "rounded-lg border p-3 text-left transition-colors",
                                            isSelected
                                              ? "border-blue-500 bg-blue-50"
                                              : "border-gray-200 bg-white hover:border-blue-300",
                                          ),
                                        },
                                        /*#__PURE__*/ React.createElement(
                                          "p",
                                          {
                                            className:
                                              "text-sm font-semibold text-gray-900",
                                          },
                                          tier.name,
                                        ),
                                        /*#__PURE__*/ React.createElement(
                                          "p",
                                          {
                                            className: "text-sm text-gray-700",
                                          },
                                          "\u20B9",
                                          tier.price.toLocaleString("en-IN"),
                                        ),
                                        /*#__PURE__*/ React.createElement(
                                          "p",
                                          {
                                            className: "text-xs text-gray-500",
                                          },
                                          tier.remaining,
                                          " left",
                                        ),
                                      );
                                    }),
                                  ),
                                ),
                              /*#__PURE__*/ React.createElement(
                                "div",
                                {
                                  className:
                                    "bg-gray-50 rounded-lg p-4 border border-gray-200",
                                },
                                /*#__PURE__*/ React.createElement(
                                  "label",
                                  {
                                    className:
                                      "block text-sm font-medium text-gray-700 mb-3",
                                  },
                                  "Number of Tickets",
                                ),
                                /*#__PURE__*/ React.createElement(
                                  "div",
                                  {
                                    className:
                                      "flex items-center justify-between gap-4",
                                  },
                                  /*#__PURE__*/ React.createElement(
                                    Button,
                                    {
                                      type: "button",
                                      variant: "outline",
                                      size: "sm",
                                      onClick: () =>
                                        setTicketsCount(
                                          Math.max(1, ticketsCount - 1),
                                        ),
                                      disabled:
                                        ticketsCount <= 1 || isSubmitting,
                                      className: "h-10 w-10 p-0 rounded-lg",
                                    },
                                    "-",
                                  ),
                                  /*#__PURE__*/ React.createElement(
                                    "div",
                                    {
                                      className: "text-center flex-1",
                                    },
                                    /*#__PURE__*/ React.createElement(
                                      "div",
                                      {
                                        className:
                                          "text-3xl font-bold text-gray-900",
                                      },
                                      ticketsCount,
                                    ),
                                    /*#__PURE__*/ React.createElement(
                                      "div",
                                      {
                                        className: "text-xs text-gray-500",
                                      },
                                      ticketsCount === 1 ? "ticket" : "tickets",
                                    ),
                                  ),
                                  /*#__PURE__*/ React.createElement(
                                    Button,
                                    {
                                      type: "button",
                                      variant: "outline",
                                      size: "sm",
                                      onClick: () =>
                                        setTicketsCount(
                                          Math.min(
                                            maxTicketsForSelection,
                                            ticketsCount + 1,
                                          ),
                                        ),
                                      disabled:
                                        ticketsCount >=
                                          maxTicketsForSelection ||
                                        isSubmitting,
                                      className: "h-10 w-10 p-0 rounded-lg",
                                    },
                                    "+",
                                  ),
                                ),
                                /*#__PURE__*/ React.createElement(
                                  "div",
                                  {
                                    className:
                                      "mt-3 text-xs text-gray-500 text-center",
                                  },
                                  /*#__PURE__*/ React.createElement(
                                    "span",
                                    {
                                      className: "text-orange-600 font-medium",
                                    },
                                    maxTicketsForSelection,
                                    " ticket",
                                    maxTicketsForSelection !== 1 ? "s" : "",
                                    " available",
                                  ),
                                  /*#__PURE__*/ React.createElement(
                                    "span",
                                    {
                                      className: "ml-1",
                                    },
                                    "(max ",
                                    MAX_TICKETS_PER_USER,
                                    " per user)",
                                  ),
                                ),
                              ),
                              selectedTierPrice > 0 &&
                                /*#__PURE__*/ React.createElement(
                                  "div",
                                  {
                                    className:
                                      "bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-2",
                                  },
                                  /*#__PURE__*/ React.createElement(
                                    "div",
                                    {
                                      className:
                                        "flex items-center justify-between",
                                    },
                                    /*#__PURE__*/ React.createElement(
                                      "span",
                                      {
                                        className: "text-sm text-gray-700",
                                      },
                                      "Subtotal:",
                                    ),
                                    /*#__PURE__*/ React.createElement(
                                      "span",
                                      {
                                        className:
                                          "text-lg font-semibold text-gray-900",
                                      },
                                      "\u20B9",
                                      (originalAmount || 0).toLocaleString(
                                        "en-IN",
                                      ),
                                    ),
                                  ),
                                  /*#__PURE__*/ React.createElement(
                                    "div",
                                    {
                                      className:
                                        "text-xs text-gray-600 text-right",
                                    },
                                    selectedTier?.name || "Ticket",
                                    " \u2022 \u20B9",
                                    selectedTierPrice.toLocaleString("en-IN"),
                                    " \xD7 ",
                                    ticketsCount,
                                    " ",
                                    ticketsCount === 1 ? "ticket" : "tickets",
                                  ),
                                  /*#__PURE__*/ React.createElement("div", {
                                    className: "border-t border-blue-200 pt-2",
                                  }),
                                  /*#__PURE__*/ React.createElement(
                                    "div",
                                    {
                                      className:
                                        "flex items-center justify-between",
                                    },
                                    /*#__PURE__*/ React.createElement(
                                      "span",
                                      {
                                        className:
                                          "text-sm font-bold text-gray-900",
                                      },
                                      "Total Amount:",
                                    ),
                                    /*#__PURE__*/ React.createElement(
                                      "span",
                                      {
                                        className:
                                          "text-2xl font-bold text-gray-900",
                                      },
                                      isNaN(finalAmount)
                                        ? "₹0"
                                        : finalAmount === 0
                                          ? /*#__PURE__*/ React.createElement(
                                              "span",
                                              {
                                                className: "text-green-600",
                                              },
                                              "FREE",
                                            )
                                          : `₹${finalAmount.toLocaleString("en-IN")}`,
                                    ),
                                  ),
                                ),
                              paymentError &&
                                /*#__PURE__*/ React.createElement(
                                  "div",
                                  {
                                    className:
                                      "bg-red-50 border border-red-200 rounded-lg p-4",
                                  },
                                  /*#__PURE__*/ React.createElement(
                                    "div",
                                    {
                                      className: "flex items-start gap-3",
                                    },
                                    /*#__PURE__*/ React.createElement(
                                      AlertCircle,
                                      {
                                        className:
                                          "w-5 h-5 text-red-600 flex-shrink-0 mt-0.5",
                                      },
                                    ),
                                    /*#__PURE__*/ React.createElement(
                                      "div",
                                      {
                                        className: "flex-1",
                                      },
                                      /*#__PURE__*/ React.createElement(
                                        "h4",
                                        {
                                          className:
                                            "text-sm font-semibold text-red-900 mb-1",
                                        },
                                        "Payment Failed",
                                      ),
                                      /*#__PURE__*/ React.createElement(
                                        "p",
                                        {
                                          className: "text-sm text-red-700",
                                        },
                                        paymentError,
                                      ),
                                    ),
                                    /*#__PURE__*/ React.createElement(
                                      "button",
                                      {
                                        type: "button",
                                        onClick: () => setPaymentError(""),
                                        className:
                                          "text-red-400 hover:text-red-600",
                                      },
                                      /*#__PURE__*/ React.createElement(X, {
                                        className: "w-4 h-4",
                                      }),
                                    ),
                                  ),
                                ),
                              /*#__PURE__*/ React.createElement(
                                Button,
                                {
                                  onClick: () => {
                                    setPaymentError("");
                                    setShowPaymentConfirmModal(true);
                                  },
                                  disabled: isProcessingPayment || isSubmitting,
                                  className:
                                    "w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-bold rounded-xl",
                                },
                                isProcessingPayment || isSubmitting
                                  ? /*#__PURE__*/ React.createElement(
                                      React.Fragment,
                                      null,
                                      /*#__PURE__*/ React.createElement(
                                        Spinner,
                                        {
                                          className: "w-4 h-4 text-white mr-2",
                                        },
                                      ),
                                      "Processing...",
                                    )
                                  : /*#__PURE__*/ React.createElement(
                                      React.Fragment,
                                      null,
                                      isPaidBooking
                                        ? `Pay With Razorpay${ticketsCount > 1 ? ` (${ticketsCount} Tickets)` : ""}`
                                        : `Confirm Booking${ticketsCount > 1 ? ` (${ticketsCount} Tickets)` : ""}`,
                                      /*#__PURE__*/ React.createElement(
                                        CheckCircle2,
                                        {
                                          className: "w-4 h-4 ml-2",
                                        },
                                      ),
                                    ),
                              ),
                              isPaidBooking &&
                                proceedToPayment &&
                                /*#__PURE__*/ React.createElement(
                                  RazorpayCheckout,
                                  {
                                    eventId: event.event_id,
                                    ticketsCount: ticketsCount,
                                    tierName: selectedTierName || undefined,
                                    referralCode:
                                      activeReferralCode || undefined,
                                    autoTrigger: true,
                                    onReady: () =>
                                      setIsProcessingPayment(false),
                                    onSuccess: (
                                      paidBookingId,
                                      paymentId,
                                      paidBookingCode,
                                    ) => {
                                      setBookingCode(
                                        paidBookingCode || paidBookingId,
                                      );
                                      setProceedToPayment(false);
                                      setPaymentError("");
                                      setIsProcessingPayment(false);
                                      setShowSuccessModal(true);
                                      void fetchEventData();
                                      if (user) {
                                        void checkUserBooking(user.id);
                                      }
                                    },
                                    onFailure: (errorMessage) => {
                                      setProceedToPayment(false);
                                      setIsProcessingPayment(false);
                                      setPaymentError(errorMessage);
                                      void fetchEventData();
                                      if (user) {
                                        void checkUserBooking(user.id);
                                      }
                                    },
                                  },
                                ),
                              /*#__PURE__*/ React.createElement(
                                "div",
                                {
                                  className:
                                    "flex items-center gap-2 text-xs text-gray-500 justify-center",
                                },
                                /*#__PURE__*/ React.createElement(Shield, {
                                  className: "w-4 h-4",
                                }),
                                /*#__PURE__*/ React.createElement(
                                  "span",
                                  null,
                                  "Secure booking \u2022 Instant QR ticket via email",
                                ),
                              ),
                              /*#__PURE__*/ React.createElement(
                                "div",
                                {
                                  className:
                                    "pt-4 border-t border-gray-200 text-xs text-gray-600 space-y-1",
                                },
                                /*#__PURE__*/ React.createElement(
                                  "p",
                                  null,
                                  "\u2022 QR code required for entry",
                                ),
                                /*#__PURE__*/ React.createElement(
                                  "p",
                                  null,
                                  "\u2022 Check email spam folder if not received",
                                ),
                              ),
                            )
                          : isSoldOut
                            ? /*#__PURE__*/ React.createElement(
                                "div",
                                {
                                  className: "text-center py-8",
                                },
                                /*#__PURE__*/ React.createElement(
                                  "div",
                                  {
                                    className:
                                      "w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4",
                                  },
                                  /*#__PURE__*/ React.createElement(Users, {
                                    className: "w-8 h-8 text-gray-400",
                                  }),
                                ),
                                /*#__PURE__*/ React.createElement(
                                  "p",
                                  {
                                    className:
                                      "text-lg font-semibold text-gray-900 mb-2",
                                  },
                                  "Event Sold Out",
                                ),
                                /*#__PURE__*/ React.createElement(
                                  "p",
                                  {
                                    className: "text-sm text-gray-600 mb-6",
                                  },
                                  "This event has reached maximum capacity",
                                ),
                                /*#__PURE__*/ React.createElement(
                                  Button,
                                  {
                                    onClick: () => router.push("/events"),
                                    variant: "outline",
                                    className: "w-full rounded-xl",
                                  },
                                  "Browse Other Events",
                                ),
                              )
                            : /*#__PURE__*/ React.createElement(
                                "div",
                                {
                                  className: "text-center py-8",
                                },
                                /*#__PURE__*/ React.createElement(
                                  "div",
                                  {
                                    className:
                                      "w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4",
                                  },
                                  /*#__PURE__*/ React.createElement(
                                    AlertCircle,
                                    {
                                      className: "w-8 h-8 text-gray-400",
                                    },
                                  ),
                                ),
                                /*#__PURE__*/ React.createElement(
                                  "p",
                                  {
                                    className:
                                      "text-lg font-semibold text-gray-900 mb-2",
                                  },
                                  "Booking Closed",
                                ),
                                /*#__PURE__*/ React.createElement(
                                  "p",
                                  {
                                    className: "text-sm text-gray-600 mb-6",
                                  },
                                  event.status === "checkin_open"
                                    ? "Bookings are now closed. Check-in has started for this event."
                                    : "This event is not currently accepting bookings.",
                                ),
                                /*#__PURE__*/ React.createElement(
                                  Button,
                                  {
                                    onClick: () => router.push("/events"),
                                    variant: "outline",
                                    className: "w-full rounded-xl",
                                  },
                                  "Browse Other Events",
                                ),
                              ),
                    ),
              ),
            ),
          ),
        ),
      ),
    ),
    showQRModal &&
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className:
            "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4",
          onClick: () => setShowQRModal(false),
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "bg-white rounded-2xl p-6 max-w-md w-full",
            onClick: (e) => e.stopPropagation(),
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "text-center",
            },
            /*#__PURE__*/ React.createElement(
              "h3",
              {
                className: "text-2xl font-bold text-gray-900 mb-2",
              },
              selectedTicketForQR
                ? `Ticket ${selectedTicketForQR.ticket_number}`
                : "Your QR Code",
            ),
            selectedTicketForQR &&
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-sm text-gray-600 font-mono mb-4",
                },
                selectedTicketForQR.ticket_code,
              ),
            qrCodeData
              ? /*#__PURE__*/ React.createElement(
                  React.Fragment,
                  null,
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "bg-white p-6 rounded-xl border-2 border-gray-200 mb-4",
                    },
                    /*#__PURE__*/ React.createElement("img", {
                      src: qrCodeData,
                      alt: "QR Code",
                      className: "w-full max-w-[350px] mx-auto",
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "p",
                    {
                      className: "text-sm text-gray-600 mb-2",
                    },
                    "Show this QR code at the venue entrance",
                  ),
                  /*#__PURE__*/ React.createElement(
                    "p",
                    {
                      className: "text-xs text-gray-500 mb-4",
                    },
                    "Ticket ID: ",
                    selectedTicketForQR?.ticket_id || "N/A",
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "flex gap-3",
                    },
                    /*#__PURE__*/ React.createElement(
                      Button,
                      {
                        onClick: () => {
                          const link = document.createElement("a");
                          link.href = qrCodeData;
                          link.download = `ticket-${selectedTicketForQR?.ticket_code || "qr"}.png`;
                          link.click();
                        },
                        variant: "outline",
                        className: "flex-1",
                      },
                      "Download",
                    ),
                    /*#__PURE__*/ React.createElement(
                      Button,
                      {
                        onClick: () => setShowQRModal(false),
                        className: "flex-1 bg-blue-600 hover:bg-blue-700",
                      },
                      "Close",
                    ),
                  ),
                )
              : /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "py-8",
                  },
                  /*#__PURE__*/ React.createElement(Spinner, {
                    className: "mx-auto mb-4",
                  }),
                  /*#__PURE__*/ React.createElement(
                    "p",
                    {
                      className: "text-sm text-gray-600",
                    },
                    "Loading QR code...",
                  ),
                ),
          ),
        ),
      ),
    showTermsModal &&
      event.terms &&
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className:
            "fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4",
          onClick: () => setShowTermsModal(false),
        },
        /*#__PURE__*/ React.createElement(
          motion.div,
          {
            initial: {
              opacity: 0,
              scale: 0.95,
              y: 20,
            },
            animate: {
              opacity: 1,
              scale: 1,
              y: 0,
            },
            className:
              "bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl",
            onClick: (e) => e.stopPropagation(),
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "p-6 border-b border-gray-100 flex items-center justify-between",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              null,
              /*#__PURE__*/ React.createElement(
                "h3",
                {
                  className: "text-xl font-bold text-gray-900",
                },
                "Event Specific Terms",
              ),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-sm text-gray-500 mt-1",
                },
                event.title,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              Button,
              {
                variant: "ghost",
                size: "icon",
                onClick: () => setShowTermsModal(false),
                className: "rounded-full hover:bg-gray-100",
              },
              /*#__PURE__*/ React.createElement(X, {
                className: "w-5 h-5",
              }),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "flex-1 overflow-y-auto p-6 md:p-8",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "prose prose-sm prose-blue max-w-none text-gray-700",
              },
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "whitespace-pre-wrap leading-relaxed",
                },
                event.terms,
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl",
            },
            /*#__PURE__*/ React.createElement(
              Button,
              {
                onClick: () => {
                  setAgreedToTerms(true);
                  setShowTermsModal(false);
                },
                className:
                  "w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl font-semibold shadow-lg shadow-blue-200",
              },
              "I Understand and Agree",
            ),
          ),
        ),
      ),
    showPaymentConfirmModal &&
      event &&
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className:
            "fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4",
          onClick: () => setShowPaymentConfirmModal(false),
        },
        /*#__PURE__*/ React.createElement(
          motion.div,
          {
            initial: {
              opacity: 0,
              scale: 0.95,
              y: 20,
            },
            animate: {
              opacity: 1,
              scale: 1,
              y: 0,
            },
            className:
              "bg-white rounded-2xl max-w-lg w-full max-h-[65vh] flex flex-col shadow-2xl",
            onClick: (e) => e.stopPropagation(),
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "p-6 border-b border-gray-100 flex items-center justify-between",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              null,
              /*#__PURE__*/ React.createElement(
                "h3",
                {
                  className: "text-xl font-bold text-gray-900",
                },
                "Confirm Booking",
              ),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-sm text-gray-500 mt-1",
                },
                event.title,
              ),
            ),
            /*#__PURE__*/ React.createElement(
              Button,
              {
                variant: "ghost",
                size: "icon",
                onClick: () => setShowPaymentConfirmModal(false),
                className: "rounded-full hover:bg-gray-100",
              },
              /*#__PURE__*/ React.createElement(X, {
                className: "w-5 h-5",
              }),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "p-4 bg-blue-50 border-b border-blue-100",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center justify-between text-sm",
              },
              /*#__PURE__*/ React.createElement(
                "span",
                {
                  className: "text-gray-600",
                },
                "Tickets:",
              ),
              /*#__PURE__*/ React.createElement(
                "span",
                {
                  className: "font-semibold text-gray-900",
                },
                ticketsCount,
              ),
            ),
            selectedTier &&
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex items-center justify-between text-sm mt-1",
                },
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "text-gray-600",
                  },
                  "Tier:",
                ),
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "font-semibold text-gray-900",
                  },
                  selectedTier.name,
                ),
              ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center justify-between text-sm mt-1",
              },
              /*#__PURE__*/ React.createElement(
                "span",
                {
                  className: "text-gray-600",
                },
                isPaidBooking ? "Amount Due:" : "Ticket Value:",
              ),
              /*#__PURE__*/ React.createElement(
                "span",
                {
                  className: "font-bold text-lg text-gray-900",
                },
                "\u20B9",
                finalAmount.toLocaleString("en-IN"),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "flex-1 overflow-y-auto p-6",
            },
            isPaidBooking &&
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "flex items-start gap-3",
                  },
                  /*#__PURE__*/ React.createElement(Shield, {
                    className: "mt-0.5 h-5 w-5 text-blue-600",
                  }),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "min-w-0 flex-1",
                    },
                    /*#__PURE__*/ React.createElement(
                      "h4",
                      {
                        className: "text-sm font-semibold text-blue-900",
                      },
                      "Razorpay Checkout",
                    ),
                    /*#__PURE__*/ React.createElement(
                      "p",
                      {
                        className: "mt-1 text-sm text-blue-700",
                      },
                      "You\u2019ll be redirected to Razorpay to complete this payment securely.",
                    ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "mt-4 rounded-xl border border-dashed border-blue-200 bg-white p-4",
                  },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "space-y-2",
                    },
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className:
                          "flex items-center justify-between text-xs uppercase tracking-wide text-gray-500",
                      },
                      /*#__PURE__*/ React.createElement(
                        "span",
                        null,
                        "Supported Modes",
                      ),
                      /*#__PURE__*/ React.createElement("span", null, "Live"),
                    ),
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "text-sm font-semibold text-gray-900",
                      },
                      "UPI, Cards, Net Banking, Wallets",
                    ),
                    /*#__PURE__*/ React.createElement(
                      "p",
                      {
                        className: "text-xs text-gray-500",
                      },
                      "ConveneHub will create a pending booking first, then confirm it after Razorpay verifies the payment.",
                    ),
                  ),
                ),
              ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center gap-2 mb-4",
              },
              /*#__PURE__*/ React.createElement(Shield, {
                className: "w-5 h-5 text-blue-600",
              }),
              /*#__PURE__*/ React.createElement(
                "h4",
                {
                  className: "font-semibold text-gray-900",
                },
                isPaidBooking ? "Booking Terms" : "Terms & Conditions",
              ),
            ),
            event.terms
              ? /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "prose prose-sm max-w-none text-gray-700 bg-gray-50 rounded-xl p-4 border border-gray-200",
                  },
                  /*#__PURE__*/ React.createElement(
                    "p",
                    {
                      className: "whitespace-pre-wrap leading-relaxed text-sm",
                    },
                    event.terms,
                  ),
                )
              : /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "bg-gray-50 rounded-xl p-4 border border-gray-200",
                  },
                  /*#__PURE__*/ React.createElement(
                    "p",
                    {
                      className: "text-sm text-gray-600 leading-relaxed",
                    },
                    "By proceeding with this booking, you agree to our",
                    " ",
                    /*#__PURE__*/ React.createElement(
                      Link,
                      {
                        href: "/terms",
                        target: "_blank",
                        className: "text-blue-600 hover:underline font-medium",
                      },
                      "Terms and Conditions",
                    ),
                    ", including:",
                  ),
                  /*#__PURE__*/ React.createElement(
                    "ul",
                    {
                      className: "mt-3 space-y-2 text-sm text-gray-600",
                    },
                    /*#__PURE__*/ React.createElement(
                      "li",
                      {
                        className: "flex items-start gap-2",
                      },
                      /*#__PURE__*/ React.createElement(CheckCircle2, {
                        className:
                          "w-4 h-4 text-green-500 mt-0.5 flex-shrink-0",
                      }),
                      /*#__PURE__*/ React.createElement(
                        "span",
                        null,
                        "QR code ticket is required for entry",
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      "li",
                      {
                        className: "flex items-start gap-2",
                      },
                      /*#__PURE__*/ React.createElement(CheckCircle2, {
                        className:
                          "w-4 h-4 text-green-500 mt-0.5 flex-shrink-0",
                      }),
                      /*#__PURE__*/ React.createElement(
                        "span",
                        null,
                        "All bookings are final and non-transferable",
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      "li",
                      {
                        className: "flex items-start gap-2",
                      },
                      /*#__PURE__*/ React.createElement(CheckCircle2, {
                        className:
                          "w-4 h-4 text-green-500 mt-0.5 flex-shrink-0",
                      }),
                      /*#__PURE__*/ React.createElement(
                        "span",
                        null,
                        "Follow all venue and safety guidelines",
                      ),
                    ),
                  ),
                ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl space-y-3",
            },
            /*#__PURE__*/ React.createElement(
              Button,
              {
                onClick: () => {
                  setPaymentError("");
                  setShowPaymentConfirmModal(false);
                  if (isPaidBooking) {
                    setProceedToPayment(true);
                    setIsProcessingPayment(true);
                    return;
                  }
                  setIsProcessingPayment(true);
                  Promise.resolve(handleBooking()).finally(() => {
                    setIsProcessingPayment(false);
                  });
                },
                disabled: isProcessingPayment || isSubmitting,
                className:
                  "w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed",
              },
              isProcessingPayment || isSubmitting
                ? /*#__PURE__*/ React.createElement(
                    React.Fragment,
                    null,
                    /*#__PURE__*/ React.createElement(
                      "svg",
                      {
                        className: "animate-spin h-5 w-5 text-white",
                        xmlns: "http://www.w3.org/2000/svg",
                        fill: "none",
                        viewBox: "0 0 24 24",
                      },
                      /*#__PURE__*/ React.createElement("circle", {
                        className: "opacity-25",
                        cx: "12",
                        cy: "12",
                        r: "10",
                        stroke: "currentColor",
                        strokeWidth: "4",
                      }),
                      /*#__PURE__*/ React.createElement("path", {
                        className: "opacity-75",
                        fill: "currentColor",
                        d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z",
                      }),
                    ),
                    "Processing...",
                  )
                : /*#__PURE__*/ React.createElement(
                    React.Fragment,
                    null,
                    /*#__PURE__*/ React.createElement(CheckCircle2, {
                      className: "w-4 h-4",
                    }),
                    isPaidBooking
                      ? "Continue To Razorpay"
                      : "I Agree & Confirm Booking",
                  ),
            ),
            /*#__PURE__*/ React.createElement(
              Button,
              {
                variant: "outline",
                onClick: () => setShowPaymentConfirmModal(false),
                className: "w-full h-10 rounded-xl",
              },
              "Cancel",
            ),
          ),
        ),
      ),
    isProcessingPayment &&
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className:
            "fixed inset-0 bg-black/40 z-[60] flex flex-col items-center justify-center gap-4",
        },
        /*#__PURE__*/ React.createElement("div", {
          className:
            "w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin",
        }),
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className:
              "text-white text-base font-medium flex items-center gap-1",
          },
          isPaidBooking ? "Opening Razorpay" : "Please wait",
          /*#__PURE__*/ React.createElement(
            "span",
            {
              className: "inline-flex w-8 ml-1",
            },
            /*#__PURE__*/ React.createElement(
              "span",
              {
                className: "animate-[pulse_1.4s_ease-in-out_infinite]",
              },
              ".",
            ),
            /*#__PURE__*/ React.createElement(
              "span",
              {
                className: "animate-[pulse_1.4s_ease-in-out_0.2s_infinite]",
              },
              ".",
            ),
            /*#__PURE__*/ React.createElement(
              "span",
              {
                className: "animate-[pulse_1.4s_ease-in-out_0.4s_infinite]",
              },
              ".",
            ),
          ),
        ),
      ),
    /*#__PURE__*/ React.createElement(Footer, null),
  );
}
