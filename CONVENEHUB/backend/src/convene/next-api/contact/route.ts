import nodemailer from 'nodemailer'
import { NextRequest, NextResponse } from 'next/server'

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: 587,
	secure: false,
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASSWORD,
	},
})

interface ContactFormData {
	name: string
	email: string
	subject: string
	message: string
}

export async function POST(request: NextRequest) {
	try {
		const body: ContactFormData = await request.json()
		const { name, email, subject, message } = body

		if (!name || !email || !subject || !message) {
			return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
		}

		// Email to admin
		await transporter.sendMail({
			from: process.env.SMTP_FROM_EMAIL,
			to: process.env.SMTP_USER,
			subject: `Contact Form: ${subject}`,
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2>New Contact Form Submission</h2>
					<div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
						<p><strong>Name:</strong> ${escapeHtml(name)}</p>
						<p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
						<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
						<hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
						<p><strong>Message:</strong></p>
						<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
					</div>
					<p style="color: #666; font-size: 12px;">Sent from the ConveneHub contact form.</p>
				</div>
			`,
		})

		// Confirmation email to user
		await transporter.sendMail({
			from: process.env.SMTP_FROM_EMAIL,
			to: email,
			subject: `We received your message - ${subject}`,
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2>Thank you for contacting us!</h2>
					<p>Hi ${escapeHtml(name)},</p>
					<p>We received your message and will get back to you as soon as possible.</p>
					<div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
						<p><strong>Your message:</strong></p>
						<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
					</div>
					<p style="color: #666;">Best regards,<br>The ConveneHub Team</p>
				</div>
			`,
		})

		return NextResponse.json({ success: true, message: 'Email sent successfully' }, { status: 200 })
	} catch (error) {
		console.error('Contact form error:', error)
		return NextResponse.json({ error: 'Failed to send email. Please try again.' }, { status: 500 })
	}
}

function escapeHtml(text: string): string {
	const map: Record<string, string> = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;',
	}
	return text.replace(/[&<>"']/g, (m) => map[m])
}
