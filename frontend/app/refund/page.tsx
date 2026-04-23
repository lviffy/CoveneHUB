import { EventsHeader } from '@/components/events-header';
import Footer from '@/components/footer';

export const metadata = {
  title: 'Refund Policy | ConveneHub',
  description: 'Refund and cancellation policy for ConveneHub bookings.',
};

export default function RefundPolicy() {
  return (
    <main className="min-h-screen bg-gray-50">
      <EventsHeader />
      
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200 pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Refund Policy</h1>
          <p className="text-lg text-gray-600">Last updated: January 23, 2026</p>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 shadow-sm prose prose-blue max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. General Refund Principles</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              At ConveneHub, we strive to provide exceptional experiences. We understand that plans can change, 
              and we have established this refund policy to be fair to both our users and the event organizers.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Cancellation by User</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Standard refund rules for most experiences:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li><strong>More than 7 days before the event:</strong> 100% refund (minus a small processing fee).</li>
              <li><strong>3 to 7 days before the event:</strong> 50% refund.</li>
              <li><strong>Less than 72 hours before the event:</strong> No refund available.</li>
            </ul>
            <p className="text-sm text-gray-500 italic">
              Note: Some specific high-demand events may have custom cancellation policies which will be clearly 
              stated on the booking page.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Cancellation by Organizer or ConveneHub</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If an event is cancelled by the organizer, venue partner, or ConveneHub for any reason (including 
              weather, technical issues, or operational changes), you will be entitled to a 100% refund of your 
              booking amount.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Refund Process</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Once a refund is approved:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>The refund will be processed back to the original payment method.</li>
              <li>It may take 5-7 business days for the amount to reflect in your account, depending on your bank.</li>
              <li>You will receive a confirmation email once the refund has been initiated.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Rescheduling</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If an event is rescheduled, your ticket will automatically be valid for the new date. 
              If you are unable to attend on the new date, you can request a full refund within 48 hours 
              of the rescheduling announcement.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. No-Shows</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Refunds will not be provided for no-shows or if you arrive significantly late to an event 
              where entry has already been closed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Contact Support</h2>
            <p className="text-gray-700 leading-relaxed">
              To request a refund or for any payment-related inquiries, please contact our support team:
              <br />
              Email: <a href="mailto:refunds@convenehub.com" className="text-blue-600 hover:underline">refunds@convenehub.com</a>
              <br />
              Please provide your Booking ID for faster processing.
            </p>
          </section>
        </div>
      </div>
      
      <Footer />
    </main>
  );
}
