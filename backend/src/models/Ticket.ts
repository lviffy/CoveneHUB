import { Schema, model } from 'mongoose';

interface TicketDocument {
  bookingId: string;
  eventId: string;
  attendeeId: string;
  type?: string;
  price?: number;
  quantity?: number;
  qrPayload: string;
  checkInStatus: 'pending' | 'checked_in';
  checkedInAt?: Date;
  checkedInBy?: string;
}

const ticketSchema = new Schema<TicketDocument>(
  {
    bookingId: { type: String, required: true },
    eventId: { type: String, required: true },
    attendeeId: { type: String, required: true },
    // Optional fields map to the documented Ticket collection shape.
    type: { type: String },
    price: { type: Number, min: 0 },
    quantity: { type: Number, min: 1 },
    qrPayload: { type: String, required: true },
    checkInStatus: { type: String, enum: ['pending', 'checked_in'], default: 'pending' },
    checkedInAt: { type: Date },
    checkedInBy: { type: String },
  },
  { timestamps: true }
);

export const TicketModel = model<TicketDocument>('Ticket', ticketSchema);
