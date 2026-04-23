import { Schema, model } from 'mongoose';

interface AttendeeDocument {
  eventId: string;
  attendeeId: string;
  userId?: string;
  qrCode: string;
  checkInStatus: 'pending' | 'checked_in';
}

const attendeeSchema = new Schema<AttendeeDocument>(
  {
    eventId: { type: String, required: true },
    attendeeId: { type: String, required: true, alias: 'userId' },
    qrCode: { type: String, required: true },
    checkInStatus: { type: String, enum: ['pending', 'checked_in'], default: 'pending' },
  },
  { timestamps: true }
);

attendeeSchema.index({ eventId: 1, attendeeId: 1 }, { unique: true });

export const AttendeeModel = model<AttendeeDocument>('Attendee', attendeeSchema);
