const express = require("express");
const router = express.Router();

const {
  getContent,
  updateHero,
  uploadHeroImage,
  uploadHeroBackground,
  updateAbout,
  getServices,
  getService,
  updateService,
  updateServiceDetail,
  uploadServiceDetailImage,
  uploadQRCode,
  updateProjects,
  addProjectItem,
  updateProjectItem,
  deleteProjectItem,
  updatePartners,
  addPartnerItem,
  updatePartnerItem,
  deletePartnerItem,
  updateJobs,
  addJobItem,
  updateJobItem,
  deleteJobItem,
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
  validatePartners,
  validatePartnerItem,
  validateJobs,
  validateJobItem,
  validateFeatures,
  validateCTA,
  validateFooter,
} = require("../middleware/validate");

const { uploadSingle, uploadFields } = require("../middleware/upload");

// Public
router.get("/", getContent);

// Admin protected
router.put("/hero", protect, restrictTo("admin"), validateHero, updateHero);
router.post("/hero/image", protect, restrictTo("admin"), uploadSingle("image"), uploadHeroImage);
router.post("/hero/background", protect, restrictTo("admin"), uploadSingle("image"), uploadHeroBackground);
router.put("/about", protect, restrictTo("admin"), validateAbout, updateAbout);

// Services
router.get("/services", getServices);
router.get("/services/:itemId", getService);
router.put("/services/:itemId", protect, restrictTo("admin"), validateService, updateService);
router.put("/services/:itemId/details/:detailId", protect, restrictTo("admin"), validateServiceDetail, updateServiceDetail);
router.post("/services/:itemId/details/:detailId/image", protect, restrictTo("admin"), uploadSingle("image"), uploadServiceDetailImage);
// بعد سطر رفع صورة التفاصيل
router.post(
  "/services/:itemId/details/:detailId/qrcode", 
  protect, 
  restrictTo("admin"), 
  uploadSingle("qrCode"), 
  uploadQRCode
);
// router.get("/services/:serviceId/details/:detailId/qrcode", generateServiceQRCode); // Public endpoint for QR Code

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

// Partners section and items
router.put("/partners", protect, restrictTo("admin"), validatePartners, updatePartners);
router.post("/partners/items", protect, restrictTo("admin"), uploadSingle("logo"), validatePartnerItem, addPartnerItem);
router.put("/partners/items/:id", protect, restrictTo("admin"), uploadSingle("logo"), validatePartnerItem, updatePartnerItem);
router.delete("/partners/items/:id", protect, restrictTo("admin"), deletePartnerItem);

// Jobs section and items
router.put("/jobs", protect, restrictTo("admin"), validateJobs, updateJobs);
router.post("/jobs/items", protect, restrictTo("admin"), validateJobItem, addJobItem);
router.put("/jobs/items/:id", protect, restrictTo("admin"), validateJobItem, updateJobItem);
router.delete("/jobs/items/:id", protect, restrictTo("admin"), deleteJobItem);

router.put("/features", protect, restrictTo("admin"), validateFeatures, updateFeatures);
router.put("/cta", protect, restrictTo("admin"), validateCTA, updateCTA);
router.put("/footer", protect, restrictTo("admin"), validateFooter, updateFooter);

// Upload
router.post("/upload", protect, restrictTo("admin"), uploadSingle("image"), uploadImage);

module.exports = router;
