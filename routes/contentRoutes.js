const express = require("express");
const router = express.Router();

const {
  getContent,
  updateHero,
  updateAbout,
  updateServices,
  updateServiceDetail,
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
const { protect, adminOnly } = require("../middleware/auth");
const {
  validateHero,
  validateAbout,
  validateServices,
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

// Public route - get all content
router.get("/", getContent);

// Protected admin routes - update content sections
router.put("/hero", protect, adminOnly, validateHero, updateHero);
router.put("/about", protect, adminOnly, validateAbout, updateAbout);
router.put("/services", protect, adminOnly, validateServices, updateServices);
// Update single service detail (by _id or categoryKey + sectionKey)
router.put("/services/details/:id", protect, adminOnly, uploadSingle("image"), validateServiceDetail, updateServiceDetail);
// Projects route - accepts multiple images with field names like image_0, image_1, etc.
router.put("/projects", protect, adminOnly, (req, res, next) => {
  // Dynamically create fields array based on items count (max 20 items)
  const fields = [];
  for (let i = 0; i < 20; i++) {
    fields.push({ name: `image_${i}`, maxCount: 1 });
  }
  uploadFields(fields)(req, res, next);
}, validateProjects, updateProjects);

// Projects items CRUD operations
router.post("/projects/items", protect, adminOnly, uploadSingle("image"), validateProjectItem, addProjectItem);
router.put("/projects/items/:id", protect, adminOnly, uploadSingle("image"), validateProjectItem, updateProjectItem);
router.delete("/projects/items/:id", protect, adminOnly, deleteProjectItem);

// Partners section & items
router.put("/partners", protect, adminOnly, validatePartners, updatePartners);
router.post("/partners/items", protect, adminOnly, uploadSingle("logo"), validatePartnerItem, addPartnerItem);
router.put("/partners/items/:id", protect, adminOnly, uploadSingle("logo"), validatePartnerItem, updatePartnerItem);
router.delete("/partners/items/:id", protect, adminOnly, deletePartnerItem);
router.put("/jobs", protect, adminOnly, validateJobs, updateJobs);
router.post("/jobs/items", protect, adminOnly, validateJobItem, addJobItem);
router.put("/jobs/items/:id", protect, adminOnly, validateJobItem, updateJobItem);
router.delete("/jobs/items/:id", protect, adminOnly, deleteJobItem);
router.put("/features", protect, adminOnly, validateFeatures, updateFeatures);
router.put("/cta", protect, adminOnly, validateCTA, updateCTA);
router.put("/footer", protect, adminOnly, validateFooter, updateFooter);

// Image upload route
router.post("/upload", protect, adminOnly, uploadSingle("image"), uploadImage);

module.exports = router;
