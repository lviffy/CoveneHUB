import { Schema, model } from 'mongoose';

interface PaymentAttemptDocument {
  userId: string;
  eventId: string;
  tierName: string;
  ticketPrice: number;
  ticketsCount: number;
  amount: number;
  bookingCode: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  status: 'created' | 'paid' | 'failed' | 'cancelled' | 'expired';
  expiresAt: Date;
}

const paymentAttemptSchema = new Schema<PaymentAttemptDocument>(
  {
    userId: { type: String, required: true, index: true },
    eventId: { type: String, required: true, index: true },
    tierName: { type: String, required: true },
    ticketPrice: { type: Number, required: true, min: 0 },
    ticketsCount: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    bookingCode: { type: String, required: true },
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    status: {
      type: String,
      enum: ['created', 'paid', 'failed', 'cancelled', 'expired'],
      default: 'created',
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

export const PaymentAttemptModel = model<PaymentAttemptDocument>(
  'PaymentAttempt',
  paymentAttemptSchema
);
