import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { BookingModel } from '../models/Booking';
import { EventModel } from '../models/Event';
import { TicketModel } from '../models/Ticket';
import { ReferralLinkModel } from '../models/ReferralLink';
import { CommissionModel } from '../models/Commission';
import { AttendeeModel } from '../models/Attendee';
import { generateCode } from '../utils/codes';
import QRCode from 'qrcode';

export const bookingsRouter = Router();
const BOOKING_ALLOWED_ROLES = ['attendee', 'admin', 'organizer', 'promoter'] as const;

function toLegacyBooking(booking: any, event?: any) {
  return {
    booking_id: String(booking._id),
    event_id: booking.eventId,
    user_id: booking.attendeeId,
    booking_code: booking.bookingCode,
    booking_status: booking.bookingStatus,
    tickets_count: booking.ticketsCount,
    total_amount: booking.amount,
    booked_at: booking.createdAt,
    payment_required: false,
    payment_status: 'NOT_REQUIRED',
    checked_in: false,
    event: event
      ? {
          event_id: String(event._id),
          title: event.title,
          description: event.description || '',
          venue_name: event.venue,
          venue_address: event.venue,
          city: event.city || '',
          date_time: event.dateTime,
          event_image: event.eventImage || '',
          status: event.status,
          entry_instructions: event.entryInstructions || '',
          ticket_price: event.ticketTiers?.[0]?.price ?? 0,
        }
      : undefined,
  };
}

const createBookingSchema = z
  .object({
    eventId: z.string().min(1).optional(),
    event_id: z.string().min(1).optional(),
    tierName: z.string().min(1).optional(),
    ticketsCount: z.number().int().positive().max(10).optional(),
    tickets_count: z.number().int().positive().max(10).optional(),
    referralCode: z.string().optional(),
    referral_code: z.string().optional(),
  })
  .transform((data) => ({
    eventId: data.eventId || data.event_id || '',
    tierName: data.tierName,
    ticketsCount: data.ticketsCount ?? data.tickets_count ?? 0,
    referralCode: data.referralCode || data.referral_code,
  }));

async function syncAttendeeRecord(eventId: string, attendeeId: string) {
  const activeBookings = await BookingModel.find({
    eventId,
    attendeeId,
    bookingStatus: 'confirmed',
  })
    .sort({ createdAt: 1 })
    .lean();

  if (activeBookings.length === 0) {
    await AttendeeModel.findOneAndDelete({ eventId, attendeeId });
    return;
  }

  const bookingIds = activeBookings.map((booking) => String(booking._id));
  const tickets = await TicketModel.find({ bookingId: { $in: bookingIds } }).sort({ createdAt: 1 }).lean();
  const primaryTicket = tickets[0];

  await AttendeeModel.findOneAndUpdate(
    { eventId, attendeeId },
    {
      eventId,
      attendeeId,
      qrCode: primaryTicket?.qrPayload || activeBookings[0].bookingCode,
      checkInStatus: tickets.some((ticket) => ticket.checkInStatus === 'checked_in') ? 'checked_in' : 'pending',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

bookingsRouter.post('/', requireAuth, requireRole(...BOOKING_ALLOWED_ROLES), async (req, res) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid input' });
  }

  const { eventId, tierName, ticketsCount, referralCode } = parsed.data;
  if (!eventId || !ticketsCount) {
    return res.status(400).json({ success: false, message: 'Event and ticket count are required' });
  }
  const event = await EventModel.findById(eventId);
  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found' });
  }
  if (event.status !== 'published') {
    return res.status(400).json({ success: false, message: 'Event is not open for booking' });
  }

  const tier =
    (tierName
      ? event.ticketTiers.find((t) => t.name.toLowerCase() === tierName.toLowerCase())
      : null) || event.ticketTiers[0];
  if (!tier) {
    return res.status(400).json({ success: false, message: 'Invalid ticket tier' });
  }

  const tierRemaining = tier.quantity - tier.soldCount;
  if (tierRemaining < ticketsCount || event.remaining < ticketsCount) {
    return res.status(400).json({ success: false, message: 'Not enough tickets available' });
  }

  const bookingCode = generateCode('CVH', 8);
  const amount = tier.price * ticketsCount;

  let promoterId: string | undefined;
  if (referralCode) {
    const ref = await ReferralLinkModel.findOne({ code: referralCode, eventId: String(event._id) });
    if (ref) {
      promoterId = ref.promoterId;
      ref.conversions += 1;
      await ref.save();
    }
  }

  const booking = await BookingModel.create({
    eventId: String(event._id),
    attendeeId: req.user?.sub,
    tierName: tier.name,
    ticketPrice: tier.price,
    ticketsCount,
    amount,
    bookingCode,
    bookingStatus: 'confirmed',
    referralCode,
    promoterId,
  });

  event.remaining -= ticketsCount;
  tier.soldCount += ticketsCount;
  await event.save();

  const ticketIds: string[] = [];
  for (let i = 0; i < ticketsCount; i += 1) {
    const ticket = new TicketModel({
      bookingId: String(booking._id),
      eventId: String(event._id),
      attendeeId: req.user?.sub,
      qrPayload: 'pending',
      checkInStatus: 'pending',
    });
    ticket.qrPayload = JSON.stringify({
      ticketId: String(ticket._id),
      eventId: String(event._id),
      bookingId: String(booking._id),
      attendeeId: req.user?.sub,
    });
    await ticket.save();
    ticketIds.push(String(ticket._id));
  }

  await syncAttendeeRecord(String(event._id), req.user!.sub);

  if (promoterId && referralCode) {
    const commissionAmount = Number((amount * 0.1).toFixed(2));
    await CommissionModel.create({
      promoterId,
      bookingId: String(booking._id),
      eventId: String(event._id),
      referralCode,
      amount: commissionAmount,
      status: 'pending',
    });
  }

  return res.status(201).json({
    success: true,
    booking: toLegacyBooking(booking.toObject(), event.toObject()),
    ticketIds,
  });
});

