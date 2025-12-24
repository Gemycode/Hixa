const express = require("express");
const router = express.Router();

const {
  getContent,
  updateHero,
  updateAbout,
  getServices,
  getService,
  updateService,
  updateServiceDetail,
  uploadServiceDetailImage,
  updateProjects,
  addProjectItem,
  updateProjectItem,
  deleteProjectItem,
  updateFeatures,
  updateCTA,
  updateFooter,
  uploadImage,
} = require("../controllers/contentController");

const { protect, restrictTo } = require("../middleware/auth");

const {
  validateHero,
  validateAbout,
  validateService,
  validateServiceDetail,
  validateProjects,
  validateProjectItem,
  validateFeatures,
  validateCTA,
  validateFooter,
} = require("../middleware/validate");

const { uploadSingle, uploadFields } = require("../middleware/upload");

// Public
router.get("/", getContent);

// Admin protected
router.put("/hero", protect, restrictTo("admin"), validateHero, updateHero);
router.put("/about", protect, restrictTo("admin"), validateAbout, updateAbout);

// Services
router.get("/services", getServices);
router.get("/services/:itemId", getService);
router.put("/services/:itemId", protect, restrictTo("admin"), validateService, updateService);
router.put("/services/:itemId/details/:detailId", protect, restrictTo("admin"), validateServiceDetail, updateServiceDetail);
router.post("/services/:itemId/details/:detailId/image", protect, restrictTo("admin"), uploadSingle("image"), uploadServiceDetailImage);

// Projects
router.put("/projects", protect, restrictTo("admin"), (req, res, next) => {
  const fields = [];
  for (let i = 0; i < 20; i++) fields.push({ name: `image_${i}`, maxCount: 1 });
  uploadFields(fields)(req, res, next);
}, validateProjects, updateProjects);

// Project items
router.post("/projects/items", protect, restrictTo("admin"), uploadSingle("image"), validateProjectItem, addProjectItem);
router.put("/projects/items/:id", protect, restrictTo("admin"), uploadSingle("image"), validateProjectItem, updateProjectItem);
router.delete("/projects/items/:id", protect, restrictTo("admin"), deleteProjectItem);

router.put("/features", protect, restrictTo("admin"), validateFeatures, updateFeatures);
router.put("/cta", protect, restrictTo("admin"), validateCTA, updateCTA);
router.put("/footer", protect, restrictTo("admin"), validateFooter, updateFooter);

// Upload
router.post("/upload", protect, restrictTo("admin"), uploadSingle("image"), uploadImage);

module.exports = router;
