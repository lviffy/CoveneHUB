import { Suspense } from 'react';
import './events.css';
import { EventsHeader } from '@/components/events-header';
import EventsBrowsePage from '@/components/events/events-browse-page';
import Footer from '@/components/footer';
import { Spinner } from '@/components/ui/spinner';

export const metadata = {
  title: 'Events - CONVENEHUB Ticket Booking',
  description: 'Explore upcoming events, reserve your seat, and get instant digital tickets with QR access.',
};

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <Spinner className="w-12 h-12 text-gray-900 mx-auto mb-4" />
        <p className="text-gray-500">Loading events...</p>
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <main className="min-h-screen text-render-optimized bg-white">
      <EventsHeader />
      <div className="pt-16">
        <Suspense fallback={<LoadingFallback />}>
          <EventsBrowsePage />
        </Suspense>
      </div>
      <Footer />
    </main>
  );
}
