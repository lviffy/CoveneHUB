#!/usr/bin/env node
/**
 * Email Delivery Verification Script
 * 
 * This script helps verify if booking confirmation emails are being sent.
 * Run this in a separate terminal while testing bookings.
 */

const fs = require('fs');
const path = require('path');

console.log('📧 Email Delivery Monitor - ConveneHub');
console.log('=====================================\n');

console.log('✅ Email System Status Check:\n');

// Check environment configuration
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const requiredVars = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'SMTP_FROM_EMAIL'
];

console.log('🔧 Configuration Check:');
requiredVars.forEach(varName => {
  if (envContent.includes(varName)) {
    console.log(`   ✅ ${varName} is set`);
  } else {
    console.log(`   ❌ ${varName} is MISSING`);
  }
});

console.log('\n📝 How to Test Email Delivery:\n');
console.log('1. Make sure the development server is running:');
console.log('   cd frontend && npm run dev\n');
console.log('2. Open the app in browser (http://localhost:3000)\n');
console.log('3. Book an event as a test user\n');
console.log('4. Check the server console for these messages:');
console.log('   - "Email sent successfully: { messageId: ... }"');
console.log('   - OR "Failed to send confirmation email: ..."');
console.log('   - OR "Error preparing confirmation email: ..."\n');
console.log('5. Check your email inbox (including spam folder)\n');
console.log('6. If email not received, check server logs for errors\n');

console.log('🔍 Common Issues and Solutions:\n');
console.log('Issue: Email not in inbox');
console.log('   → Check spam/junk folder');
console.log('   → Verify recipient email is correct');
console.log('   → Check server console for errors\n');

console.log('Issue: "Authentication failed" error');
console.log('   → Verify SMTP_PASSWORD is correct');
console.log('   → For Gmail, use App Password (not regular password)');
console.log('   → Ensure 2-Step Verification is enabled\n');

console.log('Issue: Email takes long time');
console.log('   → Normal for async sending (non-blocking)');
console.log('   → Email sent after response returned to user');
console.log('   → Check server logs after booking\n');

console.log('📊 Quick Test Command:\n');
console.log('   node test-email.js\n');
console.log('   This sends a test email to verify SMTP configuration.\n');

console.log('📈 Monitoring Tips:\n');
console.log('• Watch server console during booking tests');
console.log('• Look for "Email sent successfully" messages');
console.log('• Check timestamp correlation with bookings');
console.log('• Test with multiple email providers (Gmail, Outlook, etc.)\n');

console.log('✨ Current SMTP Configuration:');
const smtpHost = envContent.match(/SMTP_HOST=(.+)/)?.[1] || 'Not configured';
const smtpPort = envContent.match(/SMTP_PORT=(.+)/)?.[1] || 'Not configured';
const smtpUser = envContent.match(/SMTP_USER=(.+)/)?.[1] || 'Not configured';
console.log(`   Host: ${smtpHost}`);
console.log(`   Port: ${smtpPort}`);
console.log(`   User: ${smtpUser}`);
console.log('');

console.log('✅ Verification script completed!\n');
console.log('To test email now, run: node test-email.js');
