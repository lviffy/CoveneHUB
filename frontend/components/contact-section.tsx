'use client'
import React, { useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'
import { useForm } from 'react-hook-form'

interface ContactFormData {
	name: string
	email: string
	subject: string
	message: string
}

export default function ContactSection() {
	const sectionRef = useRef<HTMLElement>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

	const { scrollYProgress } = useScroll({
		target: sectionRef,
		offset: ['start end', 'end start'],
	})

	const y = useTransform(scrollYProgress, [0, 1], [30, -30])

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<ContactFormData>({
		defaultValues: { name: '', email: '', subject: '', message: '' },
	})

	const onSubmit = async (data: ContactFormData) => {
		setIsSubmitting(true)
		setSubmitStatus('idle')
		try {
			const response = await fetch('/api/contact', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			})
			if (!response.ok) throw new Error('Failed to send email')
			reset()
			setSubmitStatus('success')
		} catch (error) {
			console.error('Error submitting form:', error)
			setSubmitStatus('error')
		} finally {
			setIsSubmitting(false)
			setTimeout(() => setSubmitStatus('idle'), 3000)
		}
	}

	return (
		<section ref={sectionRef} id="contact" className="w-full py-8 xs:py-12 sm:py-16 lg:py-24 px-4 xs:px-5 sm:px-6 bg-white">
			<motion.div style={{ y }} className="mx-auto max-w-2xl">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: '-100px' }}
					transition={{ duration: 0.6 }}
					className="text-center mb-8 xs:mb-10"
				>
					<Badge variant="outline" className="text-xs mb-2">Get In Touch</Badge>
					<h2 className="text-2xl xs:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
						Let&apos;s <span className="text-blue-600">Connect</span>
					</h2>
					<p className="text-sm xs:text-base text-gray-600 max-w-xl mx-auto">
						Have questions? Get in touch with our team.
					</p>
				</motion.div>

				{/* Form */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: '-100px' }}
					transition={{ duration: 0.6 }}
					className="w-full max-w-xl mx-auto"
				>
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
						<div className="space-y-1.5">
							<label htmlFor="name" className="block text-xs xs:text-sm font-semibold text-gray-900">Full Name</label>
							<Input
								id="name"
								placeholder="Your name"
								{...register('name', { required: 'Name is required' })}
								className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 placeholder:text-gray-400 focus:border-blue-500 focus:ring-0 focus:outline-none transition-colors text-sm"
							/>
							{errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
						</div>

						<div className="space-y-1.5">
							<label htmlFor="email" className="block text-xs xs:text-sm font-semibold text-gray-900">Email Address</label>
							<Input
								id="email"
								type="email"
								placeholder="your@email.com"
								{...register('email', {
									required: 'Email is required',
									pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email address' },
								})}
								className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 placeholder:text-gray-400 focus:border-blue-500 focus:ring-0 focus:outline-none transition-colors text-sm"
							/>
							{errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
						</div>

						<div className="space-y-1.5">
							<label htmlFor="subject" className="block text-xs xs:text-sm font-semibold text-gray-900">Subject</label>
							<Input
								id="subject"
								placeholder="What is this about?"
								{...register('subject', { required: 'Subject is required' })}
								className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 placeholder:text-gray-400 focus:border-blue-500 focus:ring-0 focus:outline-none transition-colors text-sm"
							/>
							{errors.subject && <p className="text-xs text-red-600">{errors.subject.message}</p>}
						</div>

						<div className="space-y-1.5">
							<label htmlFor="message" className="block text-xs xs:text-sm font-semibold text-gray-900">Message</label>
							<Textarea
								id="message"
								placeholder="Tell us more about your inquiry..."
								{...register('message', { required: 'Message is required' })}
								className="w-full min-h-28 bg-white border border-gray-300 rounded-lg px-3 py-2 placeholder:text-gray-400 focus:border-blue-500 focus:ring-0 focus:outline-none transition-colors resize-none text-sm"
							/>
							{errors.message && <p className="text-xs text-red-600">{errors.message.message}</p>}
						</div>

						{submitStatus === 'success' && (
							<motion.div
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-xs text-center"
							>
								Thank you! We&apos;ll get back to you soon.
							</motion.div>
						)}
						{submitStatus === 'error' && (
							<motion.div
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs text-center"
							>
								Something went wrong. Please try again.
							</motion.div>
						)}

						<Button
							type="submit"
							disabled={isSubmitting}
							className="w-full bg-blue-600 text-white hover:bg-blue-700 font-semibold py-2 h-10 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2 group text-sm"
						>
							{isSubmitting ? (
								<>
									<div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
									Sending...
								</>
							) : (
								<>
									Send Message
									<Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
								</>
							)}
						</Button>

						<p className="text-xs text-center text-gray-600">We typically respond within 24 hours.</p>
					</form>
				</motion.div>
			</motion.div>
		</section>
	)
}
