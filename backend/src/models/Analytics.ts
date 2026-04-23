import { Schema, model } from 'mongoose';

interface AnalyticsDocument {
  eventId: string;
  revenue: number;
  attendance: number;
  promoterPerformance: Record<string, number>;
}

const analyticsSchema = new Schema<AnalyticsDocument>(
  {
    eventId: { type: String, required: true, unique: true },
    revenue: { type: Number, min: 0, default: 0 },
    attendance: { type: Number, min: 0, default: 0 },
    promoterPerformance: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

export const AnalyticsModel = model<AnalyticsDocument>('Analytics', analyticsSchema);
