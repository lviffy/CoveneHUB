import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { BookingModel } from '../models/Booking';
import { EventModel } from '../models/Event';
import { TicketModel } from '../models/Ticket';
import { CommissionModel } from '../models/Commission';

export const analyticsRouter = Router();

analyticsRouter.get('/event/:eventId', requireAuth, requireRole('organizer', 'admin'), async (req, res) => {
  const eventId = req.params.eventId;
  const [event, bookings, checkedInCount, commissions] = await Promise.all([
    EventModel.findById(eventId).lean(),
    BookingModel.find({ eventId, bookingStatus: 'confirmed' }).lean(),
    TicketModel.countDocuments({ eventId, checkInStatus: 'checked_in' }),
    CommissionModel.find({ eventId }).lean(),
  ]);

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  if (req.user?.role !== 'admin' && event.organizerId !== req.user?.sub) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const ticketsSold = bookings.reduce((sum, b) => sum + b.ticketsCount, 0);
  const revenue = Number(bookings.reduce((sum, b) => sum + b.amount, 0).toFixed(2));

  const byPromoter = commissions.reduce<Record<string, number>>((acc, c) => {
    acc[c.promoterId] = (acc[c.promoterId] || 0) + c.amount;
    return acc;
  }, {});

  return res.json({
    success: true,
    analytics: {
      event,
      revenue,
      ticketsSold,
      checkedInCount,
      attendanceRate: ticketsSold > 0 ? Number(((checkedInCount / ticketsSold) * 100).toFixed(2)) : 0,
      promoterPerformance: byPromoter,
    },
  });
});

analyticsRouter.get('/organizer/:organizerId', requireAuth, requireRole('organizer', 'admin'), async (req, res) => {
  if (req.user?.role !== 'admin' && req.user?.sub !== req.params.organizerId) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const events = await EventModel.find({ organizerId: req.params.organizerId }).lean();
  const eventIds = events.map((e) => String(e._id));
  const bookings = await BookingModel.find({ eventId: { $in: eventIds }, bookingStatus: 'confirmed' }).lean();

  const totalRevenue = Number(bookings.reduce((sum, booking) => sum + booking.amount, 0).toFixed(2));
  const totalTickets = bookings.reduce((sum, booking) => sum + booking.ticketsCount, 0);

  return res.json({
    success: true,
    analytics: {
      totalEvents: events.length,
      totalRevenue,
      totalTickets,
    },
  });
});

analyticsRouter.get('/promoter/:promoterId', requireAuth, requireRole('promoter', 'admin'), async (req, res) => {
  const promoterId = req.params.promoterId;
  if (req.user?.role !== 'admin' && req.user?.sub !== promoterId) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const bookings = await BookingModel.find({ promoterId, bookingStatus: 'confirmed' }).lean();
  const commissions = await CommissionModel.find({ promoterId }).lean();

  return res.json({
    success: true,
    analytics: {
      totalBookings: bookings.length,
      totalTickets: bookings.reduce((sum, b) => sum + b.ticketsCount, 0),
      generatedRevenue: Number(bookings.reduce((sum, b) => sum + b.amount, 0).toFixed(2)),
      totalCommission: Number(commissions.reduce((sum, c) => sum + c.amount, 0).toFixed(2)),
    },
  });
});
