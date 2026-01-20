/**
 * Test Email Configuration Script
 * Run this to verify your email setup before testing password reset
 * 
 * Usage: node scripts/test-email.js
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🧪 Testing Email Configuration...\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('  SMTP_HOST:', process.env.SMTP_HOST || '❌ NOT SET');
console.log('  SMTP_PORT:', process.env.SMTP_PORT || '❌ NOT SET');
console.log('  SMTP_SECURE:', process.env.SMTP_SECURE || '❌ NOT SET');
console.log('  SMTP_USER:', process.env.SMTP_USER || process.env.EMAIL_USER || '❌ NOT SET');
console.log('  SMTP_PASS:', process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS ? '✅ SET (hidden)' : '❌ NOT SET');
console.log('  FRONTEND_URL:', process.env.FRONTEND_URL || '❌ NOT SET (will use default)');
console.log('');

// Validate required variables
const requiredVars = {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_USER: process.env.SMTP_USER || process.env.EMAIL_USER,
  SMTP_PASS: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS,
};

const missingVars = Object.entries(requiredVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(v => console.error(`   - ${v}`));
  console.error('\n💡 Please add these to your .env file in Hixa-back/');
  process.exit(1);
}

// Create transporter
const config = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS,
  },
};

console.log('📧 Creating transporter with config:');
console.log('  Host:', config.host);
console.log('  Port:', config.port);
console.log('  Secure:', config.secure);
console.log('  User:', config.auth.user);
console.log('');

const transporter = nodemailer.createTransport(config);

// Test connection
console.log('🔌 Testing SMTP connection...');
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\n🔍 Common issues:');
    console.error('  1. Check SMTP_HOST and SMTP_PORT');
    console.error('  2. For Gmail, use App Password (not regular password)');
    console.error('  3. Enable 2-Step Verification in Google Account');
    console.error('  4. Check firewall/network settings');
    console.error('\n💡 Error details:');
    console.error('  Code:', error.code);
    console.error('  Command:', error.command);
    if (error.response) {
      console.error('  Response:', error.response);
    }
    process.exit(1);
  } else {
    console.log('✅ Connection successful!');
    console.log('\n📤 Testing email send...');
    
    // Try to send a test email
    const testEmail = process.env.SMTP_USER || process.env.EMAIL_USER;
    const mailOptions = {
      from: `"Hixa Test" <${testEmail}>`,
      to: testEmail, // Send to yourself
      subject: 'Test Email from Hixa',
      text: 'This is a test email to verify your email configuration.',
      html: '<p>This is a test email to verify your email configuration.</p>',
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ Failed to send test email:', error.message);
        console.error('\n🔍 Common issues:');
        console.error('  1. Authentication failed - check SMTP_USER and SMTP_PASS');
        console.error('  2. For Gmail, use App Password');
        console.error('  3. Check if "Less secure app access" is enabled (not recommended)');
        console.error('  4. Check firewall/network settings');
        process.exit(1);
      } else {
        console.log('✅ Test email sent successfully!');
        console.log('  Message ID:', info.messageId);
        console.log('  Response:', info.response);
        console.log('\n🎉 Email configuration is working correctly!');
        console.log('   You can now test the password reset feature.');
        process.exit(0);
      }
    });
  }
});
