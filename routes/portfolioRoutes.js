const express = require("express");
const router = express.Router();

// Import controllers
const {
  createWork,
  getWorks,
  getWorksByCategory,
  getWorkById,
  updateWork,
  deleteWork,
  getWorksByUser,
} = require("../controllers/portfolioController");

// Import middleware
const { protect, engineerOrAdmin } = require("../middleware/auth");
const { validateWork, validateWorkUpdate } = require("../middleware/validate");
const { uploadFields } = require("../middleware/upload");

// ====================
// Public Routes
// ====================
router.get("/", getWorks);
router.get("/category/:category", getWorksByCategory);
router.get("/user/:userId", getWorksByUser);
router.get("/:id", getWorkById);

// ====================
// Protected Routes
// ====================
router.use(protect); // Apply protect middleware to all routes below

// Create work
router.post(
  "/",
  engineerOrAdmin,
  uploadFields([
    { name: "image", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  validateWork,
  createWork
);

// Update work
router.put(
  "/:id",
  engineerOrAdmin,
  uploadFields([
    { name: "image", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  validateWorkUpdate,
  updateWork
);

// Delete work
router.delete("/:id", engineerOrAdmin, deleteWork);

module.exports = router;

