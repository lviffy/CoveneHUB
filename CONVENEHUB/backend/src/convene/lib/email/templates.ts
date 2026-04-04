interface BookingDetails {
  booking_code: string;
  event_title: string;
  event_date: string;
  event_time: string;
  venue_name: string;
  venue_address: string;
  city: string;
  tickets_count: number;
  user_name: string;
  entry_instructions?: string;
}

interface SettlementDetails {
  event_title: string;
  event_date: string;
  gross_revenue: number;
  razorpay_fees: number;
  convene_commission: number;
  net_payout: number;
  tickets_sold: number;
  settlement_status: string;
  transaction_reference?: string;
  transfer_date?: string;
  payment_method?: string;
  notes?: string;
  team_name?: string;
}

/**
 * Booking Confirmation Email Template
 */
export const bookingConfirmationTemplate = (details: BookingDetails) => {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  return {
    subject: `Booking Confirmed - ${details.event_title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #fafafa; }
          .container { max-width: 650px; margin: 30px auto; background: white; border: 1px solid #ddd; border-radius: 6px; }
          .header { padding: 24px; border-bottom: 1px solid #eee; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 600; color: #333; }
          .content { padding: 24px; }
          .booking-code { background: #fafafa; border: 1px solid #ddd; padding: 16px; text-align: center; margin: 20px 0; border-radius: 6px; }
          .booking-code-label { margin: 0 0 6px 0; font-size: 13px; color: #666; }
          .booking-code-value { margin: 0; font-size: 24px; font-weight: 600; color: #333; letter-spacing: 2px; font-family: 'Courier New', monospace; }
          .section { margin: 20px 0; }
          .section-title { margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: #666; }
          .detail-row { display: flex; padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-size: 13px; color: #666; width: 120px; }
          .detail-value { font-size: 15px; color: #333; font-weight: 600; text-align: right; margin-left: auto; }
          .qr-section { text-align: center; margin: 24px 0; padding: 20px; background: #fafafa; border: 1px solid #ddd; border-radius: 6px; }
          .qr-section p { margin: 0 0 12px 0; color: #333; font-size: 13px; }
          .qr-section img { max-width: 200px; border-radius: 4px; }
          .notice { background: #fafafa; padding: 12px; margin: 20px 0; border-radius: 4px; font-size: 13px; color: #666; }
          .footer { padding: 20px; text-align: center; background: #fafafa; border-top: 1px solid #eee; font-size: 12px; color: #999; }
          .footer a { color: #195ADC; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Confirmed</h1>
          </div>
          
          <div class="content">
            <p style="margin: 0 0 24px 0;">Hello ${details.user_name},</p>
            
            <div class="booking-code">
              <p class="booking-code-label">Booking Code</p>
              <p class="booking-code-value">${details.booking_code}</p>
            </div>
            
            <div class="section">
              <h2 class="section-title">Event Details</h2>
              
              <div class="detail-row">
                <div class="detail-label">Event</div>
                <div class="detail-value"><strong>${details.event_title}</strong></div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Date</div>
                <div class="detail-value">${details.event_date}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Time</div>
                <div class="detail-value">${details.event_time}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Venue</div>
                <div class="detail-value">${details.venue_name}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Location</div>
                <div class="detail-value">${details.venue_address}, ${details.city}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Tickets</div>
                <div class="detail-value">${details.tickets_count}</div>
              </div>
            </div>
            
            <div class="qr-section">
              <p><strong>Access Your Ticket</strong></p>
              <p style="color: #6b7280; font-size: 13px; margin-bottom: 16px;">View your booking details and download your ticket with QR code</p>
              <a href="${baseUrl}/bookings" style="display: inline-block; background: #195ADC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">View & Download Ticket</a>
              <p style="color: #6b7280; font-size: 12px; margin-top: 16px;">Visit your bookings page to view QR code and download ticket</p>
            </div>
            
            ${details.entry_instructions ? `
            <div class="notice">
              ${details.entry_instructions}
            </div>
            ` : ''}
          </div>
          
          <div class="footer">
            Questions? Contact us at <a href="mailto:communication@convenehub.work">communication@convenehub.work</a><br>
            © ${new Date().getFullYear()} ConveneHub. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Booking Confirmed - ${details.event_title}

Hello ${details.user_name},

Your reservation has been successfully confirmed.

Booking Code: ${details.booking_code}

EVENT DETAILS
Event: ${details.event_title}
Date: ${details.event_date}
Time: ${details.event_time}
Venue: ${details.venue_name}
Location: ${details.venue_address}, ${details.city}
Tickets: ${details.tickets_count}

${details.entry_instructions ? `IMPORTANT: ${details.entry_instructions}\n` : ''}
Please present your booking code at the venue.

Questions? Contact us at communication@convenehub.work

ConveneHub
© ${new Date().getFullYear()} ConveneHub. All rights reserved.
    `.trim(),
  };
};

