import { Router } from 'express';
import { createHmac, randomBytes } from 'crypto';
import Razorpay from 'razorpay';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { env } from '../config/env';
import { EventModel } from '../models/Event';
import { BookingModel } from '../models/Booking';
import { TicketModel } from '../models/Ticket';
import { UserModel } from '../models/User';
import { PaymentAttemptModel } from '../models/PaymentAttempt';
import { AttendeeModel } from '../models/Attendee';

export const paymentsRouter = Router();
const PAYMENT_ALLOWED_ROLES = ['attendee', 'admin', 'organizer', 'promoter'] as const;

const PAYMENT_CURRENCY = process.env.PAYMENT_CURRENCY || 'INR';
const PAYMENT_TIMEOUT_MINUTES = Number(process.env.PAYMENT_TIMEOUT_MINUTES || 15);
const MAX_TICKETS_PER_USER = 10;

const createOrderSchema = z.object({
  eventId: z.string().min(1),
  ticketsCount: z.number().int().min(1).max(MAX_TICKETS_PER_USER),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

const failPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  reason: z.string().optional(),
  error_code: z.string().optional(),
  error_description: z.string().optional(),
});

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

function generateBookingCode() {
  return randomBytes(4).toString('hex').toUpperCase();
}

function generateTicketCode(length = 8) {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)
    .toUpperCase();
}

function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return false;
  }

  const expected = createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return expected === signature;
}

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
  const tickets = await TicketModel.find({ bookingId: { $in: bookingIds } })
    .sort({ createdAt: 1 })
    .lean();
  const primaryTicket = tickets[0];

  await AttendeeModel.findOneAndUpdate(
    { eventId, attendeeId },
    {
      eventId,
      attendeeId,
      qrCode: primaryTicket?.qrPayload || activeBookings[0].bookingCode,
      checkInStatus: tickets.some((ticket) => ticket.checkInStatus === 'checked_in')
        ? 'checked_in'
        : 'pending',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

paymentsRouter.post(
  '/create-order',
  requireAuth,
  requireRole(...PAYMENT_ALLOWED_ROLES),
  async (req, res) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid payment request',
      });
    }

    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ error: 'Razorpay is not configured on the backend.' });
    }

    const { eventId, ticketsCount } = parsed.data;
    const userId = req.user!.sub;

    const event = await EventModel.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status !== 'published') {
      return res.status(400).json({ error: 'Event is not open for booking' });
    }

    const tier = event.ticketTiers[0];
    if (!tier) {
      return res.status(400).json({ error: 'Event does not have a valid ticket tier' });
    }

    const tierRemaining = tier.quantity - tier.soldCount;
    if (tierRemaining < ticketsCount || event.remaining < ticketsCount) {
      return res.status(400).json({ error: 'Not enough tickets available' });
    }

    const existingConfirmedBooking = await BookingModel.findOne({
      eventId,
      attendeeId: userId,
      bookingStatus: 'confirmed',
    }).lean();

    if (existingConfirmedBooking) {
      return res.status(409).json({
        error: 'You already have a booking for this event.',
        existing_booking: {
          booking_id: String(existingConfirmedBooking._id),
          current_tickets: existingConfirmedBooking.ticketsCount,
          can_add_more: false,
          booking_status: existingConfirmedBooking.bookingStatus,
          payment_status: existingConfirmedBooking.paymentStatus || 'paid',
        },
      });
    }

    const existingPendingAttempt = await PaymentAttemptModel.findOne({
      userId,
      eventId,
      status: 'created',
      expiresAt: { $gt: new Date() },
    }).lean();

    const user = await UserModel.findById(userId).lean();
    const attendeeName = user?.fullName || user?.email?.split('@')[0] || 'Attendee';

    if (existingPendingAttempt) {
      return res.json({
        success: true,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        orderId: existingPendingAttempt.razorpayOrderId,
        amount: Math.round(existingPendingAttempt.amount * 100),
        currency: PAYMENT_CURRENCY,
        bookingDetails: {
          booking_id: String(existingPendingAttempt._id),
          booking_code: existingPendingAttempt.bookingCode,
          name: attendeeName,
          email: user?.email || '',
          contact: user?.phone || '',
          event: {
            id: eventId,
            title: event.title,
            ticketsCount: existingPendingAttempt.ticketsCount,
            totalAmount: existingPendingAttempt.amount,
          },
        },
        expiresAt: existingPendingAttempt.expiresAt,
        isExisting: true,
      });
    }

    await PaymentAttemptModel.updateMany(
      { userId, eventId, status: 'created', expiresAt: { $lte: new Date() } },
      { $set: { status: 'expired' } }
    );

    const amount = Number((tier.price * ticketsCount).toFixed(2));
    const amountInPaise = Math.round(amount * 100);
    const bookingCode = generateBookingCode();

    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: PAYMENT_CURRENCY,
        receipt: `${eventId}-${userId}`.slice(0, 40),
        notes: {
          event_id: eventId,
          user_id: userId,
          tickets_count: String(ticketsCount),
          booking_code: bookingCode,
          tier_name: tier.name,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        error: error?.error?.description || error?.message || 'Failed to create Razorpay order',
      });
    }

    const expiresAt = new Date(Date.now() + PAYMENT_TIMEOUT_MINUTES * 60 * 1000);

    await PaymentAttemptModel.create({
      userId,
      eventId,
      tierName: tier.name,
      ticketPrice: tier.price,
      ticketsCount,
      amount,
      bookingCode,
      razorpayOrderId: razorpayOrder.id,
      status: 'created',
      expiresAt,
    });

    return res.json({
      success: true,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      bookingDetails: {
        booking_id: razorpayOrder.id,
        booking_code: bookingCode,
        name: attendeeName,
        email: user?.email || '',
        contact: user?.phone || '',
        event: {
          id: eventId,
          title: event.title,
          ticketsCount,
          totalAmount: amount,
        },
      },
      expiresAt,
    });
  }
);

