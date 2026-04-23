import { EventsHeader } from '@/components/events-header';
import Footer from '@/components/footer';

export const metadata = {
  title: 'Privacy Policy | ConveneHub',
  description: 'Privacy policy for ConveneHub booking platform.',
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-gray-50">
      <EventsHeader />
      
      {/* Hero Section */}
      <div className="bg-white border-b border-gray-200 pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-lg text-gray-600">Last updated: January 23, 2026</p>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 shadow-sm prose prose-blue max-w-none">
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We collect information you provide directly to us, such as when you create an account, make a booking, 
              subscribe to our newsletter, or contact support. This may include:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>Name, email address, and phone number</li>
              <li>Billing information and transaction history</li>
              <li>Profile information and preferences</li>
              <li>Communications with our team</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use the collected information for various purposes, including:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>Processing and confirming your event bookings</li>
              <li>Sending transactional emails and notifications</li>
              <li>Providing customer support and responding to inquiries</li>
              <li>Improving our platform and user experience</li>
              <li>Complying with legal obligations</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Information Sharing</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We do not sell your personal information. We may share your information with:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li><strong>Event Organizers:</strong> To verify your booking at the venue.</li>
              <li><strong>Service Providers:</strong> Email services, hosting providers, and analytics tools that help us operate the platform.</li>
              <li><strong>Legal Authorities:</strong> When required by law or to protect our rights.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We implement industry-standard security measures to protect your personal information. 
              However, no method of transmission over the internet is 100% secure, and we cannot guarantee 
              absolute security.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Your Rights</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You have the right to access, correct, or delete your personal information. You can manage 
              your profile settings through your account dashboard or contact us for assistance.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookies</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use cookies and similar technologies to enhance your browsing experience and analyze 
              site traffic. You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
              <br />
              Email: <a href="mailto:privacy@convenehub.com" className="text-blue-600 hover:underline">privacy@convenehub.com</a>
            </p>
          </section>
        </div>
      </div>
      
      <Footer />
    </main>
  );
}
