import { Schema, model } from 'mongoose';

interface PromoterDocument {
  userId: string;
  eventId: string;
  referralCode: string;
  commission: number;
}

const promoterSchema = new Schema<PromoterDocument>(
  {
    userId: { type: String, required: true },
    eventId: { type: String, required: true },
    referralCode: { type: String, required: true, unique: true },
    commission: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

export const PromoterModel = model<PromoterDocument>('Promoter', promoterSchema);
