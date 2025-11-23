const express = require("express");
const router = express.Router();

const {
  getContent,
  updateHero,
  updateAbout,
  updateServices,
  updateProjects,
  updateFeatures,
  updateCTA,
  updateFooter,
  uploadImage,
} = require("../controllers/contentController");
const { protect, adminOnly } = require("../middleware/auth");
const {
  validateHero,
  validateAbout,
  validateServices,
  validateProjects,
  validateFeatures,
  validateCTA,
  validateFooter,
} = require("../middleware/validate");
const { uploadSingle, uploadFields } = require("../middleware/upload");

// Public route - get all content
router.get("/", getContent);

// Protected admin routes - update content sections
router.put("/hero", protect, adminOnly, validateHero, updateHero);
router.put("/about", protect, adminOnly, validateAbout, updateAbout);
router.put("/services", protect, adminOnly, validateServices, updateServices);
// Projects route - accepts multiple images with field names like image_0, image_1, etc.
router.put("/projects", protect, adminOnly, (req, res, next) => {
  // Dynamically create fields array based on items count (max 20 items)
  const fields = [];
  for (let i = 0; i < 20; i++) {
    fields.push({ name: `image_${i}`, maxCount: 1 });
  }
  uploadFields(fields)(req, res, next);
}, validateProjects, updateProjects);
router.put("/features", protect, adminOnly, validateFeatures, updateFeatures);
router.put("/cta", protect, adminOnly, validateCTA, updateCTA);
router.put("/footer", protect, adminOnly, validateFooter, updateFooter);

// Image upload route
router.post("/upload", protect, adminOnly, uploadSingle("image"), uploadImage);

module.exports = router;
