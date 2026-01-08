const express = require("express");
const router = express.Router();

const { getProfile } = require("../controllers/userController");
const { protect, restrictTo } = require("../middleware/auth");

// Get current admin user profile
router.get("/me", protect, restrictTo("admin"), getProfile);

module.exports = router;


