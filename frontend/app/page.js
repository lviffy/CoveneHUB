import { Suspense } from "react";
import "./events/events.css";
import { EventsHeader } from "@/components/events-header";
import EventsHeroSection from "@/components/events/events-hero-section";
import FeaturedExperiences from "@/components/events/featured-experiences";
import UpcomingHighlights from "@/components/events/upcoming-highlights";
import EventsListSection from "@/components/events/events-list-section";
import HowItWorksSection from "@/components/events/how-it-works-section";
import SeamlessExperienceSection from "@/components/events/seamless-experience-section";
// import TestimonialsSection from '@/components/events/testimonials-section'; // Temporarily removed
import Footer from "@/components/footer";
export const metadata = {
  title: "ConveneHub | Event Booking Platform",
  description:
    "Discover, book, and manage live events with seamless ticketing, QR check-ins, and real-time updates.",
};
export default function Home() {
  return /*#__PURE__*/ React.createElement(
    "main",
    {
      className: "min-h-screen text-render-optimized",
    },
    /*#__PURE__*/ React.createElement(EventsHeader, null),
    /*#__PURE__*/ React.createElement(EventsHeroSection, null),
    /*#__PURE__*/ React.createElement(HowItWorksSection, null),
    /*#__PURE__*/ React.createElement(UpcomingHighlights, null),
    /*#__PURE__*/ React.createElement(
      Suspense,
      {
        fallback: null,
      },
      /*#__PURE__*/ React.createElement(EventsListSection, null),
    ),
    /*#__PURE__*/ React.createElement(FeaturedExperiences, null),
    /*#__PURE__*/ React.createElement(SeamlessExperienceSection, null),
    /*#__PURE__*/ React.createElement(Footer, null),
  );
}
