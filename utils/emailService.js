const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  // Use environment variables for email configuration
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS,
    },
  };

  // If using Gmail, you might need an App Password instead of regular password
  // Generate App Password: https://myaccount.google.com/apppasswords

  return nodemailer.createTransport(config);
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, resetUrl) => {
  try {
    const transporter = createTransporter();

    const resetLink = `${resetUrl}?token=${resetToken}`;
    
    const mailOptions = {
      from: `"Hixa" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'إعادة تعيين كلمة المرور - Password Reset',
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>إعادة تعيين كلمة المرور</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f5a623 0%, #f5a623 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: #fff; margin: 0;">Hixa</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">إعادة تعيين كلمة المرور / Password Reset</h2>
            
            <p style="color: #666;">
              مرحباً،<br>
              لقد طلبت إعادة تعيين كلمة المرور لحسابك.
            </p>
            
            <p style="color: #666;">
              Hello,<br>
              You have requested to reset your password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background: #f5a623; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                إعادة تعيين كلمة المرور / Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              أو انسخ الرابط التالي في المتصفح:<br>
              Or copy this link to your browser:
            </p>
            <p style="color: #999; font-size: 12px; word-break: break-all;">
              ${resetLink}
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              <strong>ملاحظة:</strong> هذا الرابط صالح لمدة ساعة واحدة فقط.<br>
              <strong>Note:</strong> This link is valid for 1 hour only.
            </p>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
              إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد.<br>
              If you didn't request a password reset, you can ignore this email.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        إعادة تعيين كلمة المرور - Password Reset
        
        مرحباً،
        لقد طلبت إعادة تعيين كلمة المرور لحسابك.
        
        Hello,
        You have requested to reset your password.
        
        اضغط على الرابط التالي لإعادة تعيين كلمة المرور:
        Click the following link to reset your password:
        
        ${resetLink}
        
        ملاحظة: هذا الرابط صالح لمدة ساعة واحدة فقط.
        Note: This link is valid for 1 hour only.
        
        إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد.
        If you didn't request a password reset, you can ignore this email.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// Send welcome email (optional - for future use)
const sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Hixa" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'مرحباً بك في Hixa - Welcome to Hixa',
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>مرحباً بك</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f5a623 0%, #f5a623 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: #fff; margin: 0;">Hixa</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">مرحباً ${name || 'عزيزي المستخدم'}!</h2>
            
            <p style="color: #666;">
              شكراً لك على التسجيل في Hixa. نحن سعداء بانضمامك إلينا!
            </p>
            
            <p style="color: #666;">
              Thank you for registering with Hixa. We're excited to have you on board!
            </p>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    // Don't throw error for welcome email - it's not critical
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  createTransporter,
};
