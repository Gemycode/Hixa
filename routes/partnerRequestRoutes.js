const express = require("express");
const router = express.Router();

const {
  createPartnerRequest,
  getPartnerRequests,
  getPartnerRequestById,
  updatePartnerRequest,
  deletePartnerRequest,
} = require("../controllers/partnerRequestController");

const { protect, restrictTo } = require("../middleware/auth");
const { validatePartnerRequestCreate, validatePartnerRequestUpdate } = require("../middleware/validate");
const { uploadFields } = require("../middleware/upload");

// Public submit - allow logo and portfolio images
router.post(
  "/",
  (req, res, next) => {
    console.log('📥 Partner Request Route - POST /partner-requests received');
    console.log('📥 Request body:', req.body);
    console.log('📥 Request files:', req.files ? Object.keys(req.files) : 'No files');
    next();
  },
  uploadFields([
    { name: 'logo', maxCount: 1 },
    { name: 'portfolioImages', maxCount: 2 },
  ]),
  (req, res, next) => {
    console.log('📸 After upload middleware - Files:', req.files ? {
      hasFiles: true,
      keys: Object.keys(req.files),
      logo: req.files.logo ? `${req.files.logo.length} file(s)` : 'none',
      portfolioImages: req.files.portfolioImages ? `${req.files.portfolioImages.length} file(s)` : 'none'
    } : 'No files');
    next();
  },
  validatePartnerRequestCreate,
  createPartnerRequest
);

// Admin management
router.use(protect, restrictTo("admin"));
router.get("/", getPartnerRequests);
router.get("/:id", getPartnerRequestById);
router.put(
  "/:id",
  uploadFields([
    { name: 'logo', maxCount: 1 },
    { name: 'portfolioImages', maxCount: 2 },
    { name: 'portfolioImage', maxCount: 2 }, // Alternative field name
  ]),
  validatePartnerRequestUpdate,
  updatePartnerRequest
);
router.delete("/:id", deletePartnerRequest);

module.exports = router;
