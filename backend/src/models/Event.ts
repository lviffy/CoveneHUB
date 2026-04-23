import { Schema, model } from 'mongoose';

export interface TicketTier {
  name: string;
  price: number;
  quantity: number;
  soldCount: number;
}

interface EventDocument {
  tenantId: string;
  campusId?: string;
  organizerId: string;
  title: string;
  description?: string;
  venue: string;
  city?: string;
  dateTime: Date;
  date?: Date;
  capacity: number;
  remaining: number;
  status: 'draft' | 'published' | 'checkin_open' | 'in_progress' | 'ended';
  eventImage?: string;
  entryInstructions?: string;
  terms?: string;
  ticketTiers: TicketTier[];
  createdAt?: Date;
  updatedAt?: Date;
}

const ticketTierSchema = new Schema<TicketTier>(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    soldCount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const eventSchema = new Schema<EventDocument>(
  {
    tenantId: { type: String, required: true },
    campusId: { type: String },
    organizerId: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    venue: { type: String, required: true },
    city: { type: String },
    // Alias keeps "date" available for the documented schema while preserving existing APIs.
    dateTime: { type: Date, required: true, alias: 'date' },
    capacity: { type: Number, required: true, min: 1 },
    remaining: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['draft', 'published', 'checkin_open', 'in_progress', 'ended'], default: 'draft' },
    eventImage: { type: String },
    entryInstructions: { type: String },
    terms: { type: String },
    ticketTiers: { type: [ticketTierSchema], default: [] },
  },
  { timestamps: true }
);

export const EventModel = model<EventDocument>('Event', eventSchema);
