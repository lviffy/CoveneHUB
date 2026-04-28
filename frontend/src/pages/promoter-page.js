import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@/lib/convene/client";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Link2, RefreshCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}
export default function PromoterPage() {
  const supabase = useMemo(() => createClient(), []);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [links, setLinks] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [totals, setTotals] = useState(null);
  const [creatingLink, setCreatingLink] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const loadDashboardData = async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true);
    try {
      const [eventsRes, linksRes, perfRes, commissionsRes] = await Promise.all([
        fetch("/api/events/public"),
        fetch("/api/promoters/links"),
        fetch("/api/promoters/performance"),
        fetch("/api/promoters/commissions"),
      ]);
      const eventsPayload = await eventsRes.json().catch(() => ({
        events: [],
      }));
      const linksPayload = await linksRes.json().catch(() => ({
        links: [],
      }));
      const perfPayload = await perfRes.json().catch(() => ({
        performance: null,
      }));
      const commissionsPayload = await commissionsRes.json().catch(() => ({
        commissions: [],
        totals: null,
      }));
      if (!eventsRes.ok || !linksRes.ok || !perfRes.ok || !commissionsRes.ok) {
        throw new Error("Failed to load promoter dashboard data");
      }
      const publishedEvents = (eventsPayload.events || []).filter(
        (event) =>
          event.status === "published" || event.status === "checkin_open",
      );
      setEvents(publishedEvents);
      if (!selectedEventId && publishedEvents.length > 0) {
        setSelectedEventId(publishedEvents[0].event_id);
      }
      setLinks(linksPayload.links || []);
      setPerformance(perfPayload.performance || null);
      setCommissions(commissionsPayload.commissions || []);
      setTotals(commissionsPayload.totals || null);
    } catch (error) {
      toast({
        title: "Unable to load dashboard",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login", {
          replace: true,
        });
        return;
      }
      const role =
        session.user.role || session.user.user_metadata?.role || "user";
      if (role !== "promoter" && role !== "admin_team" && role !== "user") {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      await loadDashboardData(false);
    };
    void run();
  }, [navigate, supabase]);
  const createLink = async () => {
    if (!selectedEventId || creatingLink) return;
    try {
      setCreatingLink(true);
      const response = await fetch("/api/promoters/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: selectedEventId,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.link) {
        throw new Error(payload?.message || "Failed to create referral link");
      }
      await loadDashboardData(true);
      toast({
        title: "Referral link ready",
        description: `Code: ${payload.link.code}`,
      });
    } catch (error) {
      toast({
        title: "Could not create link",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreatingLink(false);
    }
  };
  const copyReferralUrl = async (link) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${base}/events/${link.eventId}?ref=${link.code}`;
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast({
        title: "Copy unavailable",
        description: "Clipboard is not available in this browser context.",
        variant: "destructive",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Copied",
        description: "Referral link copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy manually from the table.",
        variant: "destructive",
      });
    }
  };
  if (loading) {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "min-h-screen flex items-center justify-center",
      },
      /*#__PURE__*/ React.createElement(Spinner, {
        className: "w-8 h-8",
      }),
    );
  }
  if (accessDenied) {
    return /*#__PURE__*/ React.createElement(
      "div",
      {
        className:
          "min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "text-center p-8 bg-white rounded-lg shadow-xl max-w-md",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          {
            className: "text-6xl mb-4",
          },
          "\uD83D\uDEAB",
        ),
        /*#__PURE__*/ React.createElement(
          "h1",
          {
            className: "text-3xl font-bold text-red-600 mb-2",
          },
          "Access Denied",
        ),
        /*#__PURE__*/ React.createElement(
          "p",
          {
            className: "text-gray-600 mb-4",
          },
          "You do not have permission to access the promoter dashboard.",
        ),
      ),
    );
  }
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className:
        "min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 md:p-8",
    },
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "max-w-6xl mx-auto space-y-6",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "flex items-center justify-between gap-4",
        },
        /*#__PURE__*/ React.createElement(
          "div",
          null,
          /*#__PURE__*/ React.createElement(
            "h1",
            {
              className: "text-2xl md:text-3xl font-bold text-slate-900",
            },
            "Promoter Dashboard",
          ),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-slate-600",
            },
            "Create referral links and track your performance.",
          ),
        ),
        /*#__PURE__*/ React.createElement(
          Button,
          {
            variant: "outline",
            onClick: () => void loadDashboardData(true),
            disabled: refreshing,
          },
          /*#__PURE__*/ React.createElement(RefreshCcw, {
            className: "w-4 h-4 mr-2",
          }),
          refreshing ? "Refreshing..." : "Refresh",
        ),
      ),
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "grid grid-cols-1 md:grid-cols-3 gap-4",
        },
        /*#__PURE__*/ React.createElement(
          Card,
          null,
          /*#__PURE__*/ React.createElement(
            CardHeader,
            {
              className: "pb-2",
            },
            /*#__PURE__*/ React.createElement(
              CardDescription,
              null,
              "Total Bookings",
            ),
            /*#__PURE__*/ React.createElement(
              CardTitle,
              null,
              performance?.totalBookings ?? 0,
            ),
          ),
        ),
        /*#__PURE__*/ React.createElement(
          Card,
          null,
          /*#__PURE__*/ React.createElement(
            CardHeader,
            {
              className: "pb-2",
            },
            /*#__PURE__*/ React.createElement(
              CardDescription,
              null,
              "Total Tickets",
            ),
            /*#__PURE__*/ React.createElement(
              CardTitle,
              null,
              performance?.totalTickets ?? 0,
            ),
          ),
        ),
        /*#__PURE__*/ React.createElement(
          Card,
          null,
          /*#__PURE__*/ React.createElement(
            CardHeader,
            {
              className: "pb-2",
            },
            /*#__PURE__*/ React.createElement(
              CardDescription,
              null,
              "Total Revenue",
            ),
            /*#__PURE__*/ React.createElement(
              CardTitle,
              null,
              formatMoney(performance?.totalRevenue ?? 0),
            ),
          ),
        ),
      ),
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "grid grid-cols-1 md:grid-cols-3 gap-4",
        },
        /*#__PURE__*/ React.createElement(
          Card,
          null,
          /*#__PURE__*/ React.createElement(
            CardHeader,
            {
              className: "pb-2",
            },
            /*#__PURE__*/ React.createElement(
              CardDescription,
              null,
              "Total Commission",
            ),
            /*#__PURE__*/ React.createElement(
              CardTitle,
              null,
              formatMoney(totals?.total ?? 0),
            ),
          ),
        ),
        /*#__PURE__*/ React.createElement(
          Card,
          null,
          /*#__PURE__*/ React.createElement(
            CardHeader,
            {
              className: "pb-2",
            },
            /*#__PURE__*/ React.createElement(
              CardDescription,
              null,
              "Pending Commission",
            ),
            /*#__PURE__*/ React.createElement(
              CardTitle,
              null,
              formatMoney(totals?.pending ?? 0),
            ),
          ),
        ),
        /*#__PURE__*/ React.createElement(
          Card,
          null,
          /*#__PURE__*/ React.createElement(
            CardHeader,
            {
              className: "pb-2",
            },
            /*#__PURE__*/ React.createElement(
              CardDescription,
              null,
              "Paid Commission",
            ),
            /*#__PURE__*/ React.createElement(
              CardTitle,
              null,
              formatMoney(totals?.paid ?? 0),
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
            null,
            "Create Referral Link",
          ),
          /*#__PURE__*/ React.createElement(
            CardDescription,
            null,
            "Choose a published event and generate your shareable link.",
          ),
        ),
        /*#__PURE__*/ React.createElement(
          CardContent,
          {
            className: "flex flex-col md:flex-row gap-3 md:items-center",
          },
          /*#__PURE__*/ React.createElement(
            Select,
            {
              value: selectedEventId,
              onValueChange: setSelectedEventId,
            },
            /*#__PURE__*/ React.createElement(
              SelectTrigger,
              {
                className: "w-full md:max-w-md",
              },
              /*#__PURE__*/ React.createElement(SelectValue, {
                placeholder: "Select an event",
              }),
            ),
            /*#__PURE__*/ React.createElement(
              SelectContent,
              null,
              events.map((event) =>
                /*#__PURE__*/ React.createElement(
                  SelectItem,
                  {
                    key: event.event_id,
                    value: event.event_id,
                  },
                  event.title,
                ),
              ),
            ),
          ),
          /*#__PURE__*/ React.createElement(
            Button,
            {
              onClick: createLink,
              disabled: !selectedEventId || creatingLink,
            },
            /*#__PURE__*/ React.createElement(Link2, {
              className: "w-4 h-4 mr-2",
            }),
            creatingLink ? "Generating..." : "Generate Link",
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
            null,
            "Your Referral Links",
          ),
          /*#__PURE__*/ React.createElement(
            CardDescription,
            null,
            "Clicks and conversions for each generated link.",
          ),
        ),
        /*#__PURE__*/ React.createElement(
          CardContent,
          null,
          links.length === 0
            ? /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-sm text-slate-500",
                },
                "No links yet. Create your first referral link above.",
              )
            : /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "space-y-3",
                },
                links.map((link) => {
                  const event = events.find(
                    (item) => item.event_id === link.eventId,
                  );
                  const url = `/events/${link.eventId}?ref=${link.code}`;
                  return /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      key: link.id || link._id || link.code,
                      className: "p-3 border rounded-lg bg-white",
                    },
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "flex items-start justify-between gap-3",
                      },
                      /*#__PURE__*/ React.createElement(
                        "div",
                        {
                          className: "space-y-1",
                        },
                        /*#__PURE__*/ React.createElement(
                          "p",
                          {
                            className: "font-medium text-slate-900",
                          },
                          event?.title || "Event",
                        ),
                        /*#__PURE__*/ React.createElement(
                          "p",
                          {
                            className: "text-sm text-slate-600 break-all",
                          },
                          url,
                        ),
                        /*#__PURE__*/ React.createElement(
                          "div",
                          {
                            className: "flex items-center gap-2 text-xs",
                          },
                          /*#__PURE__*/ React.createElement(
                            Badge,
                            {
                              variant: "secondary",
                            },
                            "Code: ",
                            link.code,
                          ),
                          /*#__PURE__*/ React.createElement(
                            Badge,
                            {
                              variant: "outline",
                            },
                            "Clicks: ",
                            link.clicks || 0,
                          ),
                          /*#__PURE__*/ React.createElement(
                            Badge,
                            {
                              variant: "outline",
                            },
                            "Conversions: ",
                            link.conversions || 0,
                          ),
                        ),
                      ),
                      /*#__PURE__*/ React.createElement(
                        Button,
                        {
                          size: "sm",
                          variant: "outline",
                          onClick: () => void copyReferralUrl(link),
                        },
                        /*#__PURE__*/ React.createElement(Copy, {
                          className: "w-4 h-4 mr-2",
                        }),
                        "Copy",
                      ),
                    ),
                  );
                }),
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
            null,
            "Recent Commissions",
          ),
          /*#__PURE__*/ React.createElement(
            CardDescription,
            null,
            "Latest payouts generated from attributed bookings.",
          ),
        ),
        /*#__PURE__*/ React.createElement(
          CardContent,
          null,
          commissions.length === 0
            ? /*#__PURE__*/ React.createElement(
                "p",
                {
                  className: "text-sm text-slate-500",
                },
                "No commissions yet.",
              )
            : /*#__PURE__*/ React.createElement(
                "div",
                {
                  className: "space-y-2",
                },
                commissions.slice(0, 10).map((entry) =>
                  /*#__PURE__*/ React.createElement(
                    "div",
                    {
                      key: entry._id,
                      className:
                        "flex items-center justify-between py-2 border-b last:border-b-0",
                    },
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "text-sm",
                      },
                      /*#__PURE__*/ React.createElement(
                        "p",
                        {
                          className: "font-medium text-slate-900",
                        },
                        entry.referralCode,
                      ),
                      /*#__PURE__*/ React.createElement(
                        "p",
                        {
                          className: "text-slate-500",
                        },
                        new Date(entry.createdAt).toLocaleString("en-IN"),
                      ),
                    ),
                    /*#__PURE__*/ React.createElement(
                      "div",
                      {
                        className: "text-right",
                      },
                      /*#__PURE__*/ React.createElement(
                        "p",
                        {
                          className: "font-semibold text-slate-900",
                        },
                        formatMoney(entry.amount),
                      ),
                      /*#__PURE__*/ React.createElement(
                        Badge,
                        {
                          variant:
                            entry.status === "paid" ? "default" : "secondary",
                        },
                        entry.status,
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
