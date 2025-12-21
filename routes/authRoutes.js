const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const {
  register,
  login,
  registerCompany,
  registerEngineer,
  registerClient,
} = require("../controllers/authController");
const {
  validateRegister,
  validateLogin,
  validateCompanyRegister,
  validateEngineerRegister,
  validateClientRegister,
} = require("../middleware/validate");

// Rate limiting for auth routes (stricter than general API)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "تم تجاوز عدد محاولات الدخول المسموح بها، يرجى المحاولة لاحقاً",
  standardHeaders: true,
  legacyHeaders: false,
});

// General register route (optional, for backward compatibility)
router.post("/register", authLimiter, validateRegister, register);

// Role-specific register routes
router.post("/register/company", authLimiter, validateCompanyRegister, registerCompany);
router.post("/register/engineer", authLimiter, validateEngineerRegister, registerEngineer);
router.post("/register/client", authLimiter, validateClientRegister, registerClient);

// Login route
router.post("/login", authLimiter, validateLogin, login);

module.exports = router;
