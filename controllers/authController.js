const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/userModel");
const { sendPasswordResetEmail } = require("../utils/emailService");

// Generate Access Token (short-lived, 15 minutes)
const generateAccessToken = (userId, role) => {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
  return jwt.sign(
    { sub: userId, role, type: 'access' },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m", issuer: "hixa-api" }
  );
};

// Generate Refresh Token (long-lived, 7 days)
const generateRefreshToken = (userId) => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    secret,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d", issuer: "hixa-api" }
  );
};

// Backward compatibility - use access token
const generateToken = (userId, role) => {
  return generateAccessToken(userId, role);
};

// Helper function to set refresh token cookie with consistent options
const setRefreshTokenCookie = (res, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // With Vite proxy, requests appear as same-origin, so sameSite: 'lax' works in development
  // In production, use strict sameSite with secure
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction, // Only send over HTTPS in production
    sameSite: isProduction ? "strict" : "lax", // lax for same-origin (via proxy) in dev, strict for same-origin in prod
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  };
  
  res.cookie("refreshToken", refreshToken, cookieOptions);
  console.log("🍪 Refresh token cookie set with options:", { ...cookieOptions, refreshToken: '[HIDDEN]' });
};

// General register (backward compatibility)
const register = async (req, res) => {
  try {
    const { email, password, name, role, phone, countryCode } = req.body;

    if (await User.findOne({ email })) {
      return res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }

    const user = await User.create({
      email,
      password,
      name: name || email.split("@")[0],
      role: role && role !== "admin" ? role : "customer",
      phone: phone || "",
      countryCode: countryCode || ""
    });

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);
    user.lastLogin = new Date();
    await user.save();

    // Set refresh token in HttpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({ message: "تم التسجيل بنجاح", token: accessToken, accessToken, user });
  } catch (e) {
    res.status(500).json({ message: "خطأ في الخادم", error: e.message });
  }
};

// Register Company
const registerCompany = async (req, res) => {
  try {
    const { companyName, contactPersonName, email, password, phone, countryCode } = req.body;

    if (await User.findOne({ email })) {
      return res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }

    const user = await User.create({
      email,
      password,
      name: companyName, // استخدام companyName كاسم الشركة
      role: "company", // الشركات لها role منفصل
      phone: phone || "",
      countryCode: countryCode || "",
    });

    // يمكن حفظ contactPersonName في bio أو حقل آخر
    if (contactPersonName) {
      user.bio = `Contact Person: ${contactPersonName}`;
      await user.save();
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);
    user.lastLogin = new Date();
    await user.save();

    // Set refresh token in HttpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({ 
      message: "تم تسجيل الشركة بنجاح", 
      token: accessToken,
      accessToken,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }
    res.status(500).json({ message: "خطأ في الخادم", error: e.message });
  }
};

// Register Engineer
const registerEngineer = async (req, res) => {
  try {
    const { fullName, specialization, licenseNumber, email, password, phone, countryCode } = req.body;

    if (await User.findOne({ email })) {
      return res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }

    // التحقق من أن licenseNumber فريد
    if (licenseNumber && await User.findOne({ nationalId: licenseNumber })) {
      return res.status(409).json({ message: "رقم الترخيص مستخدم بالفعل" });
    }

    const user = await User.create({
      email,
      password,
      name: fullName,
      role: "engineer",
      phone: phone || "",
      countryCode: countryCode || "",
      nationalId: licenseNumber || undefined, // استخدام nationalId لحفظ licenseNumber
      specializations: specialization ? [specialization] : [], // حفظ specialization
    });

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);
    user.lastLogin = new Date();
    await user.save();

    // Set refresh token in HttpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({ 
      message: "تم تسجيل المهندس بنجاح", 
      token: accessToken,
      accessToken,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        specializations: user.specializations,
        nationalId: user.nationalId,
      }
    });
  } catch (e) {
    if (e.code === 11000) {
      const field = e.keyPattern?.email ? "البريد الإلكتروني" : "رقم الترخيص";
      return res.status(409).json({ message: `${field} مستخدم بالفعل` });
    }
    res.status(500).json({ message: "خطأ في الخادم", error: e.message });
  }
};

