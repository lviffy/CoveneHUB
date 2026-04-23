import { Schema, model } from 'mongoose';

interface ReferralLinkDocument {
  promoterId: string;
  userId?: string;
  eventId: string;
  code: string;
  referralCode?: string;
  commission?: number;
  clicks: number;
  conversions: number;
}

const referralLinkSchema = new Schema<ReferralLinkDocument>(
  {
    promoterId: { type: String, required: true, alias: 'userId' },
    eventId: { type: String, required: true },
    code: { type: String, required: true, unique: true, alias: 'referralCode' },
    commission: { type: Number, min: 0, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
  },
  { timestamps: true }
);

referralLinkSchema.index({ promoterId: 1, eventId: 1 }, { unique: true });

export const ReferralLinkModel = model<ReferralLinkDocument>('ReferralLink', referralLinkSchema);
