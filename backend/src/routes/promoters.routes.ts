import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { ReferralLinkModel } from '../models/ReferralLink';
import { BookingModel } from '../models/Booking';
import { CommissionModel } from '../models/Commission';
import { generateCode } from '../utils/codes';
import { EventModel } from '../models/Event';

export const promotersRouter = Router();

const createReferralSchema = z.object({
  eventId: z.string().min(1),
});

promotersRouter.post('/links', requireAuth, requireRole('promoter', 'admin'), async (req, res) => {
  const parsed = createReferralSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid eventId' });
  }

  const event = await EventModel.findById(parsed.data.eventId, { status: 1 }).lean();
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }

  if (event.status !== 'published' && req.user?.role !== 'admin') {
    return res.status(400).json({ success: false, message: 'Referral links can only be created for published events' });
  }

  const existingLink = await ReferralLinkModel.findOne({
    promoterId: req.user?.sub,
    eventId: parsed.data.eventId,
  }).lean();

  if (existingLink) {
    return res.status(200).json({
      success: true,
      link: {
        id: String(existingLink._id),
        eventId: existingLink.eventId,
        code: existingLink.code,
        url: `/events/${existingLink.eventId}?ref=${existingLink.code}`,
        clicks: existingLink.clicks,
        conversions: existingLink.conversions,
      },
    });
  }

  const code = generateCode('REF', 7);
  const link = await ReferralLinkModel.create({
    promoterId: req.user?.sub,
    eventId: parsed.data.eventId,
    code,
    clicks: 0,
    conversions: 0,
  });

  return res.status(201).json({
    success: true,
    link: {
      id: String(link._id),
      eventId: link.eventId,
      code: link.code,
      url: `/events/${link.eventId}?ref=${link.code}`,
      clicks: link.clicks,
      conversions: link.conversions,
    },
  });
});

promotersRouter.get('/links', requireAuth, requireRole('promoter', 'admin'), async (req, res) => {
  const query = req.user?.role === 'admin' ? {} : { promoterId: req.user?.sub };
  const links = await ReferralLinkModel.find(query).sort({ createdAt: -1 }).lean();
  return res.json({ success: true, links });
});

promotersRouter.get('/performance', requireAuth, requireRole('promoter', 'admin'), async (req, res) => {
  const query = req.user?.role === 'admin' ? { promoterId: { $ne: null } } : { promoterId: req.user?.sub };
  const bookings = await BookingModel.find(query).lean();
  const totalBookings = bookings.length;
  const totalTickets = bookings.reduce((sum, b) => sum + b.ticketsCount, 0);
  const totalRevenue = Number(bookings.reduce((sum, b) => sum + b.amount, 0).toFixed(2));

  return res.json({
    success: true,
    performance: {
      totalBookings,
      totalTickets,
      totalRevenue,
    },
  });
});

promotersRouter.get('/commissions', requireAuth, requireRole('promoter', 'admin'), async (req, res) => {
  const query = req.user?.role === 'admin' ? {} : { promoterId: req.user?.sub };
  const commissions = await CommissionModel.find(query).sort({ createdAt: -1 }).lean();

  const totals = commissions.reduce(
    (acc, commission) => {
      acc.total += commission.amount;
      if (commission.status === 'paid') acc.paid += commission.amount;
      else acc.pending += commission.amount;
      return acc;
    },
    { total: 0, paid: 0, pending: 0 }
  );

  return res.json({
    success: true,
    commissions,
    totals: {
      total: Number(totals.total.toFixed(2)),
      paid: Number(totals.paid.toFixed(2)),
      pending: Number(totals.pending.toFixed(2)),
    },
  });
});