// Register Client
const registerClient = async (req, res) => {
  try {
    const { fullName, email, password, phone, countryCode } = req.body;

    if (await User.findOne({ email })) {
      return res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }

    const user = await User.create({
      email,
      password,
      name: fullName,
      role: "client",
      phone: phone || "",
      countryCode: countryCode || "",
    });

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);
    user.lastLogin = new Date();
    await user.save();

    // Set refresh token in HttpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({ 
      message: "تم تسجيل العميل بنجاح", 
      token: accessToken,
      accessToken,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }
    res.status(500).json({ message: "خطأ في الخادم", error: e.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    if (!user.isActive) return res.status(403).json({ message: "الحساب غير مفعّل" });

    // Generate Access Token (short-lived)
    const accessToken = generateAccessToken(user._id, user.role);
    
    // Generate Refresh Token (long-lived)
    const refreshToken = generateRefreshToken(user._id);
    
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Set refresh token in HttpOnly cookie
    setRefreshTokenCookie(res, refreshToken);

    // Send access token in response body
    res.json({ 
      message: "تم تسجيل الدخول بنجاح", 
      token: accessToken, // Access token for Authorization header
      accessToken: accessToken, // Also send as accessToken for clarity
      user 
    });
  } catch (e) {
    res.status(500).json({ message: "خطأ في الخادم", error: e.message });
  }
};

// Forgot Password - Send reset email
const forgotPassword = async (req, res) => {
  try {
    console.log('🔐 Forgot password request received:', {
      email: req.body.email,
      hasEmail: !!req.body.email,
    });

    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ 
        message: "البريد الإلكتروني مطلوب" 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    // Don't reveal if email exists or not (security best practice)
    if (!user) {
      console.log('⚠️ User not found for email:', email);
      // Still return success to prevent email enumeration
      return res.json({ 
        message: "إذا كان البريد الإلكتروني مسجلاً، سيتم إرسال رابط إعادة التعيين" 
      });
    }

    console.log('✅ User found, generating reset token for:', user.email);

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set token and expiration (1 hour)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    console.log('✅ Reset token saved to user');

    // Create reset URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password`;
    
    console.log('📧 Preparing to send email:', {
      to: user.email,
      resetUrl: resetUrl,
      frontendUrl: frontendUrl,
    });
    
    try {
      await sendPasswordResetEmail(user.email, resetToken, resetUrl);
      console.log('✅ Password reset email sent successfully');
      res.json({ 
        message: "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني" 
      });
    } catch (emailError) {
      // If email fails, clear the token
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      
      console.error('❌ Email error in forgotPassword:', {
        message: emailError.message,
        stack: emailError.stack,
      });
      
      // Return more specific error message
      const errorMessage = emailError.message || "حدث خطأ أثناء إرسال البريد الإلكتروني. يرجى المحاولة لاحقاً";
      return res.status(500).json({ 
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { 
          error: emailError.message,
          details: emailError.code 
        })
      });
    }
  } catch (error) {
    console.error('❌ Forgot password error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({ 
      message: "خطأ في الخادم", 
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

// Reset Password - Update password with token
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ 
        message: "الرمز وكلمة المرور مطلوبان" 
      });
    }

    // Hash the token to compare with stored token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token and not expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: "الرمز غير صحيح أو منتهي الصلاحية" 
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ 
        message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" 
      });
    }

    // Set new password (will be hashed by pre-save hook)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ 
      message: "تم إعادة تعيين كلمة المرور بنجاح" 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Refresh Access Token - Generate new access token using refresh token from cookie
const refreshToken = async (req, res) => {
  try {
    console.log("🔄 Refresh token request received");
    console.log("🔄 Cookies:", req.cookies);
    const refreshTokenCookie = req.cookies?.refreshToken;

    if (!refreshTokenCookie) {
      console.log("❌ No refresh token cookie found");
      return res.status(401).json({ message: "Refresh token غير موجود" });
    }

    try {
      const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
      const decoded = jwt.verify(refreshTokenCookie, secret);

      // Verify token is a refresh token
      if (decoded.type !== 'refresh') {
        return res.status(403).json({ message: "نوع التوكن غير صحيح" });
      }

      // Get user to get role
      const user = await User.findById(decoded.sub);
      if (!user) {
        return res.status(401).json({ message: "المستخدم غير موجود" });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: "الحساب غير مفعّل" });
      }

      // Generate new access token
      const newAccessToken = generateAccessToken(user._id, user.role);

      console.log("✅ Refresh token valid - generating new access token for user:", user.email);
      res.json({ 
        accessToken: newAccessToken,
        token: newAccessToken, // For backward compatibility
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      });
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({ message: "انتهت صلاحية Refresh Token" });
      }
      return res.status(403).json({ message: "Refresh token غير صحيح" });
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Logout - Clear refresh token cookie
const logout = async (req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      path: "/",
    });
    
    res.json({ message: "تم تسجيل الخروج بنجاح" });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

module.exports = { 
  register, 
  registerCompany,
  registerEngineer,
  registerClient,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword
};
