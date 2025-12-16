const express = require("express");
const router = express.Router();

const {
  createProposal,
  getProposalsByProject,
  getMyProposals,
  updateProposalStatus,
} = require("../controllers/proposalController");
const { protect, restrictTo } = require("../middleware/auth");
const { validateProposalCreate, validateProposalStatusUpdate } = require("../middleware/validate");

// Middleware to map projectId from params into body for validation/handler
const setProjectIdFromParams = (req, res, next) => {
  if (req.params.projectId) {
    req.body.projectId = req.params.projectId;
  }
  next();
};

// All proposal routes require authentication
router.use(protect);

// Engineer: submit proposal (preferred: projectId in path)
router.post(
  "/project/:projectId",
  restrictTo("engineer"),
  setProjectIdFromParams,
  validateProposalCreate,
  createProposal
);

// (Legacy) Engineer: submit proposal with projectId in body
router.post("/", restrictTo("engineer"), validateProposalCreate, createProposal);

// Engineer: my proposals
router.get("/my", restrictTo("engineer"), getMyProposals);

// Project proposals (admin and project owner see all, engineer sees own - handled in controller)
router.get("/project/:projectId", getProposalsByProject);

// Admin: update proposal status
router.put("/:id/status", restrictTo("admin"), validateProposalStatusUpdate, updateProposalStatus);

module.exports = router;

