import { Suspense } from 'react';
import './events/events.css';
import { EventsHeader } from '@/components/events-header';
import EventsHeroSection from '@/components/events/events-hero-section';
import FeaturedExperiences from '@/components/events/featured-experiences';
import UpcomingHighlights from '@/components/events/upcoming-highlights';
import EventsListSection from '@/components/events/events-list-section';
import HowItWorksSection from '@/components/events/how-it-works-section';
import SeamlessExperienceSection from '@/components/events/seamless-experience-section';
// import TestimonialsSection from '@/components/events/testimonials-section'; // Temporarily removed
import Footer from '@/components/footer';

export const metadata = {
  title: 'ConveneHub | Event Booking Platform',
  description: 'Discover, book, and manage live events with seamless ticketing, QR check-ins, and real-time updates.',
};

export default function Home() {
  return (
    <main className="min-h-screen text-render-optimized">
      <EventsHeader />
      <EventsHeroSection />
      <HowItWorksSection />
      <UpcomingHighlights />
      <Suspense fallback={null}>
        <EventsListSection />
      </Suspense>
      <FeaturedExperiences />
      <SeamlessExperienceSection />
      {/* <TestimonialsSection /> */}{/* Temporarily removed */}
      <Footer />
    </main>
  );
}