bookingsRouter.get('/', requireAuth, requireRole(...BOOKING_ALLOWED_ROLES), async (req, res) => {
  const bookings = await BookingModel.find({ attendeeId: req.user?.sub }).sort({ createdAt: -1 }).lean();
  const eventIds = bookings.map((booking) => booking.eventId);
  const events = await EventModel.find({ _id: { $in: eventIds } }).lean();
  const eventById = new Map(events.map((event) => [String(event._id), event]));

  const legacyBookings = bookings.map((booking) => toLegacyBooking(booking, eventById.get(String(booking.eventId))));
  return res.json({ success: true, bookings: legacyBookings });
});

bookingsRouter.get('/me', requireAuth, requireRole(...BOOKING_ALLOWED_ROLES), async (req, res) => {
  const bookings = await BookingModel.find({ attendeeId: req.user?.sub }).sort({ createdAt: -1 }).lean();
  return res.json({ success: true, bookings });
});

bookingsRouter.get('/:id/tickets', requireAuth, requireRole(...BOOKING_ALLOWED_ROLES), async (req, res) => {
  const booking = await BookingModel.findById(req.params.id).lean();
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

  if (req.user?.role !== 'admin' && booking.attendeeId !== req.user?.sub) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const tickets = await TicketModel.find({ bookingId: String(booking._id) }).lean();
  const mappedTickets = tickets.map((ticket, index) => ({
    ticket_id: String(ticket._id),
    ticket_number: index + 1,
    ticket_code: String(ticket._id).slice(-8).toUpperCase(),
    qr_nonce: String(ticket._id),
    checked_in: ticket.checkInStatus === 'checked_in',
    checked_in_at: ticket.checkedInAt,
    checked_in_by: ticket.checkedInBy,
  }));

  return res.json({ success: true, tickets: mappedTickets, booking: toLegacyBooking(booking) });
});

bookingsRouter.get('/:id/qr', requireAuth, requireRole(...BOOKING_ALLOWED_ROLES), async (req, res) => {
  const booking = await BookingModel.findById(req.params.id).lean();
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

  if (req.user?.role !== 'admin' && booking.attendeeId !== req.user?.sub) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const firstTicket = await TicketModel.findOne({ bookingId: String(booking._id) }).lean();
  if (!firstTicket) {
    return res.status(404).json({ success: false, message: 'No tickets found for booking' });
  }

  const qrCode = await QRCode.toDataURL(firstTicket.qrPayload, { width: 512, margin: 1 });
  return res.json({ success: true, qr_code: qrCode });
});

bookingsRouter.get('/:id', requireAuth, requireRole(...BOOKING_ALLOWED_ROLES), async (req, res) => {
  const booking = await BookingModel.findById(req.params.id).lean();
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

  if (req.user?.role !== 'admin' && booking.attendeeId !== req.user?.sub) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const tickets = await TicketModel.find({ bookingId: String(booking._id) }).lean();
  return res.json({ success: true, booking, tickets });
});

bookingsRouter.post('/:id/cancel', requireAuth, requireRole(...BOOKING_ALLOWED_ROLES), async (req, res) => {
  const booking = await BookingModel.findById(req.params.id);
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }
  if (req.user?.role !== 'admin' && booking.attendeeId !== req.user?.sub) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  if (booking.bookingStatus === 'cancelled') {
    return res.status(400).json({ success: false, message: 'Booking already cancelled' });
  }

  booking.bookingStatus = 'cancelled';
  await booking.save();

  const event = await EventModel.findById(booking.eventId);
  if (event) {
    event.remaining += booking.ticketsCount;
    const tier = event.ticketTiers.find((t) => t.name === booking.tierName);
    if (tier) {
      tier.soldCount = Math.max(0, tier.soldCount - booking.ticketsCount);
    }
    await event.save();
  }

  await TicketModel.deleteMany({ bookingId: String(booking._id) });
  await syncAttendeeRecord(String(booking.eventId), booking.attendeeId);

  return res.json({ success: true, message: 'Booking cancelled' });
});
