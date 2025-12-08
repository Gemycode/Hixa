const express = require("express");
const router = express.Router();

const {
  createWork,
  getWorks,
  getWorksByCategory,
  getWorkById,
  updateWork,
  deleteWork,
} = require("../controllers/portfolioController");
const { protect, engineerOrAdmin } = require("../middleware/auth");
const { validateWork, validateWorkUpdate } = require("../middleware/validate");
const { uploadFields } = require("../middleware/upload");

// Public list and details
router.get("/", getWorks);
router.get("/category/:category", getWorksByCategory);
router.get("/:id", getWorkById);

// Protected CRUD
router.post(
  "/",
  protect,
  engineerOrAdmin,
  uploadFields([
    { name: "image", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  validateWork,
  createWork
);

router.put(
  "/:id",
  protect,
  engineerOrAdmin,
  uploadFields([
    { name: "image", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  validateWorkUpdate,
  updateWork
);

router.delete("/:id", protect, engineerOrAdmin, deleteWork);

module.exports = router;

