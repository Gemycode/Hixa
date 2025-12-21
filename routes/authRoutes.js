const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const {
  register,
  login,
  registerCompany,
  registerEngineer,
  registerClient,
  changePassword,
} = require("../controllers/authController");
const {
  validateRegister,
  validateLogin,
  validateCompanyRegister,
  validateEngineerRegister,
  validateClientRegister,
  validatePasswordChange,
} = require("../middleware/validate");
const { protect } = require("../middleware/auth");

// General API rate limiting (less restrictive)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window (much more generous for normal usage)
  message: "تم تجاوز عدد الطلبات المسموح بها، يرجى المحاولة لاحقاً",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting to all auth routes
router.use(apiLimiter);

// Register routes (no additional rate limiting needed)
router.post("/register", validateRegister, register);
router.post("/register/company", validateCompanyRegister, registerCompany);
router.post("/register/engineer", validateEngineerRegister, registerEngineer);
router.post("/register/client", validateClientRegister, registerClient);

// Login route (uses specialized rate limiting in controller)
router.post("/login", validateLogin, login);

// Change password route (protected)
router.put("/change-password", protect, validatePasswordChange, changePassword);

module.exports = router;