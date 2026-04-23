import type { Metadata } from 'next'
import { EventsHeader } from '@/components/events-header'
import Footer from '@/components/footer'
import FAQSection from '@/components/faq-section'
import ContactSection from '@/components/contact-section'

export const metadata: Metadata = {
	title: 'Contact Us - ConveneHub',
	description: 'Have questions? Get in touch with the ConveneHub team or browse our FAQ.',
}

export default function ContactPage() {
	return (
		<main className="min-h-screen bg-white">
			<EventsHeader />
			<div className="pt-16">
				<FAQSection />
				<ContactSection />
			</div>
			<Footer />
		</main>
	)
}