/**
 * Payment Receipt Email Template (for paid bookings)
 */
interface PaymentReceiptDetails {
  booking_code: string;
  payment_id: string;
  event_title: string;
  event_date: string;
  event_time: string;
  venue_name: string;
  venue_address: string;
  city: string;
  tickets_count: number;
  ticket_price: number;
  total_amount: number;
  user_name: string;
  user_email: string;
  payment_date: string;
  payment_method: string;
  transaction_id: string;
}

export const paymentReceiptTemplate = (details: PaymentReceiptDetails) => {
  return {
    subject: `Payment Receipt - ${details.event_title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #fafafa; }
          .container { max-width: 650px; margin: 30px auto; background: white; border: 1px solid #ddd; border-radius: 6px; }
          .header { padding: 24px; border-bottom: 1px solid #eee; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 600; color: #333; }
          .status-badge { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; margin-top: 8px; }
          .content { padding: 24px; }
          .receipt-section { border-top: 1px solid #eee; padding-top: 16px; margin-bottom: 20px; }
          .section-title { font-size: 13px; font-weight: 600; color: #666; margin-bottom: 12px; }
          .receipt-row { display: flex; padding: 10px 0; border-bottom: 1px solid #f5f5f5; }
          .receipt-row:last-child { border-bottom: none; }
          .receipt-label { font-size: 13px; color: #666; }
          .receipt-value { font-size: 15px; color: #333; font-weight: 600; text-align: right; margin-left: auto; }
          .total-row { display: flex; padding: 12px 0; border-top: 2px solid #ddd; margin: 16px 0; }
          .total-label { font-size: 15px; font-weight: 600; color: #333; }
          .total-value { font-size: 17px; font-weight: 600; color: #10b981; text-align: right; margin-left: auto; }
          .event-details { background: #fafafa; padding: 16px; border-radius: 6px; margin: 20px 0; }
          .event-detail-row { display: flex; padding: 8px 0; }
          .event-detail-label { font-size: 13px; color: #666; width: 120px; }
          .event-detail-value { font-size: 15px; color: #333; font-weight: 600; text-align: right; margin-left: auto; }
          .notice { background: #fafafa; padding: 12px; margin: 20px 0; border-radius: 4px; font-size: 13px; color: #666; }
          .footer { padding: 20px; text-align: center; background: #fafafa; border-top: 1px solid #eee; font-size: 12px; color: #999; }
          .footer a { color: #195ADC; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Receipt</h1>
            <div class="status-badge">✓ Payment Successful</div>
          </div>

          <div class="content">
            <p>Hi ${details.user_name},</p>
            <p>Thank you for your payment! Your booking for <strong>${details.event_title}</strong> is now confirmed.</p>

            <!-- Receipt Section -->
            <div class="receipt-section">
              <div class="section-title">Receipt Details</div>
              <div class="receipt-row">
                <span class="receipt-label">Receipt Number:</span>
                <span class="receipt-value">${details.payment_id}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Booking Code:</span>
                <span class="receipt-value">${details.booking_code}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Payment Date:</span>
                <span class="receipt-value">${new Date(details.payment_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Transaction ID:</span>
                <span class="receipt-value">${details.transaction_id}</span>
              </div>
            </div>

            <!-- Itemization -->
            <div class="receipt-section">
              <div class="section-title">Item Breakdown</div>
              <div class="receipt-row">
                <span class="receipt-label">Ticket Price (₹${details.ticket_price}/ticket)</span>
                <span class="receipt-value">₹${(details.ticket_price * details.tickets_count).toFixed(2)}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Quantity</span>
                <span class="receipt-value">${details.tickets_count} ticket(s)</span>
              </div>
              <div class="total-row">
                <span class="total-label">Total Amount Paid:</span>
                <span class="total-value">₹${details.total_amount.toFixed(2)}</span>
              </div>
            </div>

            <!-- Event Details -->
            <div class="event-details">
              <div class="section-title">Event Information</div>
              <div class="event-detail-row">
                <div class="event-detail-label">Event:</div>
                <div class="event-detail-value">${details.event_title}</div>
              </div>
              <div class="event-detail-row">
                <div class="event-detail-label">Date:</div>
                <div class="event-detail-value">${new Date(details.event_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
              <div class="event-detail-row">
                <div class="event-detail-label">Time:</div>
                <div class="event-detail-value">${details.event_time}</div>
              </div>
              <div class="event-detail-row">
                <div class="event-detail-label">Venue:</div>
                <div class="event-detail-value">${details.venue_name}</div>
              </div>
              <div class="event-detail-row">
                <div class="event-detail-label">Address:</div>
                <div class="event-detail-value">${details.venue_address}, ${details.city}</div>
              </div>
            </div>

            <div class="notice">
              Payment Method: ${details.payment_method}<br>
              Your booking confirmation and QR code have been sent separately.
            </div>
          </div>

          <div class="footer">
            Questions? Contact us at <a href="mailto:communication@convenehub.work">communication@convenehub.work</a><br>
            © ${new Date().getFullYear()} ConveneHub. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
PAYMENT RECEIPT - ${details.event_title}

Hi ${details.user_name},

Thank you for your payment! Your booking is now confirmed.

RECEIPT DETAILS
Receipt Number: ${details.payment_id}
Booking Code: ${details.booking_code}
Payment Date: ${new Date(details.payment_date).toLocaleDateString('en-IN')}
Transaction ID: ${details.transaction_id}

ITEM BREAKDOWN
Ticket Price: ₹${details.ticket_price} × ${details.tickets_count} = ₹${(details.ticket_price * details.tickets_count).toFixed(2)}
─────────────────────────────
Total Amount Paid: ₹${details.total_amount.toFixed(2)}

EVENT INFORMATION
Event: ${details.event_title}
Date: ${new Date(details.event_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${details.event_time}
Venue: ${details.venue_name}
Address: ${details.venue_address}, ${details.city}

Payment Method: ${details.payment_method}

Your booking confirmation and QR code have been sent separately. Please check your email.

Questions? Contact us at communication@convenehub.work

© ${new Date().getFullYear()} ConveneHub. All rights reserved.
    `.trim(),
  };
};

