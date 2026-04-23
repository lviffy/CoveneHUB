import { Router } from 'express';
import QRCode from 'qrcode';
import { requireAuth } from '../middlewares/auth.middleware';
import { TicketModel } from '../models/Ticket';
import { BookingModel } from '../models/Booking';

export const ticketsRouter = Router();

ticketsRouter.get('/:id/qr', requireAuth, async (req, res) => {
  const ticket = await TicketModel.findById(req.params.id).lean();
  if (!ticket) {
    return res.status(404).json({ success: false, message: 'Ticket not found' });
  }

  const booking = await BookingModel.findById(ticket.bookingId).lean();
  if (!booking) {
    return res.status(404).json({ success: false, message: 'Booking not found' });
  }

  if (req.user?.role !== 'admin' && booking.attendeeId !== req.user?.sub) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const qrDataUrl = await QRCode.toDataURL(ticket.qrPayload, { width: 512, margin: 1 });
  return res.json({ success: true, ticketId: String(ticket._id), qrCode: qrDataUrl, qr_code: qrDataUrl });
});
