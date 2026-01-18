const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const { 
  register, 
  registerCompany, 
  registerEngineer, 
  registerClient,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword
} = require("../controllers/authController");

const { changePassword } = require("../controllers/userController");

const { 
  validateRegister, 
  validateRegisterCompany,
  validateRegisterEngineer,
  validateRegisterClient,
  validateLogin,
  validatePasswordChange,
  validateForgotPassword,
  validateResetPassword
} = require("../middleware/validate");

const { protect } = require("../middleware/auth");

// Rate limiting for auth routes
// TODO: Temporary - reduced to 30 seconds for testing. Change back to 15 minutes in production
const authLimiter = rateLimit({
  windowMs: 5 * 1000, // 30 seconds (temporary for testing)
  max: 10,
  message: "تم تجاوز عدد محاولات الدخول المسموح بها، يرجى المحاولة بعد 30 ثانية",
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration routes
router.post("/register", authLimiter, validateRegister, register);
router.post("/register/company", authLimiter, validateRegisterCompany, registerCompany);
router.post("/register/engineer", authLimiter, validateRegisterEngineer, registerEngineer);
router.post("/register/client", authLimiter, validateRegisterClient, registerClient);

// Login
router.post("/login", authLimiter, validateLogin, login);

// Refresh Token - Get new access token using refresh token from cookie
router.post("/refresh", refreshToken);

// Logout - Clear refresh token cookie
router.post("/logout", logout);

// Change password
router.put("/change-password", protect, authLimiter, validatePasswordChange, changePassword);

// Forgot password (public - no auth required)
router.post("/forgot-password", authLimiter, validateForgotPassword, forgotPassword);

// Reset password (public - no auth required, but needs valid token)
router.post("/reset-password", authLimiter, validateResetPassword, resetPassword);

module.exports = router;
