import nodemailer from 'nodemailer';

// Email configuration
export const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
};

// Validate email configuration
export function validateEmailConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!process.env.SMTP_USER) {
    errors.push('SMTP_USER environment variable is not set');
  }
  if (!process.env.SMTP_PASSWORD) {
    errors.push('SMTP_PASSWORD environment variable is not set');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Create reusable transporter
export const createTransporter = () => {
  const validation = validateEmailConfig();
  
  if (!validation.valid) {
    console.error('Email configuration error:', validation.errors);
    throw new Error(`Email not configured: ${validation.errors.join(', ')}`);
  }
  
  return nodemailer.createTransport(emailConfig);
};

// Sender email configuration
export const senderEmail = {
  from: process.env.SMTP_FROM_EMAIL || 'CONVENEHUB <noreply@convenehub.com>',
  replyTo: process.env.SMTP_REPLY_TO || 'support@convenehub.com',
};
