const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const { register, login } = require("../controllers/authController");
const { validateRegister, validateLogin } = require("../middleware/validate");

// Rate limiting for auth routes (stricter than general API)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "تم تجاوز عدد محاولات الدخول المسموح بها، يرجى المحاولة لاحقاً",
  standardHeaders: true,
  legacyHeaders: false,
});

// Register route
router.post("/register", authLimiter, validateRegister, register);

// Login route
router.post("/login", authLimiter, validateLogin, login);

module.exports = router;