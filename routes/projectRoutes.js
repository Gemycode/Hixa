const express = require("express");
const router = express.Router();

const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  uploadAttachment,
  deleteAttachment,
  getProjectStatistics,
} = require("../controllers/projectController");

const { protect, restrictTo } = require("../middleware/auth");
const { validateProject, validateProjectUpdate } = require("../middleware/validate");
const { uploadSingleFile } = require("../middleware/upload");

// All routes require authentication
router.use(protect);

// Statistics
router.get("/statistics", getProjectStatistics);

// Get projects
router.get("/", getProjects);
router.get("/:id", getProjectById);

// Create project (client)
router.post("/", restrictTo("client"), validateProject, createProject);

// Update/delete project
router.put("/:id", validateProjectUpdate, updateProject);
router.delete("/:id", deleteProject);

// Attachments
router.post("/:id/attachments", uploadSingleFile("file"), uploadAttachment);
router.delete("/:id/attachments/:attachmentId", deleteAttachment);

module.exports = router;
