import EventBookingPage from "../../../components/events/event-booking-page";
export const metadata = {
  title: "Book Event - CONVENEHUB",
  description:
    "Book your event access pass and receive instant confirmation with QR entry.",
};

// Dynamic routing - no static params needed since we're fetching from database
export const dynamic = "force-dynamic";
export default function BookingPage({ params }) {
  return /*#__PURE__*/ React.createElement(EventBookingPage, {
    eventId: params.id,
  });
}
