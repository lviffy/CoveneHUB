import { EventsHeader } from "@/components/events-header";
import Footer from "@/components/footer";
export const metadata = {
  title: "Refund Policy | ConveneHub",
  description: "Refund and cancellation policy for ConveneHub bookings.",
};
export default function RefundPolicy() {
  return /*#__PURE__*/ React.createElement(
    "main",
    {
      className: "min-h-screen bg-gray-50",
    },
    /*#__PURE__*/ React.createElement(EventsHeader, null),
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "bg-white border-b border-gray-200 pt-32 pb-16",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className: "max-w-4xl mx-auto px-4 sm:px-6",
        },
        /*#__PURE__*/ React.createElement(
          "h1",
          {
            className: "text-4xl font-bold text-gray-900 mb-4",
          },
          "Refund Policy",
        ),
        /*#__PURE__*/ React.createElement(
          "p",
          {
            className: "text-lg text-gray-600",
          },
          "Last updated: January 23, 2026",
        ),
      ),
    ),
    /*#__PURE__*/ React.createElement(
      "div",
      {
        className: "max-w-4xl mx-auto px-4 sm:px-6 py-16",
      },
      /*#__PURE__*/ React.createElement(
        "div",
        {
          className:
            "bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 shadow-sm prose prose-blue max-w-none",
        },
        /*#__PURE__*/ React.createElement(
          "section",
          {
            className: "mb-10",
          },
          /*#__PURE__*/ React.createElement(
            "h2",
            {
              className: "text-2xl font-bold text-gray-900 mb-4",
            },
            "1. General Refund Principles",
          ),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-gray-700 leading-relaxed mb-4",
            },
            "At ConveneHub, we strive to provide exceptional experiences. We understand that plans can change, and we have established this refund policy to be fair to both our users and the event organizers.",
          ),
        ),
        /*#__PURE__*/ React.createElement(
          "section",
          {
            className: "mb-10",
          },
          /*#__PURE__*/ React.createElement(
            "h2",
            {
              className: "text-2xl font-bold text-gray-900 mb-4",
            },
            "2. Cancellation by User",
          ),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-gray-700 leading-relaxed mb-4",
            },
            "Standard refund rules for most experiences:",
          ),
          /*#__PURE__*/ React.createElement(
            "ul",
            {
              className: "list-disc pl-6 text-gray-700 space-y-2 mb-4",
            },
            /*#__PURE__*/ React.createElement(
              "li",
              null,
              /*#__PURE__*/ React.createElement(
                "strong",
                null,
                "More than 7 days before the event:",
              ),
              " 100% refund (minus a small processing fee).",
            ),
            /*#__PURE__*/ React.createElement(
              "li",
              null,
              /*#__PURE__*/ React.createElement(
                "strong",
                null,
                "3 to 7 days before the event:",
              ),
              " 50% refund.",
            ),
            /*#__PURE__*/ React.createElement(
              "li",
              null,
              /*#__PURE__*/ React.createElement(
                "strong",
                null,
                "Less than 72 hours before the event:",
              ),
              " No refund available.",
            ),
          ),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-sm text-gray-500 italic",
            },
            "Note: Some specific high-demand events may have custom cancellation policies which will be clearly stated on the booking page.",
          ),
        ),
        /*#__PURE__*/ React.createElement(
          "section",
          {
            className: "mb-10",
          },
          /*#__PURE__*/ React.createElement(
            "h2",
            {
              className: "text-2xl font-bold text-gray-900 mb-4",
            },
            "3. Cancellation by Organizer or ConveneHub",
          ),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-gray-700 leading-relaxed mb-4",
            },
            "If an event is cancelled by the organizer, venue partner, or ConveneHub for any reason (including weather, technical issues, or operational changes), you will be entitled to a 100% refund of your booking amount.",
          ),
        ),
        /*#__PURE__*/ React.createElement(
          "section",
          {
            className: "mb-10",
          },
          /*#__PURE__*/ React.createElement(
            "h2",
            {
              className: "text-2xl font-bold text-gray-900 mb-4",
            },
            "4. Refund Process",
          ),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-gray-700 leading-relaxed mb-4",
            },
            "Once a refund is approved:",
          ),
          /*#__PURE__*/ React.createElement(
            "ul",
            {
              className: "list-disc pl-6 text-gray-700 space-y-2 mb-4",
            },
            /*#__PURE__*/ React.createElement(
              "li",
              null,
              "The refund will be processed back to the original payment method.",
            ),
            /*#__PURE__*/ React.createElement(
              "li",
              null,
              "It may take 5-7 business days for the amount to reflect in your account, depending on your bank.",
            ),
            /*#__PURE__*/ React.createElement(
              "li",
              null,
              "You will receive a confirmation email once the refund has been initiated.",
            ),
          ),
        ),
        /*#__PURE__*/ React.createElement(
          "section",
          {
            className: "mb-10",
          },
          /*#__PURE__*/ React.createElement(
            "h2",
            {
              className: "text-2xl font-bold text-gray-900 mb-4",
            },
            "5. Rescheduling",
          ),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-gray-700 leading-relaxed mb-4",
            },
            "If an event is rescheduled, your ticket will automatically be valid for the new date. If you are unable to attend on the new date, you can request a full refund within 48 hours of the rescheduling announcement.",
          ),
        ),
        /*#__PURE__*/ React.createElement(
          "section",
          {
            className: "mb-10",
          },
          /*#__PURE__*/ React.createElement(
            "h2",
            {
              className: "text-2xl font-bold text-gray-900 mb-4",
            },
            "6. No-Shows",
          ),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-gray-700 leading-relaxed mb-4",
            },
            "Refunds will not be provided for no-shows or if you arrive significantly late to an event where entry has already been closed.",
          ),
        ),
        /*#__PURE__*/ React.createElement(
          "section",
          null,
          /*#__PURE__*/ React.createElement(
            "h2",
            {
              className: "text-2xl font-bold text-gray-900 mb-4",
            },
            "7. Contact Support",
          ),
          /*#__PURE__*/ React.createElement(
            "p",
            {
              className: "text-gray-700 leading-relaxed",
            },
            "To request a refund or for any payment-related inquiries, please contact our support team:",
            /*#__PURE__*/ React.createElement("br", null),
            "Email: ",
            /*#__PURE__*/ React.createElement(
              "a",
              {
                href: "mailto:refunds@convenehub.com",
                className: "text-blue-600 hover:underline",
              },
              "refunds@convenehub.com",
            ),
            /*#__PURE__*/ React.createElement("br", null),
            "Please provide your Booking ID for faster processing.",
          ),
        ),
      ),
    ),
    /*#__PURE__*/ React.createElement(Footer, null),
  );
}
