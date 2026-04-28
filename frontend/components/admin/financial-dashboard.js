"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Mail,
} from "lucide-react";
import { sanitizeCSVValue } from "@/lib/csv-sanitizer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import SettlementModal from "./settlement-modal";
export default function FinancialDashboard({
  apiBasePath = "/api/admin",
  showAdminActions = true,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedEvents, setExpandedEvents] = useState(new Set());
  const [settlementModal, setSettlementModal] = useState({
    isOpen: false,
    event: null,
  });
  const [emailModal, setEmailModal] = useState({
    isOpen: false,
    event: null,
    loading: false,
    error: null,
    success: false,
  });
  const [movieTeamEmail, setMovieTeamEmail] = useState("");
  const [summaryEmailModal, setSummaryEmailModal] = useState({
    isOpen: false,
    loading: false,
    error: null,
    success: false,
  });
  const [summaryRecipientEmail, setSummaryRecipientEmail] = useState("");
  useEffect(() => {
    fetchFinancialData();
  }, []);
  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBasePath}/financial-summary`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch financial data");
      }
      const result = await response.json();

      // Debug: Log settlement details for each event
      result.events?.forEach((event) => {
        if (event.settlement_status === "settled") {
        }
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };
  const toggleEventExpanded = (eventId) => {
    setExpandedEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };
  const downloadCSV = (event) => {
    // Create CSV content with sanitized values to prevent CSV injection
    const headers = [
      "Booking ID",
      "Tickets",
      "Amount (₹)",
      "Payment Status",
      "Booking Date",
    ];
    const rows = event.bookings.map((booking) => [
      booking.booking_id,
      booking.tickets_count,
      parseFloat(booking.total_amount).toFixed(2),
      booking.payment_status,
      new Date(booking.booked_at).toLocaleDateString(),
    ]);

    // Add summary rows with proper formatting
    rows.push(["", "", "", "", ""]); // Empty row for spacing
    rows.push(["Financial Summary", "", "", "", ""]);
    rows.push([
      "Gross Revenue",
      "",
      parseFloat(event.financial_summary.gross_revenue).toFixed(2),
      "",
      "",
    ]);
    rows.push([
      "Processing Fees",
      "",
      parseFloat(event.financial_summary.processing_fees).toFixed(2),
      "",
      "",
    ]);
    rows.push([
      `CONVENEHUB Commission (${event.financial_summary.platform_commission_percentage}%)`,
      "",
      parseFloat(event.financial_summary.platform_commission).toFixed(2),
      "",
      "",
    ]);
    rows.push([
      "NET PAYOUT",
      "",
      parseFloat(event.financial_summary.net_payout_to_movie_team).toFixed(2),
      "",
      "",
    ]);
    const csvContent = [
      headers.map(sanitizeCSVValue).join(","),
      ...rows.map((row) => row.map(sanitizeCSVValue).join(",")),
    ].join("\n");

    // Download
    const blob = new Blob([csvContent], {
      type: "text/csv",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, "-")}-financial-report.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };
  const downloadAllData = () => {
    if (!data) return;

    // Create comprehensive CSV with all events and summary
    const rows = [];

    // Overall Summary Section
    rows.push(["OVERALL FINANCIAL SUMMARY"]);
    rows.push(["Generated on:", new Date().toLocaleString("en-IN")]);
    rows.push([""]);
    rows.push(["Metric", "Value"]);
    rows.push(["Total Events", data.summary.total_events.toString()]);
    rows.push([
      "Total Tickets Sold",
      data.summary.total_tickets_sold.toString(),
    ]);
    rows.push([
      "Total Gross Revenue",
      `₹${parseFloat(data.summary.total_gross_revenue).toFixed(2)}`,
    ]);
    rows.push([
      "Total Processing Fees",
      `₹${parseFloat(data.summary.total_processing_fees).toFixed(2)}`,
    ]);
    rows.push([
      "Total CONVENEHUB Commission",
      `₹${parseFloat(data.summary.total_platform_commission).toFixed(2)}`,
    ]);
    rows.push([
      "Total Net Payout",
      `₹${parseFloat(data.summary.total_net_payout).toFixed(2)}`,
    ]);
    rows.push([""]);

    // Event-wise breakdown
    rows.push(["EVENT-WISE BREAKDOWN"]);
    rows.push([""]);
    data.events.forEach((event, index) => {
      rows.push([`Event ${index + 1}: ${event.title}`]);
      rows.push([
        "Date:",
        new Date(event.date_time).toLocaleDateString("en-IN"),
      ]);
      rows.push(["Venue:", event.venue_name]);
      rows.push(["City:", event.city]);
      rows.push(["Status:", event.status]);
      rows.push(["Settlement Status:", event.settlement_status || "Pending"]);
      rows.push([""]);
      rows.push(["Financial Details", ""]);
      rows.push([
        "Tickets Sold",
        event.financial_summary.total_tickets_sold.toString(),
      ]);
      rows.push([
        "Gross Revenue",
        `₹${parseFloat(event.financial_summary.gross_revenue).toFixed(2)}`,
      ]);
      rows.push([
        "Processing Fees",
        `₹${parseFloat(event.financial_summary.processing_fees).toFixed(2)}`,
      ]);
      rows.push([
        `CONVENEHUB Commission (${event.financial_summary.platform_commission_percentage}%)`,
        `₹${parseFloat(event.financial_summary.platform_commission).toFixed(2)}`,
      ]);
      rows.push([
        "Net Payout",
        `₹${parseFloat(event.financial_summary.net_payout_to_movie_team).toFixed(2)}`,
      ]);
      rows.push([""]);

      // Booking details
      rows.push([
        "Booking ID",
        "Tickets",
        "Amount (₹)",
        "Payment Status",
        "Date",
      ]);
      event.bookings.forEach((booking) => {
        rows.push([
          booking.booking_id,
          booking.tickets_count.toString(),
          parseFloat(booking.total_amount).toFixed(2),
          booking.payment_status,
          new Date(booking.booked_at).toLocaleDateString("en-IN"),
        ]);
      });
      rows.push([""]);
      rows.push(["─".repeat(80)]);
      rows.push([""]);
    });
    const csvContent = rows
      .map((row) => row.map(sanitizeCSVValue).join(","))
      .join("\n");

    // Download
    const blob = new Blob([csvContent], {
      type: "text/csv",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const timestamp = new Date().toISOString().split("T")[0];
    a.download = `CONVENEHUB-Financial-Report-${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };
  const openSettlementModal = (event) => {
    setSettlementModal({
      isOpen: true,
      event: {
        id: event.event_id,
        title: event.title,
        net_payout: parseFloat(
          event.financial_summary.net_payout_to_movie_team,
        ),
        settlement_status: event.settlement_status,
      },
    });
  };
  const closeSettlementModal = () => {
    setSettlementModal({
      isOpen: false,
      event: null,
    });
  };
  const handleSettlementSuccess = () => {
    // Refresh financial data after successful settlement
    fetchFinancialData();
  };
  const openEmailModal = (event) => {
    setEmailModal({
      isOpen: true,
      event: {
        id: event.event_id,
        title: event.title,
      },
      loading: false,
      error: null,
      success: false,
    });
    setMovieTeamEmail("");
  };
  const closeEmailModal = () => {
    setEmailModal({
      isOpen: false,
      event: null,
      loading: false,
      error: null,
      success: false,
    });
    setMovieTeamEmail("");
  };
  const openSummaryEmailModal = () => {
    setSummaryEmailModal({
      isOpen: true,
      loading: false,
      error: null,
      success: false,
    });
    setSummaryRecipientEmail("");
  };
  const closeSummaryEmailModal = () => {
    setSummaryEmailModal({
      isOpen: false,
      loading: false,
      error: null,
      success: false,
    });
    setSummaryRecipientEmail("");
  };
  const handleSendSummaryEmail = async () => {
    if (!summaryRecipientEmail.trim()) {
      setSummaryEmailModal((prev) => ({
        ...prev,
        error: "Please enter a valid email address",
      }));
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(summaryRecipientEmail)) {
      setSummaryEmailModal((prev) => ({
        ...prev,
        error: "Please enter a valid email address",
      }));
      return;
    }
    setSummaryEmailModal((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));
    try {
      const response = await fetch(`${apiBasePath}/financial-summary/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_email: summaryRecipientEmail,
          summary_data: data,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to send summary email");
      }
      setSummaryEmailModal((prev) => ({
        ...prev,
        loading: false,
        success: true,
      }));

      // Close modal after success
      setTimeout(() => {
        closeSummaryEmailModal();
      }, 2000);
    } catch (err) {
      setSummaryEmailModal((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "An error occurred",
      }));
    }
  };
  const handleSendEmail = async () => {
    if (!emailModal.event || !movieTeamEmail.trim()) {
      setEmailModal((prev) => ({
        ...prev,
        error: "Please enter a valid email address",
      }));
      return;
    }
    setEmailModal((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));
    try {
      const response = await fetch(`${apiBasePath}/settlements/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: emailModal.event.id,
          movie_team_email: movieTeamEmail,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }
      setEmailModal((prev) => ({
        ...prev,
        loading: false,
        success: true,
      }));

      // Show success and close after delay
      setTimeout(() => {
        closeEmailModal();
        // Optionally refresh data
        fetchFinancialData();
      }, 2000);
    } catch (err) {
      setEmailModal((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "An error occurred",
      }));
    }
  };
  if (loading) {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "text-center py-16",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className:
            "inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4",
        },
        /*#__PURE__*/ React.createElement(Clock, {
          className: "h-8 w-8 text-gray-400 animate-spin",
        }),
      ),
      /*#__PURE__*/ React.createElement(
        "h3",
        {
          className: "text-lg font-semibold text-gray-900 mb-2",
        },
        "Loading Financial Data",
      ),
      /*#__PURE__*/ React.createElement(
        "p",
        {
          className: "text-gray-500 max-w-sm mx-auto",
        },
        "Calculating revenue, fees, and settlements...",
      ),
    );
  }
  if (error) {
    return /*#__PURE__*/ React.createElement(
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
        /*#__PURE__*/ React.createElement(AlertCircle, {
          className: "h-8 w-8 text-red-500",
        }),
      ),
      /*#__PURE__*/ React.createElement(
        "h3",
        {
          className: "text-lg font-semibold text-gray-900 mb-2",
        },
        "Failed to Load Data",
      ),
      /*#__PURE__*/ React.createElement(
        "p",
        {
          className: "text-gray-500 max-w-sm mx-auto mb-4",
        },
        error,
      ),
      /*#__PURE__*/ React.createElement(
        Button,
        {
          onClick: fetchFinancialData,
          variant: "outline",
        },
        "Try Again",
      ),
    );
  }
  if (!data || data.events.length === 0) {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "text-center py-16",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className:
            "inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4",
        },
        /*#__PURE__*/ React.createElement(FileText, {
          className: "h-8 w-8 text-gray-400",
        }),
      ),
      /*#__PURE__*/ React.createElement(
        "h3",
        {
          className: "text-lg font-semibold text-gray-900 mb-2",
        },
        "No Financial Data",
      ),
      /*#__PURE__*/ React.createElement(
        "p",
        {
          className: "text-gray-500 max-w-sm mx-auto",
        },
        "No completed events with paid bookings found. Financial data will appear here once events are completed.",
      ),
    );
  }

  // Calculate additional summary statistics
  const averageRevenuePerEvent =
    data.summary.total_events > 0
      ? parseFloat(data.summary.total_gross_revenue) / data.summary.total_events
      : 0;
  const averageTicketsPerEvent =
    data.summary.total_events > 0
      ? data.summary.total_tickets_sold / data.summary.total_events
      : 0;
  const effectiveFeePercentage =
    parseFloat(data.summary.total_gross_revenue) > 0
      ? ((parseFloat(data.summary.total_processing_fees) +
          parseFloat(data.summary.total_platform_commission)) /
          parseFloat(data.summary.total_gross_revenue)) *
        100
      : 0;

  // Calculate settlement status
  const settledEvents = data.events.filter(
    (e) => e.settlement_status === "settled",
  ).length;
  const pendingEvents = data.events.filter(
    (e) => e.settlement_status !== "settled",
  ).length;
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className: "space-y-6",
    },
    /*#__PURE__*/ React.createElement(
      Card,
      {
        className: "border-[#195ADC] bg-gradient-to-br from-blue-50 to-white",
      },
      /*#__PURE__*/ React.createElement(
        CardHeader,
        {
          className: "pb-4",
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
                className: "text-xl sm:text-2xl",
              },
              "Overall Financial Summary",
            ),
            /*#__PURE__*/ React.createElement(
              CardDescription,
              {
                className: "mt-1 text-xs sm:text-sm",
              },
              data.summary.total_events,
              " event",
              data.summary.total_events !== 1 ? "s" : "",
              " \u2022 ",
              data.summary.total_tickets_sold,
              " tickets sold",
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "text-left sm:text-right",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "text-xs text-gray-500 mb-1",
              },
              "Fee Structure",
            ),
            /*#__PURE__*/ React.createElement(
              Badge,
              {
                variant: "outline",
                className: "font-mono text-xs",
              },
              data.fee_structure.processing_fee_percentage,
              "% processing + variable CONVENEHUB",
            ),
          ),
        ),
      ),
      /*#__PURE__*/ React.createElement(
        CardContent,
        null,
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "bg-white rounded-lg p-3 sm:p-4 shadow-sm",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center justify-between mb-1 sm:mb-2",
              },
              /*#__PURE__*/ React.createElement(
                "span",
                {
                  className: "text-xs sm:text-sm text-gray-600",
                },
                "Gross Revenue",
              ),
              /*#__PURE__*/ React.createElement(TrendingUp, {
                className: "h-3 w-3 sm:h-4 sm:w-4 text-green-600",
              }),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "text-lg sm:text-2xl font-bold text-gray-900",
              },
              formatCurrency(parseFloat(data.summary.total_gross_revenue)),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "bg-white rounded-lg p-3 sm:p-4 shadow-sm",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center justify-between mb-1 sm:mb-2",
              },
              /*#__PURE__*/ React.createElement(
                "span",
                {
                  className: "text-xs sm:text-sm text-gray-600",
                },
                "Processing Fees",
              ),
              /*#__PURE__*/ React.createElement(TrendingDown, {
                className: "h-3 w-3 sm:h-4 sm:w-4 text-red-600",
              }),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "text-lg sm:text-2xl font-bold text-red-600",
              },
              "-",
              formatCurrency(parseFloat(data.summary.total_processing_fees)),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "bg-white rounded-lg p-3 sm:p-4 shadow-sm",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center justify-between mb-1 sm:mb-2",
              },
              /*#__PURE__*/ React.createElement(
                "span",
                {
                  className: "text-xs sm:text-sm text-gray-600",
                },
                "CONVENEHUB",
              ),
              /*#__PURE__*/ React.createElement(TrendingDown, {
                className: "h-3 w-3 sm:h-4 sm:w-4 text-green-600",
              }),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "text-lg sm:text-2xl font-bold text-green-600",
              },
              "-",
              formatCurrency(
                parseFloat(data.summary.total_platform_commission),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className:
                "bg-white rounded-lg p-3 sm:p-4 shadow-sm border-2 border-[#195ADC]",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-center justify-between mb-1 sm:mb-2",
              },
              /*#__PURE__*/ React.createElement(
                "span",
                {
                  className: "text-xs sm:text-sm text-gray-600 font-medium",
                },
                "Net Payout",
              ),
              /*#__PURE__*/ React.createElement(DollarSign, {
                className: "h-3 w-3 sm:h-4 sm:w-4 text-[#195ADC]",
              }),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "text-lg sm:text-2xl font-bold text-[#195ADC]",
              },
              formatCurrency(parseFloat(data.summary.total_net_payout)),
            ),
          ),
        ),
      ),
    ),
    /*#__PURE__*/ React.createElement(
      Card,
      null,
      /*#__PURE__*/ React.createElement(
        CardHeader,
        null,
        /*#__PURE__*/ React.createElement(
          CardTitle,
          {
            className: "flex items-center gap-2",
          },
          /*#__PURE__*/ React.createElement(FileText, {
            className: "h-5 w-5",
          }),
          "Detailed Summary Report",
        ),
        /*#__PURE__*/ React.createElement(
          CardDescription,
          null,
          "Comprehensive financial insights and performance metrics",
        ),
      ),
      /*#__PURE__*/ React.createElement(
        CardContent,
        null,
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "space-y-6",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "grid grid-cols-1 sm:grid-cols-3 gap-3",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-lg p-3 sm:p-4",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "text-xs font-medium text-purple-600 mb-1",
                },
                "Avg Revenue/Event",
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "text-xl sm:text-2xl font-bold text-purple-900",
                },
                formatCurrency(averageRevenuePerEvent),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "text-xs text-purple-600 mt-1",
                },
                data.summary.total_events,
                " event",
                data.summary.total_events !== 1 ? "s" : "",
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-lg p-3 sm:p-4",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "text-xs font-medium text-orange-600 mb-1",
                },
                "Avg Tickets/Event",
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "text-xl sm:text-2xl font-bold text-orange-900",
                },
                averageTicketsPerEvent.toFixed(1),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "text-xs text-orange-600 mt-1",
                },
                data.summary.total_tickets_sold,
                " total",
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "bg-gradient-to-br from-cyan-50 to-white border border-cyan-200 rounded-lg p-3 sm:p-4",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "text-xs font-medium text-cyan-600 mb-1",
                },
                "Effective Fee",
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "text-xl sm:text-2xl font-bold text-cyan-900",
                },
                effectiveFeePercentage.toFixed(2),
                "%",
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "text-xs text-cyan-600 mt-1",
                },
                "Processing + CONVENEHUB",
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "border-t border-gray-200 pt-4",
            },
            /*#__PURE__*/ React.createElement(
              "h4",
              {
                className: "text-sm font-semibold text-gray-900 mb-3",
              },
              "Settlement Status",
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "grid grid-cols-2 gap-2 sm:gap-4",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "flex items-center justify-between p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "flex items-center gap-2 sm:gap-3",
                  },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 flex items-center justify-center",
                    },
                    /*#__PURE__*/ React.createElement(CheckCircle2, {
                      className: "h-4 w-4 sm:h-5 sm:w-5 text-green-600",
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    null,
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "text-xs sm:text-sm text-gray-600",
                      },
                      "Settled",
                    ),
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className:
                          "text-xl sm:text-2xl font-bold text-green-900",
                      },
                      settledEvents,
                    ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  Badge,
                  {
                    variant: "outline",
                    className:
                      "bg-green-100 text-green-700 border-green-300 text-xs hidden sm:inline-flex",
                  },
                  data.summary.total_events > 0
                    ? (
                        (settledEvents / data.summary.total_events) *
                        100
                      ).toFixed(0)
                    : 0,
                  "%",
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "flex items-center justify-between p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "flex items-center gap-2 sm:gap-3",
                  },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-yellow-100 flex items-center justify-center",
                    },
                    /*#__PURE__*/ React.createElement(Clock, {
                      className: "h-4 w-4 sm:h-5 sm:w-5 text-yellow-600",
                    }),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    null,
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "text-xs sm:text-sm text-gray-600",
                      },
                      "Pending",
                    ),
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className:
                          "text-xl sm:text-2xl font-bold text-yellow-900",
                      },
                      pendingEvents,
                    ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  Badge,
                  {
                    variant: "outline",
                    className:
                      "bg-yellow-100 text-yellow-700 border-yellow-300 text-xs hidden sm:inline-flex",
                  },
                  data.summary.total_events > 0
                    ? (
                        (pendingEvents / data.summary.total_events) *
                        100
                      ).toFixed(0)
                    : 0,
                  "%",
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "border-t border-gray-200 pt-4",
            },
            /*#__PURE__*/ React.createElement(
              "h4",
              {
                className: "text-sm font-semibold text-gray-900 mb-3",
              },
              "Financial Breakdown",
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "overflow-x-auto -mx-4 sm:mx-0",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "inline-block min-w-full align-middle px-4 sm:px-0",
                },
                /*#__PURE__*/ React.createElement(
                  "table",
                  {
                    className: "w-full text-xs sm:text-sm",
                  },
                  /*#__PURE__*/ React.createElement(
                    "thead",
                    null,
                    /*#__PURE__*/ React.createElement(
                      "tr",
                      {
                        className: "border-b border-gray-200",
                      },
                      /*#__PURE__*/ React.createElement(
                        "th",
                        {
                          className:
                            "text-left py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900",
                        },
                        "Category",
                      ),
                      /*#__PURE__*/ React.createElement(
                        "th",
                        {
                          className:
                            "text-right py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900",
                        },
                        "Amount",
                      ),
                      /*#__PURE__*/ React.createElement(
                        "th",
                        {
                          className:
                            "text-right py-2 sm:py-3 px-2 sm:px-4 font-medium text-gray-900",
                        },
                        "%",
                      ),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "tbody",
                    {
                      className: "divide-y divide-gray-200",
                    },
                    /*#__PURE__*/ React.createElement(
                      "tr",
                      {
                        className: "hover:bg-gray-50",
                      },
                      /*#__PURE__*/ React.createElement(
                        "td",
                        {
                          className: "py-2 sm:py-3 px-2 sm:px-4 text-gray-900",
                        },
                        "Gross Revenue",
                      ),
                      /*#__PURE__*/ React.createElement(
                        "td",
                        {
                          className:
                            "py-2 sm:py-3 px-2 sm:px-4 text-right font-semibold text-gray-900",
                        },
                        formatCurrency(
                          parseFloat(data.summary.total_gross_revenue),
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "td",
                        {
                          className:
                            "py-2 sm:py-3 px-2 sm:px-4 text-right text-gray-600",
                        },
                        "100%",
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      "tr",
                      {
                        className: "hover:bg-gray-50",
                      },
                      /*#__PURE__*/ React.createElement(
                        "td",
                        {
                          className: "py-2 sm:py-3 px-2 sm:px-4 text-gray-700",
                        },
                        /*#__PURE__*/ React.createElement(
                          "span",
                          {
                            className: "flex items-center gap-1 sm:gap-2",
                          },
                          /*#__PURE__*/ React.createElement("span", {
                            className:
                              "w-2 h-2 rounded-full bg-red-500 flex-shrink-0",
                          }),
                          /*#__PURE__*/ React.createElement(
                            "span",
                            {
                              className: "truncate",
                            },
                            "Processing Fees",
                          ),
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "td",
                        {
                          className:
                            "py-2 sm:py-3 px-2 sm:px-4 text-right font-medium text-red-600",
                        },
                        "-",
                        formatCurrency(
                          parseFloat(data.summary.total_processing_fees),
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "td",
                        {
                          className:
                            "py-2 sm:py-3 px-2 sm:px-4 text-right text-gray-600",
                        },
                        data.fee_structure.processing_fee_percentage,
                        "%",
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      "tr",
                      {
                        className: "hover:bg-gray-50",
                      },
                      /*#__PURE__*/ React.createElement(
                        "td",
                        {
                          className: "py-2 sm:py-3 px-2 sm:px-4 text-gray-700",
                        },
                        /*#__PURE__*/ React.createElement(
                          "span",
                          {
                            className: "flex items-center gap-1 sm:gap-2",
                          },
                          /*#__PURE__*/ React.createElement("span", {
                            className:
                              "w-2 h-2 rounded-full bg-green-500 flex-shrink-0",
                          }),
                          /*#__PURE__*/ React.createElement(
                            "span",
                            {
                              className: "truncate",
                            },
                            "CONVENEHUB",
                          ),
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "td",
                        {
                          className:
                            "py-2 sm:py-3 px-2 sm:px-4 text-right font-medium text-green-600",
                        },
                        "-",
                        formatCurrency(
                          parseFloat(data.summary.total_platform_commission),
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "td",
                        {
                          className:
                            "py-2 sm:py-3 px-2 sm:px-4 text-right text-gray-600",
                        },
                        parseFloat(data.summary.total_gross_revenue) > 0
                          ? (
                              (parseFloat(
                                data.summary.total_platform_commission,
                              ) /
                                parseFloat(data.summary.total_gross_revenue)) *
                              100
                            ).toFixed(1)
                          : 0,
                        "%",
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      "tr",
                      {
                        className:
                          "bg-blue-50 font-semibold border-t-2 border-blue-200",
                      },
                      /*#__PURE__*/ React.createElement(
                        "td",
                        {
                          className: "py-2 sm:py-3 px-2 sm:px-4 text-[#195ADC]",
                        },
                        "Net Payout",
                      ),
                      /*#__PURE__*/ React.createElement(
                        "td",
                        {
                          className:
                            "py-2 sm:py-3 px-2 sm:px-4 text-right text-[#195ADC]",
                        },
                        formatCurrency(
                          parseFloat(data.summary.total_net_payout),
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "td",
                        {
                          className:
                            "py-2 sm:py-3 px-2 sm:px-4 text-right text-[#195ADC]",
                        },
                        parseFloat(data.summary.total_gross_revenue) > 0
                          ? (
                              (parseFloat(data.summary.total_net_payout) /
                                parseFloat(data.summary.total_gross_revenue)) *
                              100
                            ).toFixed(1)
                          : 0,
                        "%",
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
              className: "border-t border-gray-200 pt-4 flex flex-col gap-3",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex flex-wrap gap-2",
              },
              /*#__PURE__*/ React.createElement(
                Button,
                {
                  onClick: downloadAllData,
                  variant: "outline",
                  size: "sm",
                  className: "gap-2 flex-1 sm:flex-none",
                },
                /*#__PURE__*/ React.createElement(Download, {
                  className: "h-4 w-4",
                }),
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "hidden sm:inline",
                  },
                  "Export Full Report",
                ),
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "sm:hidden",
                  },
                  "Export",
                ),
              ),
              showAdminActions &&
                /*#__PURE__*/ React.createElement(
                  Button,
                  {
                    onClick: openSummaryEmailModal,
                    variant: "outline",
                    size: "sm",
                    className: "gap-2 flex-1 sm:flex-none",
                  },
                  /*#__PURE__*/ React.createElement(Mail, {
                    className: "h-4 w-4",
                  }),
                  /*#__PURE__*/ React.createElement(
                    "span",
                    {
                      className: "hidden sm:inline",
                    },
                    "Email Summary",
                  ),
                  /*#__PURE__*/ React.createElement(
                    "span",
                    {
                      className: "sm:hidden",
                    },
                    "Email",
                  ),
                ),
            ),
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "text-xs text-gray-500 text-center sm:text-left",
              },
              data.summary.total_events,
              " event",
              data.summary.total_events !== 1 ? "s" : "",
              " \u2022 ",
              data.summary.total_tickets_sold,
              " tickets",
            ),
          ),
        ),
      ),
    ),
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "space-y-3 sm:space-y-4",
      },
      /*#__PURE__*/ React.createElement(
        "h3",
        {
          className: "text-base sm:text-lg font-semibold text-gray-900",
        },
        "Event-wise Breakdown",
      ),
      data.events.map((event) => {
        const isExpanded = expandedEvents.has(event.event_id);
        const netPayout = parseFloat(
          event.financial_summary.net_payout_to_movie_team,
        );
        return /*#__PURE__*/ React.createElement(
          Card,
          {
            key: event.event_id,
            className: "border-gray-200",
          },
          /*#__PURE__*/ React.createElement(
            CardHeader,
            {
              className:
                "cursor-pointer hover:bg-gray-50 transition-colors p-3 sm:p-6",
              onClick: () => toggleEventExpanded(event.event_id),
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "flex-1 min-w-0",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "flex flex-wrap items-center gap-2 mb-1 sm:mb-2",
                  },
                  /*#__PURE__*/ React.createElement(
                    CardTitle,
                    {
                      className: "text-base sm:text-lg truncate",
                    },
                    event.title,
                  ),
                  /*#__PURE__*/ React.createElement(
                    Badge,
                    {
                      variant:
                        event.status === "ended" ? "secondary" : "outline",
                      className: "text-xs flex-shrink-0",
                    },
                    event.status,
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  CardDescription,
                  {
                    className: "text-xs sm:text-sm",
                  },
                  new Date(event.date_time).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }),
                  " \u2022 ",
                  event.bookings.length,
                  " booking",
                  event.bookings.length !== 1 ? "s" : "",
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "text-left sm:text-right flex-shrink-0",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "text-xs text-gray-500 mb-0.5",
                  },
                  "Net Payout",
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "text-lg sm:text-xl font-bold text-[#195ADC]",
                  },
                  formatCurrency(netPayout),
                ),
              ),
            ),
          ),
          isExpanded &&
            /*#__PURE__*/ React.createElement(
              CardContent,
              {
                className: "border-t border-gray-100 pt-4 sm:pt-6",
              },
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "bg-gray-50 rounded-lg p-4",
                  },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "text-xs text-gray-600 mb-1",
                    },
                    "Gross Revenue",
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "text-lg font-semibold text-gray-900",
                    },
                    formatCurrency(
                      parseFloat(event.financial_summary.gross_revenue),
                    ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "bg-gray-50 rounded-lg p-4",
                  },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "text-xs text-gray-600 mb-1",
                    },
                    "Processing Fees",
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "text-lg font-semibold text-red-600",
                    },
                    "-",
                    formatCurrency(
                      parseFloat(event.financial_summary.processing_fees),
                    ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "bg-gray-50 rounded-lg p-4",
                  },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "text-xs text-gray-600 mb-1",
                    },
                    "CONVENEHUB Commission (",
                    event.financial_summary.platform_commission_percentage,
                    "%)",
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "text-lg font-semibold text-green-600",
                    },
                    "-",
                    formatCurrency(
                      parseFloat(event.financial_summary.platform_commission),
                    ),
                  ),
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "bg-blue-50 rounded-lg p-4 border-2 border-[#195ADC]",
                  },
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "text-xs text-[#195ADC] font-medium mb-1",
                    },
                    "Net Payout",
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className: "text-lg font-semibold text-[#195ADC]",
                    },
                    formatCurrency(netPayout),
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className:
                    "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-100",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "flex flex-wrap items-center gap-2 sm:gap-3",
                  },
                  /*#__PURE__*/ React.createElement(
                    Button,
                    {
                      onClick: () => downloadCSV(event),
                      variant: "outline",
                      size: "sm",
                      className: "gap-2",
                    },
                    /*#__PURE__*/ React.createElement(Download, {
                      className: "h-4 w-4",
                    }),
                    "Download Report",
                  ),
                  showAdminActions &&
                    (event.settlement_status === "settled"
                      ? /*#__PURE__*/ React.createElement(
                          Button,
                          {
                            disabled: true,
                            variant: "default",
                            size: "sm",
                            className:
                              "gap-2 bg-green-600 hover:bg-green-600 cursor-default",
                          },
                          /*#__PURE__*/ React.createElement(CheckCircle2, {
                            className: "h-4 w-4",
                          }),
                          "\u2713 Settled",
                        )
                      : /*#__PURE__*/ React.createElement(
                          Button,
                          {
                            onClick: () => openSettlementModal(event),
                            variant: "default",
                            size: "sm",
                            className: "gap-2 bg-[#195ADC] hover:bg-[#1451c4]",
                          },
                          /*#__PURE__*/ React.createElement(CheckCircle2, {
                            className: "h-4 w-4",
                          }),
                          "Mark as Paid",
                        )),
                ),
                showAdminActions &&
                  /*#__PURE__*/ React.createElement(
                    Button,
                    {
                      onClick: () => openEmailModal(event),
                      variant: "outline",
                      size: "sm",
                      className: "gap-2",
                    },
                    /*#__PURE__*/ React.createElement(Mail, {
                      className: "h-4 w-4",
                    }),
                    "Send Email",
                  ),
              ),
              (() => {
                // Debug logging
                if (event.settlement_status === "settled") {
                }
                return null;
              })(),
              event.settlement_status === "settled" &&
                event.settlement_details &&
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "mb-6 pb-6 border-b border-gray-100",
                  },
                  /*#__PURE__*/ React.createElement(
                    "h4",
                    {
                      className:
                        "text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2",
                    },
                    /*#__PURE__*/ React.createElement(CheckCircle2, {
                      className: "h-4 w-4 text-green-600",
                    }),
                    "Settlement Details",
                  ),
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      className:
                        "bg-green-50 border border-green-200 rounded-lg p-4",
                    },
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "grid grid-cols-1 md:grid-cols-2 gap-4",
                      },
                      /*#__PURE__*/ React.createElement(
                        "div",
                        null,
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className:
                              "text-xs text-green-700 font-medium mb-1",
                          },
                          "Transaction Reference",
                        ),
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className: "text-sm font-mono text-green-900",
                          },
                          event.settlement_details.transaction_reference,
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "div",
                        null,
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className:
                              "text-xs text-green-700 font-medium mb-1",
                          },
                          "Transfer Date",
                        ),
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className: "text-sm text-green-900",
                          },
                          new Date(
                            event.settlement_details.transfer_date,
                          ).toLocaleDateString("en-IN", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }),
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "div",
                        null,
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className:
                              "text-xs text-green-700 font-medium mb-1",
                          },
                          "Payment Method",
                        ),
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className: "text-sm text-green-900",
                          },
                          event.settlement_details.payment_method
                            .replace(/_/g, " ")
                            .toUpperCase(),
                        ),
                      ),
                      event.settlement_details.notes &&
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className: "md:col-span-2",
                          },
                          /*#__PURE__*/ React.createElement(
                            "div",
                            {
                              className:
                                "text-xs text-green-700 font-medium mb-1",
                            },
                            "Notes",
                          ),
                          /*#__PURE__*/ React.createElement(
                            "div",
                            {
                              className: "text-sm text-green-900",
                            },
                            event.settlement_details.notes,
                          ),
                        ),
                    ),
                  ),
                ),
              /*#__PURE__*/ React.createElement(
                "div",
                null,
                /*#__PURE__*/ React.createElement(
                  "h4",
                  {
                    className: "text-sm font-semibold text-gray-900 mb-3",
                  },
                  "Bookings",
                ),
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "overflow-x-auto",
                  },
                  /*#__PURE__*/ React.createElement(
                    "table",
                    {
                      className: "w-full text-sm",
                    },
                    /*#__PURE__*/ React.createElement(
                      "thead",
                      {
                        className: "bg-gray-50 border-y border-gray-200",
                      },
                      /*#__PURE__*/ React.createElement(
                        "tr",
                        null,
                        /*#__PURE__*/ React.createElement(
                          "th",
                          {
                            className:
                              "px-4 py-3 text-left font-medium text-gray-600",
                          },
                          "Booking ID",
                        ),
                        /*#__PURE__*/ React.createElement(
                          "th",
                          {
                            className:
                              "px-4 py-3 text-center font-medium text-gray-600",
                          },
                          "Tickets",
                        ),
                        /*#__PURE__*/ React.createElement(
                          "th",
                          {
                            className:
                              "px-4 py-3 text-right font-medium text-gray-600",
                          },
                          "Total",
                        ),
                        /*#__PURE__*/ React.createElement(
                          "th",
                          {
                            className:
                              "px-4 py-3 text-center font-medium text-gray-600",
                          },
                          "Status",
                        ),
                        /*#__PURE__*/ React.createElement(
                          "th",
                          {
                            className:
                              "px-4 py-3 text-center font-medium text-gray-600",
                          },
                          "Date",
                        ),
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      "tbody",
                      {
                        className: "divide-y divide-gray-100",
                      },
                      event.bookings.map((booking) =>
                        /*#__PURE__*/ React.createElement(
                          "tr",
                          {
                            key: booking.booking_id,
                            className: "hover:bg-gray-50",
                          },
                          /*#__PURE__*/ React.createElement(
                            "td",
                            {
                              className:
                                "px-4 py-3 text-gray-900 font-mono text-sm",
                            },
                            booking.booking_id.slice(0, 8),
                          ),
                          /*#__PURE__*/ React.createElement(
                            "td",
                            {
                              className: "px-4 py-3 text-center text-gray-900",
                            },
                            booking.tickets_count,
                          ),
                          /*#__PURE__*/ React.createElement(
                            "td",
                            {
                              className:
                                "px-4 py-3 text-right font-mono font-semibold text-gray-900",
                            },
                            formatCurrency(parseFloat(booking.total_amount)),
                          ),
                          /*#__PURE__*/ React.createElement(
                            "td",
                            {
                              className: "px-4 py-3 text-center",
                            },
                            /*#__PURE__*/ React.createElement(
                              Badge,
                              {
                                variant:
                                  booking.payment_status === "paid"
                                    ? "default"
                                    : "outline",
                                className: "font-medium",
                              },
                              booking.payment_status,
                            ),
                          ),
                          /*#__PURE__*/ React.createElement(
                            "td",
                            {
                              className: "px-4 py-3 text-center text-gray-600",
                            },
                            new Date(booking.booked_at).toLocaleDateString(),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
        );
      }),
    ),
    /*#__PURE__*/ React.createElement(
      Card,
      {
        className: "border-blue-200 bg-blue-50",
      },
      /*#__PURE__*/ React.createElement(
        CardContent,
        {
          className: "p-4 sm:pt-6",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "flex gap-3",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "flex-shrink-0",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100",
              },
              /*#__PURE__*/ React.createElement(AlertCircle, {
                className: "h-4 w-4 sm:h-5 sm:w-5 text-blue-600",
              }),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "min-w-0",
            },
            /*#__PURE__*/ React.createElement(
              "h4",
              {
                className:
                  "text-xs sm:text-sm font-semibold text-blue-900 mb-1",
              },
              "About Financial Calculations",
            ),
            /*#__PURE__*/ React.createElement(
              "p",
              {
                className: "text-xs sm:text-sm text-blue-700 leading-relaxed",
              },
              "All calculations use precise decimal arithmetic. Processing charges are ",
              data.fee_structure.processing_fee_percentage,
              "% per transaction, CONVENEHUB commission varies by event. Net payout = Gross - processing fees - CONVENEHUB commission.",
            ),
          ),
        ),
      ),
    ),
    showAdminActions &&
      settlementModal.event &&
      /*#__PURE__*/ React.createElement(SettlementModal, {
        isOpen: settlementModal.isOpen,
        onClose: closeSettlementModal,
        onSuccess: handleSettlementSuccess,
        event: settlementModal.event,
      }),
    /*#__PURE__*/ React.createElement(
      Dialog,
      {
        open: showAdminActions && emailModal.isOpen,
        onOpenChange: closeEmailModal,
      },
      /*#__PURE__*/ React.createElement(
        DialogContent,
        {
          className: "sm:max-w-[450px]",
        },
        emailModal.success
          ? /*#__PURE__*/ React.createElement(
              React.Fragment,
              null,
              /*#__PURE__*/ React.createElement(
                DialogHeader,
                null,
                /*#__PURE__*/ React.createElement(
                  DialogTitle,
                  {
                    className: "text-center",
                  },
                  "Email Sent Successfully",
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "py-8 text-center",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className:
                      "mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center",
                  },
                  /*#__PURE__*/ React.createElement(CheckCircle2, {
                    className: "h-6 w-6 text-green-600",
                  }),
                ),
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "text-sm text-gray-600 mb-2",
                  },
                  "Settlement report has been sent to",
                ),
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "font-medium text-gray-900 break-all",
                  },
                  movieTeamEmail,
                ),
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "text-xs text-gray-500 mt-4",
                  },
                  "The CSV report and financial details have been attached",
                ),
              ),
            )
          : /*#__PURE__*/ React.createElement(
              React.Fragment,
              null,
              /*#__PURE__*/ React.createElement(
                DialogHeader,
                null,
                /*#__PURE__*/ React.createElement(
                  DialogTitle,
                  null,
                  "Send Settlement Report",
                ),
                /*#__PURE__*/ React.createElement(
                  DialogDescription,
                  null,
                  "Send the financial settlement report for ",
                  /*#__PURE__*/ React.createElement(
                    "strong",
                    null,
                    emailModal.event?.title,
                  ),
                  " to the event operations team.",
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "space-y-4 py-4",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "space-y-2",
                  },
                  /*#__PURE__*/ React.createElement(
                    Label,
                    {
                      htmlFor: "movie_team_email",
                    },
                    "Event Operations Email Address ",
                    /*#__PURE__*/ React.createElement(
                      "span",
                      {
                        className: "text-red-500",
                      },
                      "*",
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(Input, {
                    id: "movie_team_email",
                    type: "email",
                    placeholder: "ops@convenehub.com",
                    value: movieTeamEmail,
                    onChange: (e) => setMovieTeamEmail(e.target.value),
                    disabled: emailModal.loading,
                  }),
                  /*#__PURE__*/ React.createElement(
                    "p",
                    {
                      className: "text-xs text-gray-500",
                    },
                    "The settlement report will be sent to this email address with CSV attachment",
                  ),
                ),
                emailModal.error &&
                  /*#__PURE__*/ React.createElement(
                    Alert,
                    {
                      variant: "destructive",
                    },
                    /*#__PURE__*/ React.createElement(AlertCircle, {
                      className: "h-4 w-4",
                    }),
                    /*#__PURE__*/ React.createElement(
                      AlertDescription,
                      null,
                      emailModal.error,
                    ),
                  ),
                /*#__PURE__*/ React.createElement(
                  Alert,
                  null,
                  /*#__PURE__*/ React.createElement(AlertCircle, {
                    className: "h-4 w-4",
                  }),
                  /*#__PURE__*/ React.createElement(
                    AlertDescription,
                    null,
                    /*#__PURE__*/ React.createElement(
                      "strong",
                      null,
                      "Details included:",
                    ),
                    " Financial breakdown, CSV report attachment, gross revenue, fees, and net payout.",
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                DialogFooter,
                null,
                /*#__PURE__*/ React.createElement(
                  Button,
                  {
                    type: "button",
                    variant: "outline",
                    onClick: closeEmailModal,
                    disabled: emailModal.loading,
                  },
                  "Cancel",
                ),
                /*#__PURE__*/ React.createElement(
                  Button,
                  {
                    onClick: handleSendEmail,
                    disabled: emailModal.loading || !movieTeamEmail.trim(),
                    className: "bg-[#195ADC] hover:bg-[#1451c4]",
                  },
                  emailModal.loading
                    ? /*#__PURE__*/ React.createElement(
                        React.Fragment,
                        null,
                        /*#__PURE__*/ React.createElement(Clock, {
                          className: "mr-2 h-4 w-4 animate-spin",
                        }),
                        "Sending...",
                      )
                    : /*#__PURE__*/ React.createElement(
                        React.Fragment,
                        null,
                        /*#__PURE__*/ React.createElement(Mail, {
                          className: "mr-2 h-4 w-4",
                        }),
                        "Send Report",
                      ),
                ),
              ),
            ),
      ),
    ),
    /*#__PURE__*/ React.createElement(
      Dialog,
      {
        open: showAdminActions && summaryEmailModal.isOpen,
        onOpenChange: closeSummaryEmailModal,
      },
      /*#__PURE__*/ React.createElement(
        DialogContent,
        {
          className: "sm:max-w-[500px]",
        },
        summaryEmailModal.success
          ? /*#__PURE__*/ React.createElement(
              React.Fragment,
              null,
              /*#__PURE__*/ React.createElement(
                DialogHeader,
                null,
                /*#__PURE__*/ React.createElement(
                  DialogTitle,
                  {
                    className: "flex items-center gap-2 text-green-600",
                  },
                  /*#__PURE__*/ React.createElement(CheckCircle2, {
                    className: "h-5 w-5",
                  }),
                  "Email Sent Successfully!",
                ),
                /*#__PURE__*/ React.createElement(
                  DialogDescription,
                  null,
                  "The overall financial summary report has been sent successfully.",
                ),
              ),
            )
          : /*#__PURE__*/ React.createElement(
              React.Fragment,
              null,
              /*#__PURE__*/ React.createElement(
                DialogHeader,
                null,
                /*#__PURE__*/ React.createElement(
                  DialogTitle,
                  {
                    className: "flex items-center gap-2",
                  },
                  /*#__PURE__*/ React.createElement(Mail, {
                    className: "h-5 w-5",
                  }),
                  "Email Overall Summary Report",
                ),
                /*#__PURE__*/ React.createElement(
                  DialogDescription,
                  null,
                  "Send a comprehensive financial summary report via email",
                ),
              ),
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "space-y-4 py-4",
                },
                /*#__PURE__*/ React.createElement(
                  "div",
                  {
                    className: "space-y-2",
                  },
                  /*#__PURE__*/ React.createElement(
                    Label,
                    {
                      htmlFor: "summary_recipient_email",
                    },
                    "Recipient Email Address *",
                  ),
                  /*#__PURE__*/ React.createElement(Input, {
                    id: "summary_recipient_email",
                    type: "email",
                    placeholder: "admin@example.com",
                    value: summaryRecipientEmail,
                    onChange: (e) => setSummaryRecipientEmail(e.target.value),
                    disabled: summaryEmailModal.loading,
                  }),
                  /*#__PURE__*/ React.createElement(
                    "p",
                    {
                      className: "text-xs text-gray-500",
                    },
                    "The complete financial summary with all events will be sent to this email",
                  ),
                ),
                summaryEmailModal.error &&
                  /*#__PURE__*/ React.createElement(
                    Alert,
                    {
                      variant: "destructive",
                    },
                    /*#__PURE__*/ React.createElement(AlertCircle, {
                      className: "h-4 w-4",
                    }),
                    /*#__PURE__*/ React.createElement(
                      AlertDescription,
                      null,
                      summaryEmailModal.error,
                    ),
                  ),
                /*#__PURE__*/ React.createElement(
                  Alert,
                  null,
                  /*#__PURE__*/ React.createElement(AlertCircle, {
                    className: "h-4 w-4",
                  }),
                  /*#__PURE__*/ React.createElement(
                    AlertDescription,
                    null,
                    /*#__PURE__*/ React.createElement(
                      "strong",
                      null,
                      "Report includes:",
                    ),
                    /*#__PURE__*/ React.createElement(
                      "ul",
                      {
                        className:
                          "list-disc list-inside mt-2 text-sm space-y-1",
                      },
                      /*#__PURE__*/ React.createElement(
                        "li",
                        null,
                        "Overall financial summary",
                      ),
                      /*#__PURE__*/ React.createElement(
                        "li",
                        null,
                        "Event-wise breakdown with commission rates",
                      ),
                      /*#__PURE__*/ React.createElement(
                        "li",
                        null,
                        "Settlement status for all events",
                      ),
                      /*#__PURE__*/ React.createElement(
                        "li",
                        null,
                        "Complete booking details",
                      ),
                      /*#__PURE__*/ React.createElement(
                        "li",
                        null,
                        "CSV attachment for offline analysis",
                      ),
                    ),
                  ),
                ),
              ),
              /*#__PURE__*/ React.createElement(
                DialogFooter,
                null,
                /*#__PURE__*/ React.createElement(
                  Button,
                  {
                    type: "button",
                    variant: "outline",
                    onClick: closeSummaryEmailModal,
                    disabled: summaryEmailModal.loading,
                  },
                  "Cancel",
                ),
                /*#__PURE__*/ React.createElement(
                  Button,
                  {
                    onClick: handleSendSummaryEmail,
                    disabled:
                      summaryEmailModal.loading ||
                      !summaryRecipientEmail.trim(),
                    className: "bg-[#195ADC] hover:bg-[#1451c4]",
                  },
                  summaryEmailModal.loading
                    ? /*#__PURE__*/ React.createElement(
                        React.Fragment,
                        null,
                        /*#__PURE__*/ React.createElement(Clock, {
                          className: "mr-2 h-4 w-4 animate-spin",
                        }),
                        "Sending...",
                      )
                    : /*#__PURE__*/ React.createElement(
                        React.Fragment,
                        null,
                        /*#__PURE__*/ React.createElement(Mail, {
                          className: "mr-2 h-4 w-4",
                        }),
                        "Send Summary Report",
                      ),
                ),
              ),
            ),
      ),
    ),
  );
}
