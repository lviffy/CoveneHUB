import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import nodemailer from 'nodemailer';
import Decimal from 'decimal.js';

interface EventFinancial {
  event_id: string;
  event_name: string;
  date_time: string;
  venue_name: string;
  city: string;
  total_revenue: string;
  total_bookings: number;
  total_tickets: number;
  convene_commission_percentage: number;
  is_settled: boolean;
}

interface FinancialData {
  events: EventFinancial[];
  summary: {
    total_gross_revenue: string;
    total_convene_commission: string;
    total_net_payout: string;
    total_bookings?: number;
    total_tickets_sold: number;
    total_events?: number;
  };
  fee_structure: {
    razorpay_fee_percentage: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is eon_team
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null; error: any };

    if (profileError || !profile || profile.role !== 'eon_team') {
      return NextResponse.json(
        { error: 'Forbidden: Only CONVENEHUB team members can access this' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { recipient_email, summary_data } = body;

    if (!recipient_email || typeof recipient_email !== 'string') {
      return NextResponse.json(
        { error: 'Valid recipient_email is required' },
        { status: 400 }
      );
    }

    if (!summary_data) {
      return NextResponse.json(
        { error: 'summary_data is required' },
        { status: 400 }
      );
    }

    // Transform the data to match expected structure
    const transformedEvents = summary_data.events.map((event: any) => ({
      event_id: event.event_id,
      event_name: event.title,
      date_time: event.date_time,
      venue_name: event.venue_name,
      city: event.city,
      total_revenue: event.financial_summary?.gross_revenue || '0',
      total_bookings: event.financial_summary?.total_bookings || 0,
      total_tickets: event.financial_summary?.total_tickets_sold || 0,
      convene_commission_percentage: event.financial_summary?.convene_commission_percentage || 10,
      is_settled: event.settlement_status === 'settled',
    }));

    const data = {
      events: transformedEvents,
      summary: summary_data.summary,
      fee_structure: summary_data.fee_structure,
    };

    // Calculate summary metrics using the correct property paths
    const totalRevenue = new Decimal(data.summary?.total_gross_revenue || 0);
    const totalRazorpayFees = new Decimal(data.summary?.total_razorpay_fees || 0);
    const totalConveneHubCommission = new Decimal(data.summary?.total_convene_commission || 0);
    const totalMovieTeamPayout = new Decimal(data.summary?.total_net_payout || 0);
    const totalBookings = data.summary?.total_bookings || 0;
    const totalTickets = data.summary?.total_tickets_sold || 0;
    const totalEvents = data.events?.length || 0;

    const averageRevenuePerEvent = totalEvents > 0 
      ? totalRevenue.dividedBy(totalEvents) 
      : new Decimal(0);
    
    const averageTicketsPerEvent = totalEvents > 0 
      ? Math.round(totalTickets / totalEvents) 
      : 0;

    const effectiveFeePercentage = totalRevenue.greaterThan(0)
      ? totalConveneHubCommission.dividedBy(totalRevenue).times(100)
      : new Decimal(0);

    const settledEvents = data.events?.filter((e: EventFinancial) => e.is_settled).length || 0;
    const pendingEvents = totalEvents - settledEvents;

    // Generate CSV content
    const reportDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    let csvContent = 'CONVENEHUB Financial Summary Report\n';
    csvContent += `Generated: ${reportDate}\n\n`;
    
    csvContent += 'SUMMARY\n';
    csvContent += 'Metric,Value\n';
    csvContent += `Total Revenue,₹${totalRevenue.toFixed(2)}\n`;
    csvContent += `Razorpay Fees,₹${totalRazorpayFees.toFixed(2)}\n`;
    csvContent += `CONVENEHUB Commission,₹${totalConveneHubCommission.toFixed(2)}\n`;
    csvContent += `Movie Team Payout,₹${totalMovieTeamPayout.toFixed(2)}\n`;
    csvContent += `Total Events,${totalEvents}\n`;
    csvContent += `Total Bookings,${totalBookings}\n`;
    csvContent += `Total Tickets,${totalTickets}\n\n`;
    
    csvContent += 'EVENTS\n';
    csvContent += 'Event Name,Date,Venue,City,Revenue,Razorpay Fee,Commission %,Commission Amount,Payout,Bookings,Tickets,Status\n';

    if (data.events && data.events.length > 0) {
      data.events.forEach((event: EventFinancial) => {
        const eventRevenue = new Decimal(event.total_revenue || 0);
        const razorpayFees = eventRevenue.times(2).dividedBy(100); // 2% Razorpay fee
        const commissionPercentage = event.convene_commission_percentage || 10;
        const conveneCommission = eventRevenue.times(commissionPercentage / 100);
        const movieTeamPayout = eventRevenue.minus(razorpayFees).minus(conveneCommission);

        // Sanitize fields for CSV
        const sanitize = (str: string) => {
          if (!str) return '';
          const sanitized = String(str).replace(/"/g, '""');
          return sanitized.includes(',') ? `"${sanitized}"` : sanitized;
        };

        const formattedDate = new Date(event.date_time).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });

        csvContent += `${sanitize(event.event_name)},${sanitize(formattedDate)},${sanitize(event.venue_name)},${sanitize(event.city)},₹${eventRevenue.toFixed(2)},₹${razorpayFees.toFixed(2)},${commissionPercentage}%,₹${conveneCommission.toFixed(2)},₹${movieTeamPayout.toFixed(2)},${event.total_bookings},${event.total_tickets},${event.is_settled ? 'Settled' : 'Pending'}\n`;
      });
    }

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Generate HTML email content
    const htmlContent = `
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
            .summary { background: #fafafa; padding: 20px; border-radius: 4px; margin-bottom: 24px; border: 1px solid #eee; }
            .summary-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e5e5; }
            .summary-row:last-child { border-bottom: none; }
            .summary-label { font-size: 13px; color: #666; text-align: left; }
            .summary-value { font-size: 15px; font-weight: 600; color: #333; text-align: right; margin-left: auto; }
            .section-title { font-size: 16px; font-weight: 600; margin: 24px 0 12px 0; color: #333; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; }
            th { background: #fafafa; color: #555; padding: 10px; text-align: left; font-weight: 600; font-size: 12px; border-bottom: 1px solid #ddd; }
            td { padding: 10px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
            tr:last-child td { border-bottom: none; }
            .event-name { font-weight: 600; color: #333; margin-bottom: 3px; }
            .event-details { font-size: 11px; color: #777; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; }
            .badge-settled { background: #d4edda; color: #155724; }
            .badge-pending { background: #fff3cd; color: #856404; }
            .footer { padding: 20px; background: #fafafa; border-top: 1px solid #eee; text-align: center; }
            .footer p { font-size: 11px; color: #777; margin: 3px 0; }
            .note { background: #f0f8ff; padding: 12px; border-radius: 4px; border-left: 3px solid #195ADC; margin: 20px 0; font-size: 12px; color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <h1>Financial Summary Report</h1>
            </div>
            
            <!-- Content -->
            <div class="content">
              <!-- Summary -->
              <div class="summary">
                <div class="summary-row">
                  <span class="summary-label">Total Revenue</span>
                  <span class="summary-value">₹${totalRevenue.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Razorpay Fees</span>
                  <span class="summary-value">₹${totalRazorpayFees.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">CONVENEHUB Commission</span>
                  <span class="summary-value">₹${totalConveneHubCommission.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Movie Team Payout</span>
                  <span class="summary-value">₹${totalMovieTeamPayout.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                  <span class="summary-label">Total Events</span>
                  <span class="summary-value">${totalEvents} events • ${totalBookings} bookings • ${totalTickets} tickets</span>
                </div>
              </div>

              <!-- Events -->
              <h2 class="section-title">Events</h2>
              <table>
                <thead>
                  <tr>
                    <th>Event</th>
                    <th style="text-align: right;">Revenue</th>
                    <th style="text-align: right;">Razorpay</th>
                    <th style="text-align: center;">Commission</th>
                    <th style="text-align: right;">Payout</th>
                    <th style="text-align: center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.events && data.events.length > 0 ? data.events.map((event: EventFinancial) => {
                    const eventRevenue = new Decimal(event.total_revenue || 0);
                    const razorpayFees = eventRevenue.times(2).dividedBy(100); // 2% Razorpay fee
                    const commissionPercentage = event.convene_commission_percentage || 10;
                    const conveneCommission = eventRevenue.times(commissionPercentage / 100);
                    const movieTeamPayout = eventRevenue.minus(razorpayFees).minus(conveneCommission);

                    return `
                      <tr>
                        <td>
                          <div class="event-name">${event.event_name}</div>
                          <div class="event-details">${new Date(event.date_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • ${event.venue_name}</div>
                          <div class="event-details">${event.total_bookings} bookings • ${event.total_tickets} tickets</div>
                        </td>
                        <td style="text-align: right;">₹${eventRevenue.toFixed(2)}</td>
                        <td style="text-align: right;">₹${razorpayFees.toFixed(2)}</td>
                        <td style="text-align: center;">${commissionPercentage}%</td>
                        <td style="text-align: right; font-weight: 600;">₹${movieTeamPayout.toFixed(2)}</td>
                        <td style="text-align: center;">
                          <span class="badge ${event.is_settled ? 'badge-settled' : 'badge-pending'}">
                            ${event.is_settled ? 'Settled' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    `;
                  }).join('') : '<tr><td colspan="6" style="text-align: center; color: #6c757d; padding: 24px;">No events found</td></tr>'}
                </tbody>
              </table>

              <!-- Note -->
              <div class="note">
                CSV report attached for your records.
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p>CONVENEHUB Event Management Platform</p>
              <p>Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email with CSV attachment
    await transporter.sendMail({
      from: `"CONVENEHUB Financial Reports" <${process.env.SMTP_FROM_EMAIL}>`,
      to: recipient_email,
      subject: `CONVENEHUB Financial Summary Report - ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      html: htmlContent,
      attachments: [
        {
          filename: `convene-financial-summary-${new Date().toISOString().split('T')[0]}.csv`,
          content: csvContent,
          contentType: 'text/csv',
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Financial summary email sent successfully',
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
