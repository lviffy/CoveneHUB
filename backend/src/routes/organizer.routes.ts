import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { EventModel } from '../models/Event';
import { BookingModel } from '../models/Booking';
import { CheckInModel } from '../models/CheckIn';

export const organizerRouter = Router();

function mapEventStatus(status?: string) {
  if (status === 'closed') return 'ended';
  return status || 'draft';
}

function toMoney(value: number) {
  return Number(value.toFixed(2));
}

organizerRouter.get('/my-events', requireAuth, requireRole('organizer', 'admin'), async (req, res) => {
  const actorId = req.user?.sub;
  if (!actorId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const events = await EventModel.find({ organizerId: actorId }).sort({ dateTime: 1 }).lean();

  if (events.length === 0) {
    return res.json({ success: true, events: [] });
  }

  const eventIds = events.map((event) => String(event._id));
  const bookings = await BookingModel.find({
    eventId: { $in: eventIds },
    bookingStatus: { $ne: 'cancelled' },
  })
    .select('eventId ticketsCount')
    .lean();

  const soldByEventId = new Map<string, number>();
  for (const booking of bookings) {
    const id = String(booking.eventId || '');
    const prev = soldByEventId.get(id) || 0;
    soldByEventId.set(id, prev + (booking.ticketsCount || 1));
  }

  const payload = events.map((event) => {
    const eventId = String(event._id);
    const sold = soldByEventId.get(eventId) || 0;
    const remaining = Math.max(0, event.capacity - sold);

    return {
      event_id: eventId,
      title: event.title,
      description: event.description || '',
      venue_name: event.venue || '',
      venue_address: event.venue || '',
      city: event.city || '',
      date_time: event.dateTime,
      capacity: event.capacity,
      remaining,
      status: event.status,
      assigned_at: event.createdAt,
    };
  });

  return res.json({ success: true, events: payload });
});

organizerRouter.get('/events', requireAuth, requireRole('organizer', 'admin'), async (req, res) => {
  const actorId = req.user?.sub;
  if (!actorId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const statusQuery = typeof req.query.status === 'string' ? req.query.status : '';
  const requested = statusQuery
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const statusMap: Record<string, string> = {
    draft: 'draft',
    published: 'published',
    checkin_open: 'checkin_open',
    in_progress: 'in_progress',
    ended: 'ended',
    closed: 'ended',
  };

  const mappedStatuses = Array.from(new Set(requested.map((s) => statusMap[s]).filter(Boolean)));
  const query: Record<string, unknown> = { organizerId: actorId };
  if (mappedStatuses.length > 0) {
    query.status = { $in: mappedStatuses };
  }

  const events = await EventModel.find(query).sort({ dateTime: 1 }).lean();

  return res.json({
    success: true,
    events: events.map((event) => ({
      event_id: String(event._id),
      title: event.title,
      date_time: event.dateTime,
      status: mapEventStatus(event.status),
    })),
  });
});

organizerRouter.get('/financial-summary', requireAuth, requireRole('organizer', 'admin'), async (req, res) => {
  const actorId = req.user?.sub;
  if (!actorId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const PROCESSING_FEE_PERCENTAGE = 0;
  const PLATFORM_COMMISSION_PERCENTAGE = 10;

  const events = await EventModel.find({ organizerId: actorId, status: { $in: ['published', 'checkin_open', 'in_progress', 'ended', 'closed'] } })
    .sort({ dateTime: -1 })
    .lean();

  if (events.length === 0) {
    return res.json({
      success: true,
      events: [],
      summary: {
        total_events: 0,
        total_tickets_sold: 0,
        total_gross_revenue: 0,
        total_processing_fees: 0,
        total_platform_commission: 0,
        total_net_payout: 0,
      },
      fee_structure: {
        processing_fee_percentage: PROCESSING_FEE_PERCENTAGE,
        platform_commission_note: 'Commission percentage varies per event',
      },
    });
  }

  const eventIds = events.map((event) => String(event._id));
  const bookings = await BookingModel.find({ eventId: { $in: eventIds }, bookingStatus: 'confirmed' }).sort({ createdAt: -1 }).lean();

  const eventsPayload = events.map((event) => {
    const eventId = String(event._id);
    const eventBookings = bookings.filter((booking) => booking.eventId === eventId);

    const totalBookings = eventBookings.length;
    const totalTicketsSold = eventBookings.reduce((sum, booking) => sum + booking.ticketsCount, 0);
    const grossRevenue = eventBookings.reduce((sum, booking) => sum + booking.amount, 0);
    const processingFees = (grossRevenue * PROCESSING_FEE_PERCENTAGE) / 100;
    const platformCommission = (grossRevenue * PLATFORM_COMMISSION_PERCENTAGE) / 100;
    const netPayout = grossRevenue - processingFees - platformCommission;

    return {
      event_id: eventId,
      title: event.title,
      date_time: event.dateTime,
      venue_name: event.venue,
      city: event.city || '',
      status: mapEventStatus(event.status),
      settlement_status: null,
      settlement_details: null,
      financial_summary: {
        total_bookings: totalBookings,
        total_tickets_sold: totalTicketsSold,
        free_bookings: 0,
        paid_bookings: totalBookings,
        gross_revenue: toMoney(grossRevenue),
        processing_fees: toMoney(processingFees),
        processing_fee_percentage: PROCESSING_FEE_PERCENTAGE,
        platform_commission: toMoney(platformCommission),
        platform_commission_percentage: PLATFORM_COMMISSION_PERCENTAGE,
        net_payout_to_movie_team: toMoney(netPayout),
      },
      bookings: eventBookings.map((booking) => ({
        booking_id: String(booking._id),
        tickets_count: booking.ticketsCount,
        total_amount: toMoney(booking.amount),
        booking_status: booking.bookingStatus,
        payment_required: false,
        payment_status: booking.paymentStatus || 'not_required',
        booked_at: (booking as any).createdAt,
      })),
    };
  });

  const summary = eventsPayload.reduce(
    (acc, event) => {
      acc.total_events += 1;
      acc.total_tickets_sold += event.financial_summary.total_tickets_sold;
      acc.total_gross_revenue += event.financial_summary.gross_revenue;
      acc.total_processing_fees += event.financial_summary.processing_fees;
      acc.total_platform_commission += event.financial_summary.platform_commission;
      acc.total_net_payout += event.financial_summary.net_payout_to_movie_team;
      return acc;
    },
    {
      total_events: 0,
      total_tickets_sold: 0,
      total_gross_revenue: 0,
      total_processing_fees: 0,
      total_platform_commission: 0,
      total_net_payout: 0,
    }
  );

  return res.json({
    success: true,
    events: eventsPayload,
    summary: {
      total_events: summary.total_events,
      total_tickets_sold: summary.total_tickets_sold,
      total_gross_revenue: toMoney(summary.total_gross_revenue),
      total_processing_fees: toMoney(summary.total_processing_fees),
      total_platform_commission: toMoney(summary.total_platform_commission),
      total_net_payout: toMoney(summary.total_net_payout),
    },
    fee_structure: {
      processing_fee_percentage: PROCESSING_FEE_PERCENTAGE,
      platform_commission_note: 'Commission percentage varies per event',
    },
  });
});

organizerRouter.get('/reconciliation', requireAuth, requireRole('organizer', 'admin'), async (req, res) => {
  const actorId = req.user?.sub;
  if (!actorId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const events = await EventModel.find({ organizerId: actorId, status: { $in: ['published', 'checkin_open', 'in_progress', 'ended', 'closed'] } })
    .sort({ dateTime: -1 })
    .lean();

  const eventIds = events.map((event) => String(event._id));
  const bookings = await BookingModel.find({ eventId: { $in: eventIds }, bookingStatus: 'confirmed' }).lean();
  const bookingIds = bookings.map((booking) => String(booking._id));
  const checkins = await CheckInModel.find({ bookingId: { $in: bookingIds } }).lean();

  const eventsPayload = events.map((event) => {
    const eventId = String(event._id);
    const eventBookings = bookings.filter((booking) => booking.eventId === eventId);
    const eventBookingIds = new Set(eventBookings.map((booking) => String(booking._id)));
    const eventCheckins = checkins.filter((checkin) => eventBookingIds.has(checkin.bookingId));

    const totalBookings = eventBookings.length;
    const totalCheckins = eventCheckins.length;
    const noShows = Math.max(0, totalBookings - totalCheckins);
    const paidBookings = eventBookings.filter((booking) => booking.paymentStatus === 'paid').length;
    const freeBookings = eventBookings.filter((booking) => !booking.paymentStatus).length;
    const pendingPayments = eventBookings.filter((booking) => booking.paymentStatus === 'pending').length;
    const failedPayments = eventBookings.filter((booking) => booking.paymentStatus === 'failed').length;
    const grossRevenue = eventBookings.reduce((sum, booking) => sum + booking.amount, 0);

    let reconciliationStatus: 'matched' | 'discrepancy' | 'pending' = 'matched';
    let discrepancyReason: string | undefined;

    if (pendingPayments > 0) {
      reconciliationStatus = 'pending';
      discrepancyReason = 'Pending payments to be resolved';
    }

    if (totalBookings > 0 && noShows > totalBookings * 0.2) {
      reconciliationStatus = 'discrepancy';
      discrepancyReason = 'High no-show rate (>20%)';
    }

    return {
      event_id: eventId,
      event_title: event.title,
      event_date: event.dateTime,
      total_bookings: totalBookings,
      total_checkins: totalCheckins,
      no_shows: noShows,
      paid_bookings: paidBookings,
      free_bookings: freeBookings,
      pending_payments: pendingPayments,
      failed_payments: failedPayments,
      gross_revenue: toMoney(grossRevenue),
      reconciliation_status: reconciliationStatus,
      discrepancy_reason: discrepancyReason,
      checkin_to_payment_ratio: totalBookings > 0 ? Number(((totalCheckins / totalBookings) * 100).toFixed(2)) : 0,
    };
  });

  const summary = {
    total_events: eventsPayload.length,
    matched_events: eventsPayload.filter((event) => event.reconciliation_status === 'matched').length,
    discrepancy_events: eventsPayload.filter((event) => event.reconciliation_status === 'discrepancy').length,
    pending_events: eventsPayload.filter((event) => event.reconciliation_status === 'pending').length,
    total_bookings: eventsPayload.reduce((sum, event) => sum + event.total_bookings, 0),
    total_checkins: eventsPayload.reduce((sum, event) => sum + event.total_checkins, 0),
    overall_checkin_rate: 0,
    discrepancies: [] as Array<{ type: string; count: number; description: string }>,
  };

  summary.overall_checkin_rate =
    summary.total_bookings > 0 ? Number(((summary.total_checkins / summary.total_bookings) * 100).toFixed(2)) : 0;

  const highNoShowEvents = eventsPayload.filter((event) => event.no_shows > event.total_bookings * 0.2).length;
  if (highNoShowEvents > 0) {
    summary.discrepancies.push({
      type: 'high_no_show',
      count: highNoShowEvents,
      description: 'High no-show rate detected',
    });
  }

  const pendingPayments = eventsPayload.reduce((sum, event) => sum + event.pending_payments, 0);
  if (pendingPayments > 0) {
    summary.discrepancies.push({
      type: 'pending_payments',
      count: pendingPayments,
      description: 'Pending payments awaiting verification',
    });
  }

  return res.json({ success: true, events: eventsPayload, summary });
});
