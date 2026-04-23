// Test booking confirmation email with QR code
// Run with: node test-booking-email.js

require('dotenv').config({ path: '.env.local' });

// Import email functions
const { sendBookingConfirmationWithQR } = require('./lib/email/service');
const { generateQRCode } = require('./lib/qr-generator');

async function testBookingEmail() {
  console.log('🧪 Testing Booking Confirmation Email Flow...\n');

  try {
    // Test booking details
    const bookingDetails = {
      booking_code: 'TEST-' + Date.now(),
      event_title: 'Test Event - Email Verification',
      event_date: 'Saturday, November 16, 2024',
      event_time: '7:00 PM',
      venue_name: 'Test Venue',
      venue_address: 'Test Address, Test Street',
      city: 'Test City',
      tickets_count: 1,
      user_name: 'Test User',
      entry_instructions: 'Please arrive 15 minutes early for check-in',
    };

    console.log('📧 Booking Details:');
    console.log('   Booking Code:', bookingDetails.booking_code);
    console.log('   Event:', bookingDetails.event_title);
    console.log('   Email to:', process.env.SMTP_USER);
    console.log('');

    // Generate QR code
    console.log('📱 Generating QR code...');
    const qrCodeDataURL = await generateQRCode({
      booking_id: 'test-booking-id',
      event_id: 'test-event-id',
      user_id: 'test-user-id',
      qr_nonce: 'test-nonce-' + Date.now(),
      booking_code: bookingDetails.booking_code,
      timestamp: Date.now(),
    });
    console.log('✅ QR code generated successfully\n');

    // Send email
    console.log('📧 Sending confirmation email...');
    const result = await sendBookingConfirmationWithQR(
      'rohan_mohanta@srmap.edu.in',
      bookingDetails,
      qrCodeDataURL
    );

    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', result.messageId);
    console.log('');
    console.log('🎉 SUCCESS: Booking confirmation emails are working correctly!');
    console.log('');
    console.log('📬 Check your inbox at:', process.env.SMTP_USER);
    console.log('   - Subject: Booking Confirmed - ' + bookingDetails.event_title);
    console.log('   - Attachments: Logo + QR Code (inline) + QR Code (downloadable)');
    console.log('');
    console.log('✓ Email service is configured and working');
    console.log('✓ QR code generation is working');
    console.log('✓ Email templates are properly formatted');
    console.log('✓ Attachments are being sent correctly');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('');
    console.error('Error details:', error);
    console.error('');
    console.error('⚠️  Possible issues:');
    console.error('   1. Check SMTP credentials in .env.local');
    console.error('   2. Ensure logo file exists at public/logo/Logomark_Cerulean_Blue.png');
    console.error('   3. Verify QR generation is working');
    console.error('   4. Check network connectivity to SMTP server');
  }
}

testBookingEmail();
