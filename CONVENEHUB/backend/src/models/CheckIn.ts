import { Schema, model } from 'mongoose';

interface CheckInDocument {
  ticketId: string;
  eventId: string;
  bookingId: string;
  attendeeId: string;
  userId?: string;
  qrCode?: string;
  checkInStatus?: 'pending' | 'checked_in';
  scannedBy: string;
  method: 'qr' | 'manual';
}

const checkInSchema = new Schema<CheckInDocument>(
  {
    ticketId: { type: String, required: true },
    eventId: { type: String, required: true },
    bookingId: { type: String, required: true },
    attendeeId: { type: String, required: true, alias: 'userId' },
    qrCode: { type: String },
    checkInStatus: { type: String, enum: ['pending', 'checked_in'], default: 'checked_in' },
    scannedBy: { type: String, required: true },
    method: { type: String, enum: ['qr', 'manual'], required: true },
  },
  { timestamps: true }
);

export const CheckInModel = model<CheckInDocument>('CheckIn', checkInSchema);
