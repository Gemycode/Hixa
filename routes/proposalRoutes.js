const express = require("express");
const router = express.Router();

const {
  createProposal,
  getProposalsByProject,
  getMyProposals,
  updateProposalStatus,
  updateProposal,
  deleteProposal,
} = require("../controllers/proposalController");

const { protect, restrictTo } = require("../middleware/auth");
const {
  validateProposalCreate,
  validateProposalStatusUpdate,
  validateProposalUpdate,
} = require("../middleware/validate");

// Set projectId from params
const setProjectIdFromParams = (req, res, next) => {
  if (req.params.projectId) req.body.projectId = req.params.projectId;
  next();
};

router.use(protect);

// Engineer and Company routes
router.post(
  "/project/:projectId",
  restrictTo("engineer", "company"),
  setProjectIdFromParams,
  validateProposalCreate,
  createProposal
);
router.post("/", restrictTo("engineer", "company"), validateProposalCreate, createProposal);
router.get("/my", restrictTo("engineer", "company"), getMyProposals);

// Project proposals
router.get("/project/:projectId", getProposalsByProject);

// Update proposals
router.put("/:id", restrictTo("admin", "engineer", "company"), validateProposalUpdate, updateProposal);
router.put("/:id/status", restrictTo("admin"), validateProposalStatusUpdate, updateProposalStatus);

// Delete proposal
router.delete("/:id", restrictTo("admin", "engineer", "company"), deleteProposal);

module.exports = router;
