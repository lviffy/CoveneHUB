import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { TicketModel } from '../models/Ticket';
import { CheckInModel } from '../models/CheckIn';
import { EventModel } from '../models/Event';
import { AttendeeModel } from '../models/Attendee';

export const checkinsRouter = Router();

const qrCheckinSchema = z.object({
  qrPayload: z.string().min(1),
});

const manualCheckinSchema = z.object({
  ticketId: z.string().min(1),
});

async function processCheckin(ticketId: string, scannedBy: string, method: 'qr' | 'manual') {
  const ticket = await TicketModel.findById(ticketId);
  if (!ticket) {
    return { status: 404 as const, body: { success: false, message: 'Ticket not found' } };
  }

  if (ticket.checkInStatus === 'checked_in') {
    return { status: 409 as const, body: { success: false, message: 'Ticket already checked in' } };
  }

  ticket.checkInStatus = 'checked_in';
  ticket.checkedInAt = new Date();
  ticket.checkedInBy = scannedBy;
  await ticket.save();

  await CheckInModel.create({
    ticketId: String(ticket._id),
    eventId: ticket.eventId,
    bookingId: ticket.bookingId,
    attendeeId: ticket.attendeeId,
    scannedBy,
    method,
  });

  await AttendeeModel.findOneAndUpdate(
    { eventId: ticket.eventId, attendeeId: ticket.attendeeId },
    {
      $set: {
        eventId: ticket.eventId,
        attendeeId: ticket.attendeeId,
        qrCode: ticket.qrPayload,
        checkInStatus: 'checked_in',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { status: 200 as const, body: { success: true, ticket } };
}

async function canManageEvent(actorId: string, actorRole: 'admin' | 'organizer', eventId: string) {
  if (actorRole === 'admin') {
    return true;
  }

  const event = await EventModel.findById(eventId, { organizerId: 1 }).lean();
  return event?.organizerId === actorId;
}

checkinsRouter.post('/qr', requireAuth, requireRole('organizer', 'admin'), async (req, res) => {
  const parsed = qrCheckinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid qr payload' });
  }

  let payload: { ticketId?: string } = {};
  try {
    payload = JSON.parse(parsed.data.qrPayload) as { ticketId?: string };
  } catch {
    return res.status(400).json({ success: false, message: 'QR payload is not valid JSON' });
  }

  if (!payload.ticketId) {
    return res.status(400).json({ success: false, message: 'QR payload missing ticketId' });
  }

  const ticket = await TicketModel.findById(payload.ticketId, { eventId: 1 }).lean();
  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Ticket not found' });
  }

  const authorized = await canManageEvent(req.user!.sub, req.user!.role as 'admin' | 'organizer', ticket.eventId);
  if (!authorized) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const result = await processCheckin(payload.ticketId, req.user!.sub, 'qr');
  return res.status(result.status).json(result.body);
});

checkinsRouter.post('/manual', requireAuth, requireRole('organizer', 'admin'), async (req, res) => {
  const parsed = manualCheckinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: 'Invalid ticket id' });
  }

  const ticket = await TicketModel.findById(parsed.data.ticketId, { eventId: 1 }).lean();
  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Ticket not found' });
  }

  const authorized = await canManageEvent(req.user!.sub, req.user!.role as 'admin' | 'organizer', ticket.eventId);
  if (!authorized) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const result = await processCheckin(parsed.data.ticketId, req.user!.sub, 'manual');
  return res.status(result.status).json(result.body);
});

checkinsRouter.get('/event/:eventId', requireAuth, requireRole('organizer', 'admin'), async (req, res) => {
  const authorized = await canManageEvent(req.user!.sub, req.user!.role as 'admin' | 'organizer', req.params.eventId);
  if (!authorized) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const checkins = await CheckInModel.find({ eventId: req.params.eventId }).sort({ createdAt: -1 }).lean();
  return res.json({ success: true, checkins });
});
