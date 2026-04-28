"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
export default function ReconciliationDashboard() {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState("checkin_rate");
  useEffect(() => {
    fetchReconciliationData();
  }, []);
  const fetchReconciliationData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/reconciliation");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to fetch reconciliation data",
        );
      }
      const result = await response.json();
      setData(result.events || []);
      setSummary(result.summary || null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred";
      setError(errorMsg);
      setData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "flex items-center justify-center min-h-[400px]",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "text-center space-y-3",
        },
        /*#__PURE__*/ React.createElement("div", {
          className:
            "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto",
        }),
        /*#__PURE__*/ React.createElement(
          "p",
          {
            className: "text-sm text-gray-500",
          },
          "Loading reconciliation data...",
        ),
      ),
    );
  }
  if (error) {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "max-w-2xl mx-auto mt-8",
      },
      /*#__PURE__*/ React.createElement(
        Alert,
        {
          variant: "destructive",
          className: "border-red-200 bg-red-50",
        },
        /*#__PURE__*/ React.createElement(AlertCircle, {
          className: "h-5 w-5 text-red-600",
        }),
        /*#__PURE__*/ React.createElement(
          AlertDescription,
          {
            className: "text-red-800 ml-2",
          },
          error,
        ),
      ),
    );
  }
  if (!data || !summary) {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "flex items-center justify-center min-h-[400px]",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "text-center space-y-3",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className:
              "w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto",
          },
          /*#__PURE__*/ React.createElement(BarChart, {
            className: "h-8 w-8 text-gray-400",
          }),
        ),
        /*#__PURE__*/ React.createElement(
          "p",
          {
            className: "text-gray-500",
          },
          "No reconciliation data available",
        ),
      ),
    );
  }

  // Prepare chart data
  const totalNoShows = data.reduce((sum, e) => sum + e.no_shows, 0);
  const totalPendingPayments = data.reduce(
    (sum, e) => sum + e.pending_payments,
    0,
  );
  const overviewData = [
    {
      name: "Bookings",
      value: summary.total_bookings,
      color: "#3B82F6",
      icon: Users,
    },
    {
      name: "Check-ins",
      value: summary.total_checkins,
      color: "#10B981",
      icon: UserCheck,
    },
    {
      name: "No-shows",
      value: totalNoShows,
      color: "#F59E0B",
      icon: UserX,
    },
    {
      name: "Pending",
      value: totalPendingPayments,
      color: "#6366F1",
      icon: Clock,
    },
  ];
  const statusDistribution = [
    {
      name: "Matched",
      value: summary.matched_events,
      color: "#10B981",
    },
    {
      name: "Discrepancies",
      value: summary.discrepancy_events,
      color: "#EF4444",
    },
    {
      name: "Pending",
      value: summary.pending_events,
      color: "#F59E0B",
    },
  ];
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className: "space-y-8 pb-8",
    },
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className:
          "bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "flex items-start justify-between",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          null,
          /*#__PURE__*/ React.createElement(
            "h2",
            {
              className: "text-2xl font-bold text-gray-900 mb-2",
            },
            "Reconciliation Overview",
          ),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-gray-600",
            },
            "Track attendance vs bookings across all events",
          ),
        ),
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "bg-white rounded-xl p-4 shadow-sm",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "text-3xl font-bold text-blue-600",
            },
            summary.overall_checkin_rate.toFixed(0),
            "%",
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "text-xs text-gray-500 mt-1",
            },
            "Check-in Rate",
          ),
        ),
      ),
    ),
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",
      },
      overviewData.map((metric) => {
        const Icon = metric.icon;
        return /*#__PURE__*/ React.createElement(
          "div",
          {
            key: metric.name,
            className:
              "bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "flex items-center justify-between mb-4",
            },
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className:
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                style: {
                  backgroundColor: `${metric.color}15`,
                },
              },
              /*#__PURE__*/ React.createElement(Icon, {
                className: "w-6 h-6",
                style: {
                  color: metric.color,
                },
              }),
            ),
            metric.name === "No-shows" &&
              metric.value > 0 &&
              /*#__PURE__*/ React.createElement(AlertTriangle, {
                className: "w-5 h-5 text-orange-500",
              }),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "text-3xl font-bold text-gray-900 mb-1",
            },
            metric.value,
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "text-sm text-gray-500",
            },
            metric.name,
          ),
        );
      }),
    ),
    summary.discrepancy_events > 0 &&
      /*#__PURE__*/ React.createElement(
        Alert,
        {
          className: "border-orange-200 bg-orange-50",
        },
        /*#__PURE__*/ React.createElement(AlertTriangle, {
          className: "h-5 w-5 text-orange-600",
        }),
        /*#__PURE__*/ React.createElement(
          AlertDescription,
          {
            className: "ml-2 text-orange-800",
          },
          /*#__PURE__*/ React.createElement(
            "span",
            {
              className: "font-semibold",
            },
            summary.discrepancy_events,
            " event(s)",
          ),
          " have discrepancies between bookings and check-ins.",
          summary.discrepancies.map((disc, idx) =>
            /*#__PURE__*/ React.createElement(
              "div",
              {
                key: idx,
                className: "mt-1 text-sm",
              },
              "\u2022 ",
              disc.description,
            ),
          ),
        ),
      ),
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "grid grid-cols-1 lg:grid-cols-2 gap-6",
      },
      /*#__PURE__*/ React.createElement(
        Card,
        {
          className: "border-gray-200",
        },
        /*#__PURE__*/ React.createElement(
          CardHeader,
          null,
          /*#__PURE__*/ React.createElement(
            CardTitle,
            {
              className: "text-lg",
            },
            "Event Status Distribution",
          ),
          /*#__PURE__*/ React.createElement(
            CardDescription,
            null,
            "Reconciliation status across events",
          ),
        ),
        /*#__PURE__*/ React.createElement(
          CardContent,
          null,
          /*#__PURE__*/ React.createElement(
            ResponsiveContainer,
            {
              width: "100%",
              height: 280,
            },
            /*#__PURE__*/ React.createElement(
              PieChart,
              null,
              /*#__PURE__*/ React.createElement(
                Pie,
                {
                  data: statusDistribution,
                  cx: "50%",
                  cy: "50%",
                  innerRadius: 60,
                  outerRadius: 90,
                  paddingAngle: 4,
                  dataKey: "value",
                },
                statusDistribution.map((entry, index) =>
                  /*#__PURE__*/ React.createElement(Cell, {
                    key: `cell-${index}`,
                    fill: entry.color,
                  }),
                ),
              ),
              /*#__PURE__*/ React.createElement(Tooltip, null),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "flex justify-center gap-6 mt-4",
            },
            statusDistribution.map((item) =>
              /*#__PURE__*/ React.createElement(
                "div",
                {
                  key: item.name,
                  className: "flex items-center gap-2",
                },
                /*#__PURE__*/ React.createElement("div", {
                  className: "w-3 h-3 rounded-full",
                  style: {
                    backgroundColor: item.color,
                  },
                }),
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "text-sm text-gray-600",
                  },
                  item.name,
                ),
                /*#__PURE__*/ React.createElement(
                  "span",
                  {
                    className: "text-sm font-semibold text-gray-900",
                  },
                  item.value,
                ),
              ),
            ),
          ),
        ),
      ),
      /*#__PURE__*/ React.createElement(
        Card,
        {
          className: "border-gray-200",
        },
        /*#__PURE__*/ React.createElement(
          CardHeader,
          null,
          /*#__PURE__*/ React.createElement(
            CardTitle,
            {
              className: "text-lg",
            },
            "Key Insights",
          ),
          /*#__PURE__*/ React.createElement(
            CardDescription,
            null,
            "Analysis & recommendations",
          ),
        ),
        /*#__PURE__*/ React.createElement(
          CardContent,
          {
            className: "space-y-4",
          },
          /*#__PURE__*/ React.createElement(
            "div",
            {
              className: "flex items-start gap-3 p-3 bg-green-50 rounded-lg",
            },
            /*#__PURE__*/ React.createElement(CheckCircle2, {
              className: "w-5 h-5 text-green-600 mt-0.5 flex-shrink-0",
            }),
            /*#__PURE__*/ React.createElement(
              "div",
              null,
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-sm font-medium text-green-900",
                },
                summary.matched_events,
                " events perfectly reconciled",
              ),
              /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-xs text-green-700 mt-1",
                },
                "Check-ins match bookings with no discrepancies",
              ),
            ),
          ),
          totalNoShows > summary.total_bookings * 0.15 &&
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-start gap-3 p-3 bg-orange-50 rounded-lg",
              },
              /*#__PURE__*/ React.createElement(AlertTriangle, {
                className: "w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0",
              }),
              /*#__PURE__*/ React.createElement(
                "div",
                null,
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "text-sm font-medium text-orange-900",
                  },
                  "High no-show rate detected",
                ),
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "text-xs text-orange-700 mt-1",
                  },
                  ((totalNoShows / summary.total_bookings) * 100).toFixed(1),
                  "% of bookings didn't show up",
                ),
              ),
            ),
          totalPendingPayments > 0 &&
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-start gap-3 p-3 bg-blue-50 rounded-lg",
              },
              /*#__PURE__*/ React.createElement(Clock, {
                className: "w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0",
              }),
              /*#__PURE__*/ React.createElement(
                "div",
                null,
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "text-sm font-medium text-blue-900",
                  },
                  totalPendingPayments,
                  " pending payments",
                ),
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "text-xs text-blue-700 mt-1",
                  },
                  "Awaiting payment verification",
                ),
              ),
            ),
          summary.matched_events === summary.total_events &&
            /*#__PURE__*/ React.createElement(
              "div",
              {
                className: "flex items-start gap-3 p-3 bg-blue-50 rounded-lg",
              },
              /*#__PURE__*/ React.createElement(TrendingUp, {
                className: "w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0",
              }),
              /*#__PURE__*/ React.createElement(
                "div",
                null,
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "text-sm font-medium text-blue-900",
                  },
                  "Perfect reconciliation",
                ),
                /*#__PURE__*/ React.createElement(
                  "p",
                  {
                    className: "text-xs text-blue-700 mt-1",
                  },
                  "All events are fully reconciled",
                ),
              ),
            ),
        ),
      ),
    ),
    /*#__PURE__*/ React.createElement(
      Card,
      {
        className: "border-gray-200",
      },
      /*#__PURE__*/ React.createElement(
        CardHeader,
        null,
        /*#__PURE__*/ React.createElement(
          CardTitle,
          {
            className: "text-lg",
          },
          "Event Details",
        ),
        /*#__PURE__*/ React.createElement(
          CardDescription,
          null,
          "Detailed reconciliation status for each event",
        ),
      ),
      /*#__PURE__*/ React.createElement(
        CardContent,
        null,
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "overflow-x-auto",
          },
          /*#__PURE__*/ React.createElement(
            "table",
            {
              className: "w-full",
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
                      "text-left py-3 px-4 text-sm font-semibold text-gray-700",
                  },
                  "Event",
                ),
                /*#__PURE__*/ React.createElement(
                  "th",
                  {
                    className:
                      "text-center py-3 px-4 text-sm font-semibold text-gray-700",
                  },
                  "Bookings",
                ),
                /*#__PURE__*/ React.createElement(
                  "th",
                  {
                    className:
                      "text-center py-3 px-4 text-sm font-semibold text-gray-700",
                  },
                  "Check-ins",
                ),
                /*#__PURE__*/ React.createElement(
                  "th",
                  {
                    className:
                      "text-center py-3 px-4 text-sm font-semibold text-gray-700",
                  },
                  "Rate",
                ),
                /*#__PURE__*/ React.createElement(
                  "th",
                  {
                    className:
                      "text-center py-3 px-4 text-sm font-semibold text-gray-700",
                  },
                  "Paid",
                ),
                /*#__PURE__*/ React.createElement(
                  "th",
                  {
                    className:
                      "text-center py-3 px-4 text-sm font-semibold text-gray-700",
                  },
                  "Status",
                ),
              ),
            ),
            /*#__PURE__*/ React.createElement(
              "tbody",
              {
                className: "divide-y divide-gray-100",
              },
              data.map((event) =>
                /*#__PURE__*/ React.createElement(
                  "tr",
                  {
                    key: event.event_id,
                    className: "hover:bg-gray-50 transition-colors",
                  },
                  /*#__PURE__*/ React.createElement(
                    "td",
                    {
                      className: "py-4 px-4",
                    },
                    /*#__PURE__*/ React.createElement(
                      "div",
                      null,
                      /*#__PURE__*/ React.createElement(
                        "p",
                        {
                          className: "font-medium text-gray-900",
                        },
                        event.event_title,
                      ),
                      /*#__PURE__*/ React.createElement(
                        "p",
                        {
                          className: "text-xs text-gray-500 mt-1",
                        },
                        new Date(event.event_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }),
                      ),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "td",
                    {
                      className: "py-4 px-4 text-center",
                    },
                    /*#__PURE__*/ React.createElement(
                      "span",
                      {
                        className: "text-sm font-medium text-gray-900",
                      },
                      event.total_bookings,
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "td",
                    {
                      className: "py-4 px-4 text-center",
                    },
                    /*#__PURE__*/ React.createElement(
                      "span",
                      {
                        className: "text-sm font-medium text-gray-900",
                      },
                      event.total_checkins,
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "td",
                    {
                      className: "py-4 px-4 text-center",
                    },
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "inline-flex items-center gap-1",
                      },
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className:
                            "w-16 h-2 bg-gray-200 rounded-full overflow-hidden",
                        },
                        /*#__PURE__*/ React.createElement("div", {
                          className: "h-full bg-blue-600 rounded-full",
                          style: {
                            width: `${event.checkin_to_payment_ratio}%`,
                          },
                        }),
                      ),
                      /*#__PURE__*/ React.createElement(
                        "span",
                        {
                          className: "text-xs font-medium text-gray-700 ml-1",
                        },
                        event.checkin_to_payment_ratio.toFixed(0),
                        "%",
                      ),
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "td",
                    {
                      className: "py-4 px-4 text-center",
                    },
                    /*#__PURE__*/ React.createElement(
                      "span",
                      {
                        className: "text-sm font-medium text-gray-900",
                      },
                      event.paid_bookings,
                    ),
                  ),
                  /*#__PURE__*/ React.createElement(
                    "td",
                    {
                      className: "py-4 px-4 text-center",
                    },
                    event.reconciliation_status === "matched"
                      ? /*#__PURE__*/ React.createElement(
                          Badge,
                          {
                            className:
                              "bg-green-100 text-green-700 hover:bg-green-100 border-green-200",
                          },
                          /*#__PURE__*/ React.createElement(CheckCircle2, {
                            className: "w-3 h-3 mr-1",
                          }),
                          "Matched",
                        )
                      : event.reconciliation_status === "discrepancy"
                        ? /*#__PURE__*/ React.createElement(
                            Badge,
                            {
                              className:
                                "bg-red-100 text-red-700 hover:bg-red-100 border-red-200",
                            },
                            /*#__PURE__*/ React.createElement(AlertCircle, {
                              className: "w-3 h-3 mr-1",
                            }),
                            "Discrepancy",
                          )
                        : /*#__PURE__*/ React.createElement(
                            Badge,
                            {
                              className:
                                "bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200",
                            },
                            /*#__PURE__*/ React.createElement(Clock, {
                              className: "w-3 h-3 mr-1",
                            }),
                            "Pending",
                          ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
