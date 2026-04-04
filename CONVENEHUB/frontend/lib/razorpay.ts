import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay instance (server-side only)
export const razorpayInstance = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Payment configuration
export const PAYMENT_CONFIG = {
  currency: process.env.PAYMENT_CURRENCY || 'INR',
  timeoutMinutes: parseInt(process.env.PAYMENT_TIMEOUT_MINUTES || '15'),
  commissionPercent: parseFloat(process.env.CONVENEHUB_COMMISSION_PERCENT || '10'),
  gatewayFeePercent: parseFloat(process.env.PAYMENT_GATEWAY_FEE_PERCENT || '2'),
};

/**
 * Verify Razorpay payment signature
 * @param orderId - Razorpay order ID
 * @param paymentId - Razorpay payment ID
 * @param signature - Signature from Razorpay
 * @returns boolean indicating if signature is valid
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  try {
    const text = `${orderId}|${paymentId}`;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest('hex');
    
    // Use timing-safe comparison to prevent timing attacks
    const genBuffer = new Uint8Array(Buffer.from(generated_signature));
    const sigBuffer = new Uint8Array(Buffer.from(signature));
    
    // Ensure both buffers are same length
    if (genBuffer.length !== sigBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(genBuffer, sigBuffer);
  } catch (error) {
    return false;
  }
}

/**
 * Verify Razorpay webhook signature
 * CRITICAL: Must use raw request body (string), not parsed JSON
 * @param rawBody - Raw request body as string
 * @param signature - x-razorpay-signature header value
 * @returns boolean indicating if signature is valid
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  try {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET is not configured');
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');
    
    // Use timing-safe comparison to prevent timing attacks
    const expectedBuffer = new Uint8Array(Buffer.from(expectedSignature));
    const sigBuffer = new Uint8Array(Buffer.from(signature));
    
    // Ensure both buffers are same length
    if (expectedBuffer.length !== sigBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(expectedBuffer, sigBuffer);
  } catch (error) {
    return false;
  }
}

/**
 * Calculate financial breakdown for events
 * @param grossAmount - Total revenue collected
 * @returns Object with financial breakdown
 */
export function calculateFinancials(grossAmount: number) {
  const gatewayFees = (grossAmount * PAYMENT_CONFIG.gatewayFeePercent) / 100;
  const platformCommission = (grossAmount * PAYMENT_CONFIG.commissionPercent) / 100;
  const netPayout = grossAmount - gatewayFees - platformCommission;
  
  return {
    grossRevenue: parseFloat(grossAmount.toFixed(2)),
    gatewayFees: parseFloat(gatewayFees.toFixed(2)),
    platformCommission: parseFloat(platformCommission.toFixed(2)),
    netPayout: parseFloat(netPayout.toFixed(2)),
  };
}