paymentsRouter.post(
  '/verify',
  requireAuth,
  requireRole(...PAYMENT_ALLOWED_ROLES),
  async (req, res) => {
    const parsed = verifyPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid payment verification payload',
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;
    const userId = req.user!.sub;

    const attempt = await PaymentAttemptModel.findOne({ razorpayOrderId: razorpay_order_id });
    if (!attempt) {
      return res.status(404).json({ error: 'Payment attempt not found' });
    }

    if (attempt.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (attempt.status === 'paid') {
      const existingBooking = await BookingModel.findOne({
        eventId: attempt.eventId,
        attendeeId: userId,
        bookingCode: attempt.bookingCode,
      }).lean();

      return res.json({
        success: true,
        message: 'Payment already verified',
        booking_id: existingBooking ? String(existingBooking._id) : attempt.razorpayOrderId,
        booking_code: attempt.bookingCode,
        payment_id: attempt.razorpayPaymentId || razorpay_payment_id,
      });
    }

    if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ error: 'Payment signature verification failed' });
    }

    let razorpayPayment: any;
    try {
      razorpayPayment = await razorpay.payments.fetch(razorpay_payment_id);
    } catch (error: any) {
      return res.status(500).json({
        error: error?.error?.description || error?.message || 'Failed to fetch payment from Razorpay',
      });
    }

    if (razorpayPayment.order_id !== razorpay_order_id) {
      return res.status(400).json({ error: 'Payment order mismatch' });
    }

    if (razorpayPayment.status !== 'captured' && razorpayPayment.status !== 'authorized') {
      return res.status(400).json({ error: `Payment status is ${razorpayPayment.status}` });
    }

    const event = await EventModel.findById(attempt.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const tier = event.ticketTiers.find((entry) => entry.name === attempt.tierName) || event.ticketTiers[0];
    if (!tier) {
      return res.status(400).json({ error: 'Ticket tier no longer exists' });
    }

    const tierRemaining = tier.quantity - tier.soldCount;
    if (tierRemaining < attempt.ticketsCount || event.remaining < attempt.ticketsCount) {
      attempt.status = 'failed';
      attempt.razorpayPaymentId = razorpay_payment_id;
      attempt.razorpaySignature = razorpay_signature;
      await attempt.save();

      return res.status(409).json({ error: 'Tickets are no longer available for this event' });
    }

    let booking = await BookingModel.findOne({
      eventId: attempt.eventId,
      attendeeId: userId,
      bookingCode: attempt.bookingCode,
    });

    if (!booking) {
      booking = await BookingModel.create({
        eventId: attempt.eventId,
        attendeeId: userId,
        tierName: tier.name,
        ticketPrice: attempt.ticketPrice,
        ticketsCount: attempt.ticketsCount,
        amount: attempt.amount,
        bookingCode: attempt.bookingCode,
        bookingStatus: 'confirmed',
        paymentStatus: 'paid',
      });

      event.remaining -= attempt.ticketsCount;
      tier.soldCount += attempt.ticketsCount;
      await event.save();

      for (let i = 0; i < attempt.ticketsCount; i += 1) {
        const ticket = new TicketModel({
          bookingId: String(booking._id),
          eventId: attempt.eventId,
          attendeeId: userId,
          qrPayload: 'pending',
          checkInStatus: 'pending',
          type: tier.name,
          price: attempt.ticketPrice,
          quantity: 1,
        });

        ticket.qrPayload = JSON.stringify({
          ticketId: String(ticket._id),
          eventId: attempt.eventId,
          bookingId: String(booking._id),
          attendeeId: userId,
          ticketCode: generateTicketCode(),
        });

        await ticket.save();
      }

      await syncAttendeeRecord(attempt.eventId, userId);
    }

    attempt.status = 'paid';
    attempt.razorpayPaymentId = razorpay_payment_id;
    attempt.razorpaySignature = razorpay_signature;
    await attempt.save();

    return res.json({
      success: true,
      message: 'Payment verified successfully',
      booking_id: String(booking._id),
      booking_code: booking.bookingCode,
      payment_id: razorpay_payment_id,
    });
  }
);

paymentsRouter.post(
  '/fail',
  requireAuth,
  requireRole(...PAYMENT_ALLOWED_ROLES),
  async (req, res) => {
    const parsed = failPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid payment failure payload',
      });
    }

    const { razorpay_order_id } = parsed.data;
    const userId = req.user!.sub;

    const attempt = await PaymentAttemptModel.findOne({ razorpayOrderId: razorpay_order_id });
    if (!attempt) {
      return res.status(404).json({ error: 'Payment attempt not found' });
    }

    if (attempt.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (attempt.status === 'paid') {
      return res.status(400).json({ error: 'Payment already completed' });
    }

    attempt.status = 'failed';
    await attempt.save();

    return res.json({
      success: true,
      message: 'Payment attempt marked as failed',
    });
  }
);
