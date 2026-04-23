import { Schema, model } from 'mongoose';

interface OrderDocument {
  userId: string;
  eventId: string;
  ticketId: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
}

const orderSchema = new Schema<OrderDocument>(
  {
    userId: { type: String, required: true },
    eventId: { type: String, required: true },
    ticketId: { type: String, required: true },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export const OrderModel = model<OrderDocument>('Order', orderSchema);
