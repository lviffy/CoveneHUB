import { createTransporter, senderEmail } from './config';
import {
  bookingConfirmationTemplate,
  bookingCancellationTemplate,
  eventReminderTemplate,
  settlementReportTemplate,
  paymentReceiptTemplate,
} from './templates';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{
    filename: string;
    content?: string;
    path?: string;
    contentType?: string;
    cid?: string; // Content-ID for inline images
  }>;
}

/**
 * Validate email address format
 * SECURITY: Prevents email injection attacks
 */
function validateEmail(email: string): boolean {
  // RFC 5322 compliant email validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Sanitize string to prevent email header injection
 * SECURITY: Removes newline characters that could inject additional headers
 */
function sanitizeEmailHeader(value: string): string {
  // Remove all newline characters (\r, \n) and tabs
  return value.replace(/[\r\n\t]/g, ' ').trim();
}

/**
 * Send email using Nodemailer
 */
export async function sendEmail(options: SendEmailOptions) {
  const startTime = Date.now();
  const logContext = {
    timestamp: new Date().toISOString(),
    to: options.to,
    subject: options.subject,
  };

  try {
    console.log('📧 [EMAIL] Starting email send process:', logContext);

    // SECURITY: Validate email address
    if (!validateEmail(options.to)) {
      console.error('❌ [EMAIL] Invalid email address format:', options.to);
      throw new Error('Invalid email address format');
    }
    console.log('✅ [EMAIL] Email address validated');

    // SECURITY: Sanitize subject to prevent header injection
    const sanitizedSubject = sanitizeEmailHeader(options.subject);
    console.log('✅ [EMAIL] Subject sanitized');

    // Create transporter
    console.log('⏳ [EMAIL] Creating email transporter...');
    const transporter = createTransporter();
    console.log('✅ [EMAIL] Transporter created successfully');

    const mailOptions = {
      from: senderEmail.from,
      to: options.to,
      subject: sanitizedSubject,
      html: options.html,
      text: options.text,
      replyTo: senderEmail.replyTo,
      attachments: options.attachments,
    };

    console.log('⏳ [EMAIL] Sending email via SMTP...');
    const info = await transporter.sendMail(mailOptions);
    
    const duration = Date.now() - startTime;
    console.log('✅ [EMAIL] Email sent successfully:', {
      messageId: info.messageId,
      to: options.to,
      subject: sanitizedSubject,
      duration: `${duration}ms`,
      response: info.response,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [EMAIL] Failed to send email:', {
      ...logContext,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Send booking confirmation email
 */
export async function sendBookingConfirmation(
  userEmail: string,
  bookingDetails: Parameters<typeof bookingConfirmationTemplate>[0]
) {
  const template = bookingConfirmationTemplate(bookingDetails);

  return sendEmail({
    to: userEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

/**
 * Send booking confirmation with QR code attachment
 */
export async function sendBookingConfirmationWithQR(
  userEmail: string,
  bookingDetails: Parameters<typeof bookingConfirmationTemplate>[0],
  qrCodeDataURL: string // kept for backwards compatibility, no longer used in email
) {
  const path = require('path');

  // Get the template (no longer includes QR code)
  const template = bookingConfirmationTemplate(bookingDetails);

  // Read logo file from public folder
  const logoPath = path.join(process.cwd(), 'public', 'logo', 'logo.jpg');

  const attachments: Array<{
    filename: string;
    content?: string;
    path?: string;
    contentType?: string;
    cid?: string;
  }> = [
      {
        filename: 'convenehub-logo.jpg',
        path: logoPath,
        contentType: 'image/jpeg',
        cid: 'logo@convenehub', // Content-ID for logo
      },
    ];

  return sendEmail({
    to: userEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    attachments,
  });
}

/**
 * Send booking confirmation with multiple tickets (ticket codes only, no QR in email)
 */
export async function sendBookingConfirmationWithMultipleTickets(
  userEmail: string,
  bookingDetails: Parameters<typeof bookingConfirmationTemplate>[0],
  tickets: Array<{ ticket_number: number; ticket_code: string; ticket_id: string }>
) {
  const path = require('path');

  // Create HTML for tickets list (without QR codes)
  const ticketsListHTML = `
    <div style="margin: 30px 0; padding: 25px; background: #f8f9fa; border-radius: 12px;">
      <h3 style="color: #1a202c; margin-bottom: 20px; text-align: center;">Your Tickets</h3>
      <div style="background: white; border-radius: 8px; padding: 20px;">
        ${tickets
      .map(
        (ticket) => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #e2e8f0;">
            <div>
              <div style="color: #2d3748; font-weight: 600; font-size: 16px;">Ticket ${ticket.ticket_number}</div>
              <div style="color: #718096; font-size: 14px; font-family: monospace; margin-top: 5px;">${ticket.ticket_code}</div>
            </div>
            <div style="background: #3182ce; color: white; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 500;">
              QR in App
            </div>
          </div>
        `
      )
      .join('')}
      </div>
      <div style="margin-top: 20px; padding: 15px; background: #bee3f8; border-left: 4px solid #3182ce; border-radius: 6px;">
        <p style="color: #2c5282; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>📱 View QR Codes:</strong> Login to your ConveneHub account to view and download QR codes for each ticket. Show these QR codes at the venue for entry.
        </p>
      </div>
    </div>
  `;

  // Get the template without QR code
  const template = bookingConfirmationTemplate(bookingDetails);

  // Replace or add the tickets section
  let enhancedHTML = template.html;

  // If there's a QR code section, replace it
  if (enhancedHTML.includes('cid:qrcode@convenehub')) {
    enhancedHTML = enhancedHTML.replace(
      /<div[^>]*>[\s\S]*?<img[^>]*src="cid:qrcode@convenehub"[^>]*>[\s\S]*?<\/div>/,
      ticketsListHTML
    );
  } else {
    // Otherwise, add it before the closing body tag
    enhancedHTML = enhancedHTML.replace(
      '</body>',
      ticketsListHTML + '</body>'
    );
  }

  // Read logo file
  const logoPath = path.join(process.cwd(), 'public', 'logo', 'logo.jpg');

  const attachments: Array<{
    filename: string;
    content?: string;
    path?: string;
    contentType?: string;
    cid?: string;
  }> = [
      {
        filename: 'convenehub-logo.jpg',
        path: logoPath,
        contentType: 'image/jpeg',
        cid: 'logo@convenehub',
      },
    ];

  return sendEmail({
    to: userEmail,
    subject: template.subject,
    html: enhancedHTML,
    text: template.text + `\n\nYour Tickets:\n${tickets.map(t => `- Ticket ${t.ticket_number}: ${t.ticket_code}`).join('\n')}\n\nLogin to ConveneHub to view QR codes for each ticket.`,
    attachments,
  });
}

/**
 * Send booking confirmation with multiple QR codes (one per ticket)
 * @deprecated Use sendBookingConfirmationWithMultipleTickets instead
 */
export async function sendBookingConfirmationWithMultipleQR(
  userEmail: string,
  bookingDetails: Parameters<typeof bookingConfirmationTemplate>[0],
  ticketQRCodes: Array<{ ticket_number: number; ticket_code: string; qr_code: string }>
) {
  const path = require('path');
  const fs = require('fs');

  // Create HTML for multiple QR codes
  const qrCodesHTML = ticketQRCodes
    .map(
      (ticket, index) => `
      <div style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 12px; text-align: center;">
        <h3 style="color: #1a202c; margin-bottom: 10px;">Ticket ${ticket.ticket_number}</h3>
        <p style="color: #4a5568; font-size: 14px; margin-bottom: 15px; font-family: monospace; font-weight: 600;">
          ${ticket.ticket_code}
        </p>
        <img src="cid:qrcode${index}@convenehub" alt="QR Code ${ticket.ticket_number}" style="width: 250px; height: 250px; margin: 10px auto; display: block;" />
        <p style="color: #718096; font-size: 12px; margin-top: 10px;">
          Show this QR code at the venue
        </p>
      </div>
    `
    )
    .join('');

  // Use the booking details for the template (QR codes are no longer embedded in email)
  const template = bookingConfirmationTemplate(bookingDetails);

  // Replace the single QR code section with multiple QR codes
  const enhancedHTML = template.html.replace(
    /<img[^>]*src="cid:qrcode@convenehub"[^>]*>/,
    qrCodesHTML
  );

  // Read logo file
  const logoPath = path.join(process.cwd(), 'public', 'logo', 'logo.jpg');

  // Create attachments array with logo and all QR codes
  const attachments: Array<{
    filename: string;
    content?: string;
    path?: string;
    contentType?: string;
    cid?: string;
  }> = [
      {
        filename: 'convenehub-logo.jpg',
        path: logoPath,
        contentType: 'image/jpeg',
        cid: 'logo@convenehub',
      },
    ];

  // Add each QR code as inline and downloadable attachment
  ticketQRCodes.forEach((ticket, index) => {
    const base64Data = ticket.qr_code.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Inline attachment for displaying in email
    attachments.push({
      filename: `qr-code-${ticket.ticket_number}.png`,
      content: buffer.toString('base64'),
      contentType: 'image/png',
      cid: `qrcode${index}@convenehub`,
    });

    // Downloadable attachment
    attachments.push({
      filename: `ticket-${ticket.ticket_code}.png`,
      content: buffer.toString('base64'),
      contentType: 'image/png',
    });
  });

  return sendEmail({
    to: userEmail,
    subject: template.subject,
    html: enhancedHTML,
    text: template.text + `\n\nYou have ${ticketQRCodes.length} tickets. Each ticket has its own QR code attached.`,
    attachments,
  });
}

/**
 * Send booking cancellation email
 */
export async function sendBookingCancellation(
  userEmail: string,
  bookingDetails: Parameters<typeof bookingCancellationTemplate>[0]
) {
  const template = bookingCancellationTemplate(bookingDetails);

  return sendEmail({
    to: userEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

/**
 * Send event reminder email
 */
export async function sendEventReminder(
  userEmail: string,
  bookingDetails: Parameters<typeof eventReminderTemplate>[0]
) {
  const template = eventReminderTemplate(bookingDetails);

  return sendEmail({
    to: userEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig() {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration is valid');
    return { success: true };
  } catch (error) {
    console.error('Email configuration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send settlement report email to movie team
 */
export async function sendSettlementReport(
  movieTeamEmail: string,
  settlementDetails: Parameters<typeof settlementReportTemplate>[0],
  csvContent?: string
) {
  const template = settlementReportTemplate(settlementDetails);

  const attachments: SendEmailOptions['attachments'] = [];

  if (csvContent) {
    attachments.push({
      filename: `settlement-report-${settlementDetails.event_title.replace(/\s+/g, '-')}.csv`,
      content: csvContent,
      contentType: 'text/csv',
    });
  }

  return sendEmail({
    to: movieTeamEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    attachments: attachments.length > 0 ? attachments : undefined,
  });
}

/**
 * Send payment receipt email
 */
export async function sendPaymentReceipt(
  userEmail: string,
  paymentDetails: Parameters<typeof paymentReceiptTemplate>[0]
) {
  const template = paymentReceiptTemplate(paymentDetails);

  return sendEmail({
    to: userEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}
