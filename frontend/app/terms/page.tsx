import { EventsHeader } from '@/components/events-header';
import Footer from '@/components/footer';

export const metadata = {
  title: 'Terms and Conditions | ConveneHub',
  description: 'Terms and conditions for using ConveneHub booking platform.',
};

export default function TermsAndConditions() {
  return (
    <main className="min-h-screen bg-gray-50">
      <EventsHeader />
      
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200 pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms and Conditions</h1>
          <p className="text-lg text-gray-600">Last updated: January 23, 2026</p>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 shadow-sm prose prose-blue max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Welcome to ConveneHub. These Terms and Conditions govern your use of our website and services. 
              By accessing or using ConveneHub, you agree to be bound by these terms. If you do not agree with any part 
              of these terms, you must not use our services.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Service Description</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              ConveneHub provides a platform for users to discover, register, and book tickets for live events. 
              We act as an intermediary between event organizers and attendees, while also providing operational tools 
              such as QR check-ins, assignment workflows, and performance dashboards.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              To book an experience, you may be required to create an account. You are responsible for maintaining 
              the confidentiality of your account credentials and for all activities that occur under your account. 
              You must provide accurate and complete information during the registration process.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Bookings and Payments</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>All bookings are subject to availability and confirmation.</li>
              <li>Bookings are confirmed through ConveneHub once the reservation workflow completes successfully.</li>
              <li>Prices are subject to change without notice, but changes will not affect confirmed bookings.</li>
              <li>A booking is only considered confirmed once payment is successfully processed and you receive a confirmation email.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Conduct at Events</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Users must follow all rules and guidelines provided by event staff and venue authorities. 
              ConveneHub and its partners reserve the right to remove any individual from an event for 
              misconduct, violation of safety protocols, or unauthorized recording.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Restricted Activities:</strong> Certain events may restrict audio/video recording, photography, 
              or the use of specific devices. Attendees must comply with organizer and venue policies.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cancellation and Refund Policy</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Our refund policy is detailed on our <a href="/refund" className="text-blue-600 hover:underline">Refund Policy</a> page. 
              Generally, cancellations made within a specific timeframe before the event may be eligible for a partial 
              or full refund, subject to the specific event's terms.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              ConveneHub shall not be liable for any indirect, incidental, special, or consequential damages resulting 
              from the use of our services or participation in events. We do not guarantee the specific content or 
              schedule of any live event.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Intellectual Property</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              All content on the ConveneHub platform, including logos, text, and graphics, is the property of 
              ConveneHub or its licensors and is protected by copyright and other intellectual property laws.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Changes to Terms</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We reserve the right to modify these terms at any time. Any changes will be effective immediately 
              upon posting to this page. Your continued use of the platform after changes are posted constitutes 
              your acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about these Terms and Conditions, please contact us at:
              <br />
              Email: <a href="mailto:support@convenehub.com" className="text-blue-600 hover:underline">support@convenehub.com</a>
            </p>
          </section>
        </div>
      </div>
      
      <Footer />
    </main>
  );
}
