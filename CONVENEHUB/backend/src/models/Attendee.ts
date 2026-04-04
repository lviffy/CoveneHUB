import { Schema, model } from 'mongoose';

interface AttendeeDocument {
  eventId: string;
  userId: string;
  qrCode: string;
  checkInStatus: 'pending' | 'checked_in';
}

const attendeeSchema = new Schema<AttendeeDocument>(
  {
    eventId: { type: String, required: true },
    userId: { type: String, required: true },
    qrCode: { type: String, required: true },
    checkInStatus: { type: String, enum: ['pending', 'checked_in'], default: 'pending' },
  },
  { timestamps: true }
);

export const AttendeeModel = model<AttendeeDocument>('Attendee', attendeeSchema);
