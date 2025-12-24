const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const { register, login } = require("../controllers/authController");
const { validateRegister, validateLogin } = require("../middleware/validate");

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "تم تجاوز عدد محاولات الدخول المسموح بها، يرجى المحاولة لاحقاً",
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", authLimiter, validateRegister, register);
router.post("/login", authLimiter, validateLogin, login);

module.exports = router;