/**
 * Booking Cancellation Email Template
 */
export const bookingCancellationTemplate = (details: Omit<BookingDetails, 'qr_code_url'>) => {
  return {
    subject: `Booking Cancelled - ${details.event_title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #fafafa; }
          .container { max-width: 650px; margin: 30px auto; background: white; border: 1px solid #ddd; border-radius: 6px; }
          .header { padding: 24px; border-bottom: 1px solid #eee; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 600; color: #333; }
          .content { padding: 24px; }
          .notice { background: #fafafa; padding: 12px; margin: 20px 0; border-radius: 4px; font-size: 13px; color: #666; }
          .footer { padding: 20px; text-align: center; background: #fafafa; border-top: 1px solid #eee; font-size: 12px; color: #999; }
          .footer a { color: #195ADC; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Cancelled</h1>
          </div>
          
          <div class="content">
            <p>Hello ${details.user_name},</p>
            <p>Your booking for <strong>${details.event_title}</strong> has been cancelled.</p>
            <p><strong>Booking Code:</strong> ${details.booking_code}</p>
            
            <div class="notice">
              If you did not request this cancellation, please contact us immediately.
            </div>
          </div>
          
          <div class="footer">
            Questions? Contact us at <a href="mailto:communication@convenehub.work">communication@convenehub.work</a><br>
            © ${new Date().getFullYear()} ConveneHub. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Booking Cancelled - ${details.event_title}

Hello ${details.user_name},

Your booking for ${details.event_title} has been cancelled.
Booking Code: ${details.booking_code}

If you did not request this cancellation, please contact us immediately at communication@convenehub.work.

ConveneHub
© ${new Date().getFullYear()} ConveneHub. All rights reserved.
    `.trim(),
  };
};

