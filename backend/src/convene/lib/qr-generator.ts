import QRCode from 'qrcode';
import crypto from 'crypto';

// HMAC secret - MUST be set in environment variables
if (!process.env.QR_HMAC_SECRET) {
  throw new Error('QR_HMAC_SECRET environment variable is required for security');
}

const HMAC_SECRET: string = process.env.QR_HMAC_SECRET;

/**
 * Generate HMAC signature for QR data
 */
function generateHMAC(data: string): string {
  return crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(data)
    .digest('hex');
}

/**
 * Verify HMAC signature using timing-safe comparison
 */
export function verifyHMAC(data: string, signature: string): boolean {
  try {
    const expectedSignature = generateHMAC(data);
    
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
 * Generate QR code data payload
 */
export interface QRPayload {
  booking_id: string;
  event_id: string;
  user_id: string;
  qr_nonce: string;
  booking_code: string;
  timestamp: number;
  // Optional ticket-specific fields
  ticket_id?: string;
  ticket_code?: string;
  ticket_number?: number;
}

/**
 * Create signed QR payload
 */
export function createQRPayload(data: QRPayload): string {
  const payload = JSON.stringify(data);
  const signature = generateHMAC(payload);
  
  return JSON.stringify({
    data: payload,
    signature: signature,
  });
}

/**
 * Verify and parse QR payload
 */
export function verifyQRPayload(qrData: string): QRPayload | null {
  try {
    const parsed = JSON.parse(qrData);
    const { data, signature } = parsed;
    
    if (!data || !signature) {
      return null;
    }
    
    // Verify signature
    if (!verifyHMAC(data, signature)) {
      return null;
    }
    
    // Parse the payload
    const payload: QRPayload = JSON.parse(data);
    
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Generate QR code as data URL
 */
export async function generateQRCode(payload: QRPayload): Promise<string> {
  try {
    const qrData = createQRPayload(payload);
    
    // Generate QR code as data URL with increased size and error correction
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M', // Changed from H to M for better balance
      type: 'image/png',
      width: 512, // Increased from 400 to 512 for better scanning
      margin: 4, // Increased margin from 2 to 4
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    
    return qrCodeDataURL;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code as buffer
 */
export async function generateQRCodeBuffer(payload: QRPayload): Promise<Buffer> {
  try {
    const qrData = createQRPayload(payload);
    
    // Generate QR code as buffer
    const qrCodeBuffer = await QRCode.toBuffer(qrData, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    
    return qrCodeBuffer;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code SVG string
 */
export async function generateQRCodeSVG(payload: QRPayload): Promise<string> {
  try {
    const qrData = createQRPayload(payload);
    
    // Generate QR code as SVG
    const qrCodeSVG = await QRCode.toString(qrData, {
      errorCorrectionLevel: 'H',
      type: 'svg',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    
    return qrCodeSVG;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
}
