// Quick email test script
// Run with: node test-email.js

const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

async function testEmail() {
  console.log('Testing email configuration...');
  console.log('SMTP Host:', process.env.SMTP_HOST);
  console.log('SMTP User:', process.env.SMTP_USER);
  console.log('Password set:', process.env.SMTP_PASSWORD ? 'Yes' : 'No');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  try {
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection verified!');

    // Send test email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to: process.env.SMTP_USER, // Send to yourself
      subject: 'ConveneHub Email Test',
      text: 'If you receive this, email configuration is working!',
      html: '<h1>✅ Email Working!</h1><p>ConveneHub booking emails will work correctly.</p>',
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('\nCheck your inbox at:', process.env.SMTP_USER);
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    if (error.code === 'EAUTH') {
      console.error('\n⚠️  Authentication failed. Please check:');
      console.error('   1. SMTP_PASSWORD is set correctly');
      console.error('   2. You generated an App Password (not your regular Gmail password)');
      console.error('   3. 2-Step Verification is enabled on your Google account');
    }
  }
}

testEmail();
