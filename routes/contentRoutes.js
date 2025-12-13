const express = require("express");
const router = express.Router();

const {
  getContent,
  updateHero,
  updateAbout,
  updateServices,
  getServiceItem,
  addServiceItem,
  updateServiceItem,
  deleteServiceItem,
  getServiceDetails,
  addServiceDetail,
  updateServiceDetail,
  deleteServiceDetail,
  updateProjects,
  addProjectItem,
  updateProjectItem,
  deleteProjectItem,
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
  validateServiceItem,
  validateServiceDetail,
  validateProjects,
  validateProjectItem,
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

// Services items CRUD operations
router.get("/services/items/:id", getServiceItem); // Public - get service with details
router.post("/services/items", protect, adminOnly, validateServiceItem, addServiceItem);
router.put("/services/items/:id", protect, adminOnly, validateServiceItem, updateServiceItem);
router.delete("/services/items/:id", protect, adminOnly, deleteServiceItem);

// Services details CRUD operations
router.get("/services/items/:id/details", getServiceDetails); // Public - get service details by service ID
router.post("/services/items/:serviceId/details", protect, adminOnly, uploadSingle("image"), validateServiceDetail, addServiceDetail);
router.put("/services/items/:serviceId/details/:id", protect, adminOnly, uploadSingle("image"), validateServiceDetail, updateServiceDetail);
router.delete("/services/items/:serviceId/details/:id", protect, adminOnly, deleteServiceDetail);

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
router.put("/features", protect, adminOnly, validateFeatures, updateFeatures);
router.put("/cta", protect, adminOnly, validateCTA, updateCTA);
router.put("/footer", protect, adminOnly, validateFooter, updateFooter);

// Image upload route
router.post("/upload", protect, adminOnly, uploadSingle("image"), uploadImage);

module.exports = router;
