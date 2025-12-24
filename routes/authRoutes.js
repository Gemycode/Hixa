const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const { 
  register, 
  registerCompany, 
  registerEngineer, 
  registerClient,
  login 
} = require("../controllers/authController");

const { changePassword } = require("../controllers/userController");

const { 
  validateRegister, 
  validateRegisterCompany,
  validateRegisterEngineer,
  validateRegisterClient,
  validateLogin,
  validatePasswordChange
} = require("../middleware/validate");

const { protect } = require("../middleware/auth");

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "تم تجاوز عدد محاولات الدخول المسموح بها، يرجى المحاولة لاحقاً",
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

// Change password
router.put("/change-password", protect, authLimiter, validatePasswordChange, changePassword);

module.exports = router;
