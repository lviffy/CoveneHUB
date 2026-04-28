import { Suspense } from "react";
import "./events.css";
import { EventsHeader } from "@/components/events-header";
import EventsBrowsePage from "@/components/events/events-browse-page";
import Footer from "@/components/footer";
import { Spinner } from "@/components/ui/spinner";
export const metadata = {
  title: "Events - CONVENEHUB Ticket Booking",
  description:
    "Explore upcoming events, reserve your seat, and get instant digital tickets with QR access.",
};
function LoadingFallback() {
  return /*#__PURE__*/ React.createElement(
    "div",
    {
      className: "min-h-screen bg-white flex items-center justify-center",
    },
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "text-center",
      },
      /*#__PURE__*/ React.createElement(Spinner, {
        className: "w-12 h-12 text-gray-900 mx-auto mb-4",
      }),
      /*#__PURE__*/ React.createElement(
        "p",
        {
          className: "text-gray-500",
        },
        "Loading events...",
      ),
    ),
  );
}
export default function EventsPage() {
  return /*#__PURE__*/ React.createElement(
    "main",
    {
      className: "min-h-screen text-render-optimized bg-white",
    },
    /*#__PURE__*/ React.createElement(EventsHeader, null),
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "pt-16",
      },
      /*#__PURE__*/ React.createElement(
        Suspense,
        {
          fallback: /*#__PURE__*/ React.createElement(LoadingFallback, null),
        },
        /*#__PURE__*/ React.createElement(EventsBrowsePage, null),
      ),
    ),
    /*#__PURE__*/ React.createElement(Footer, null),
  );
}