/**
 * Event Reminder Email Template
 */
export const eventReminderTemplate = (details: Omit<BookingDetails, 'qr_code_url'>) => {
  return {
    subject: `Reminder: ${details.event_title} - ${details.event_date}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #fafafa; }
          .container { max-width: 650px; margin: 30px auto; background: white; border: 1px solid #ddd; border-radius: 6px; }
          .header { padding: 24px; border-bottom: 1px solid #eee; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 600; color: #333; }
          .content { padding: 24px; }
          .detail-box { background: #fafafa; border: 1px solid #ddd; padding: 16px; margin: 20px 0; border-radius: 6px; }
          .detail-box p { margin: 8px 0; font-size: 13px; color: #333; }
          .notice { background: #fafafa; padding: 12px; margin: 20px 0; border-radius: 4px; font-size: 13px; color: #666; }
          .footer { padding: 20px; text-align: center; background: #fafafa; border-top: 1px solid #eee; font-size: 12px; color: #999; }
          .footer a { color: #195ADC; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Event Reminder</h1>
          </div>
          
          <div class="content">
            <p>Hello ${details.user_name},</p>
            <p>This is a reminder about your upcoming event.</p>
            
            <div class="detail-box">
              <p><strong>Event:</strong> ${details.event_title}</p>
              <p><strong>Date:</strong> ${details.event_date}</p>
              <p><strong>Time:</strong> ${details.event_time}</p>
              <p><strong>Venue:</strong> ${details.venue_name}</p>
              <p><strong>Booking Code:</strong> ${details.booking_code}</p>
            </div>
            
            <div class="notice">
              <strong>Important Reminders:</strong><br>
              • Bring your booking code or QR code<br>
              • Arrive 15 minutes before the event starts<br>
              • Carry a valid ID for verification
            </div>
          </div>
          
          <div class="footer">
            Questions? Contact us at <a href="mailto:communication@convenehub.work">communication@convenehub.work</a><br>
            © ${new Date().getFullYear()} ConveneHub. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Reminder: ${details.event_title}

Hello ${details.user_name},

This is a reminder about your upcoming event.

EVENT DETAILS
Event: ${details.event_title}
Date: ${details.event_date}
Time: ${details.event_time}
Venue: ${details.venue_name}
Booking Code: ${details.booking_code}

IMPORTANT REMINDERS
- Bring your booking code or QR code
- Arrive 15 minutes before the event starts
- Carry a valid ID for verification

Questions? Contact us at communication@convenehub.work

ConveneHub
© ${new Date().getFullYear()} ConveneHub. All rights reserved.
    `.trim(),
  };
};

/**
 * Settlement Report Email Template (for Movie Teams)
 */
