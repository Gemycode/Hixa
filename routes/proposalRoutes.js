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

// All proposal routes require authentication
router.use(protect);

// Engineer: submit proposal
router.post("/", restrictTo("engineer"), validateProposalCreate, createProposal);

// Engineer: my proposals
router.get("/my", restrictTo("engineer"), getMyProposals);

// Project proposals (admin and project owner see all, engineer sees own - handled in controller)
router.get("/project/:projectId", getProposalsByProject);

// Admin: update proposal status
router.put("/:id/status", restrictTo("admin"), validateProposalStatusUpdate, updateProposalStatus);

module.exports = router;

