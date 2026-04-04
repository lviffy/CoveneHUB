import { Schema, model } from 'mongoose';

interface BookingDocument {
  eventId: string;
  attendeeId: string;
  userId?: string;
  ticketId?: string;
  tierName: string;
  ticketPrice: number;
  ticketsCount: number;
  amount: number;
  bookingCode: string;
  bookingStatus: 'confirmed' | 'cancelled';
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  referralCode?: string;
  promoterId?: string;
}

const bookingSchema = new Schema<BookingDocument>(
  {
    eventId: { type: String, required: true },
    // attendeeId stays as canonical field used by existing routes.
    attendeeId: { type: String, required: true, alias: 'userId' },
    ticketId: { type: String },
    tierName: { type: String, required: true },
    ticketPrice: { type: Number, required: true, min: 0 },
    ticketsCount: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    bookingCode: { type: String, required: true, unique: true },
    bookingStatus: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'paid' },
    referralCode: { type: String },
    promoterId: { type: String },
  },
  { timestamps: true }
);

export const BookingModel = model<BookingDocument>('Booking', bookingSchema);