export const settlementReportTemplate = (details: SettlementDetails) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return {
    subject: `Settlement Report - ${details.event_title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.5; color: #333; background: #f4f4f4; }
          .container { max-width: 650px; margin: 30px auto; background: white; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; }
          .header { background: #195ADC; color: white; padding: 30px 24px; text-align: center; }
          .header h1 { font-size: 22px; font-weight: 600; }
          .content { padding: 24px; }
          .section { margin-bottom: 24px; }
          .section:last-of-type { margin-bottom: 0; }
          .section-title { font-size: 16px; font-weight: 600; margin: 24px 0 12px 0; color: #333; }
          .card { background: #fafafa; padding: 20px; border-radius: 4px; border: 1px solid #eee; }
          .card-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e5e5; }
          .card-row:last-child { border-bottom: none; }
          .row-label { font-size: 13px; color: #666; text-align: left; }
          .row-value { font-size: 15px; color: #333; font-weight: 600; text-align: right; margin-left: auto; }
          .financial-card { background: #fafafa; border-radius: 4px; border: 1px solid #eee; overflow: hidden; }
          .financial-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; border-bottom: 1px solid #e5e5e5; }
          .financial-row:last-child { border-bottom: none; }
          .financial-label { font-size: 13px; color: #666; text-align: left; }
          .financial-value { font-size: 15px; color: #333; font-weight: 600; text-align: right; margin-left: auto; }
          .financial-row.total { background: #f0f8ff; padding: 12px 20px; }
          .financial-row.total .financial-label { color: #195ADC; font-weight: 600; font-size: 14px; }
          .financial-row.total .financial-value { color: #195ADC; font-size: 16px; font-weight: 700; }
          .status-badge { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; }
          .status-settled { background: #d4edda; color: #155724; }
          .status-pending { background: #fff3cd; color: #856404; }
          .settlement-details { background: #f0f8ff; border: 1px solid #ddd; border-radius: 4px; padding: 16px; margin-top: 12px; }
          .settlement-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
          .settlement-row:first-child { padding-top: 0; }
          .settlement-row:last-child { border-bottom: none; padding-bottom: 0; }
          .settlement-label { font-size: 12px; font-weight: 600; color: #666; text-align: left;
            color: #1e40af;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .settlement-value { font-size: 12px; font-weight: 600; color: #333; text-align: right; margin-left: auto; }
          .notice { background: #f0f8ff; border-left: 3px solid #195ADC; padding: 12px; border-radius: 4px; font-size: 12px; color: #555; }
          .footer { padding: 20px; background: #fafafa; border-top: 1px solid #eee; text-align: center; }
          .footer p { font-size: 11px; color: #777; margin: 3px 0; }
          .divider {
            height: 1px;
            background: #e5e7eb;
            margin: 24px 0;
          }
          @media (max-width: 640px) {
            body {
              padding: 0;
              background: #f0f2f5;
            }
            .container {
              border-radius: 0;
            }
            .header {
              padding: 32px 24px 28px;
            }
            .content {
              padding: 28px 24px 32px;
            }
            .footer {
              padding: 24px;
            }
            .card-row,
            .financial-row {
              padding: 14px 16px;
            }
            .settlement-details {
              padding: 16px;
            }
            .row-label,
            .row-value,
            .financial-label,
            .financial-value {
              font-size: 13px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Settlement Report</h1>
          </div>

          <div class="content">
            <!-- Event Information -->
            <div class="section">
              <div class="section-title">Event Information</div>
              <div class="card">
                <div class="card-row">
                  <span class="row-label">Event Name</span>
                  <span class="row-value">${details.event_title}</span>
                </div>
                <div class="card-row">
                  <span class="row-label">Event Date</span>
                  <span class="row-value">${new Date(details.event_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div class="card-row">
                  <span class="row-label">Tickets Sold</span>
                  <span class="row-value">${details.tickets_sold}</span>
                </div>
              </div>
            </div>

            <!-- Financial Breakdown -->
            <div class="section">
              <div class="section-title">Financial Breakdown</div>
              <div class="financial-card">
                <div class="financial-row">
                  <span class="financial-label">Gross Revenue</span>
                  <span class="financial-value">${formatCurrency(details.gross_revenue)}</span>
                </div>
                <div class="financial-row deduction">
                  <span class="financial-label">Razorpay Gateway Fees (2%)</span>
                  <span class="financial-value">-${formatCurrency(details.razorpay_fees)}</span>
                </div>
                <div class="financial-row deduction">
                  <span class="financial-label">CONVENEHUB Commission (10%)</span>
                  <span class="financial-value">-${formatCurrency(details.convene_commission)}</span>
                </div>
                <div class="financial-row total">
                  <span class="financial-label">Net Payout</span>
                  <span class="financial-value">${formatCurrency(details.net_payout)}</span>
                </div>
              </div>
            </div>

            <!-- Settlement Status -->
            <div class="section">
              <div class="section-title">Settlement Status</div>
              <span class="status-badge ${details.settlement_status === 'settled' ? 'status-settled' : 'status-pending'}">
                ${details.settlement_status === 'settled' ? 'SETTLED' : 'PENDING'}
              </span>
              ${details.settlement_status === 'settled' && details.transaction_reference ? `
              <div class="settlement-details">
                <div class="settlement-row">
                  <span class="settlement-label">Reference</span>
                  <span class="settlement-value">${details.transaction_reference}</span>
                </div>
                <div class="settlement-row">
                  <span class="settlement-label">Date</span>
                  <span class="settlement-value">${details.transfer_date ? new Date(details.transfer_date).toLocaleDateString('en-IN') : 'N/A'}</span>
                </div>
                <div class="settlement-row">
                  <span class="settlement-label">Method</span>
                  <span class="settlement-value">${details.payment_method ? details.payment_method.replace(/_/g, ' ').toUpperCase() : 'N/A'}</span>
                </div>
                ${details.notes ? `
                <div class="settlement-row">
                  <span class="settlement-label">Notes</span>
                  <span class="settlement-value">${details.notes}</span>
                </div>
                ` : ''}
              </div>
              ` : ''}
            </div>

            <!-- Notice -->
            <div class="notice">
              Automated report. Please retain for your records.
            </div>
          </div>

          <div class="footer">
            <p class="footer-text">
              For questions regarding this settlement, contact<br>
              <a href="mailto:communication@convenehub.work" class="footer-link">communication@convenehub.work</a>
            </p>
            <p class="copyright">
              © ${new Date().getFullYear()} ConveneHub. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
SETTLEMENT REPORT - ${details.event_title}

EVENT INFORMATION
Event: ${details.event_title}
Date: ${new Date(details.event_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Tickets Sold: ${details.tickets_sold}

FINANCIAL BREAKDOWN
Gross Revenue: ${formatCurrency(details.gross_revenue)}
Razorpay Fees (2%): -${formatCurrency(details.razorpay_fees)}
CONVENEHUB Commission (10%): -${formatCurrency(details.convene_commission)}
─────────────────────────────────
Net Payout: ${formatCurrency(details.net_payout)}

SETTLEMENT STATUS
Status: ${details.settlement_status === 'settled' ? 'SETTLED' : 'PENDING'}
${details.settlement_status === 'settled' && details.transaction_reference ? `
Transfer Reference: ${details.transaction_reference}
Transfer Date: ${details.transfer_date ? new Date(details.transfer_date).toLocaleDateString('en-IN') : 'N/A'}
Payment Method: ${details.payment_method ? details.payment_method.replace(/_/g, ' ').toUpperCase() : 'N/A'}
${details.notes ? `Notes: ${details.notes}` : ''}
` : ''}

For questions, contact: communication@convenehub.work
© ${new Date().getFullYear()} ConveneHub. All rights reserved.
    `.trim(),
  };
};
