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
const { protect, clientOnly, adminOnly } = require("../middleware/auth");
const { validateProject, validateProjectUpdate } = require("../middleware/validate");
const { uploadSingle } = require("../middleware/upload");

// All routes require authentication
router.use(protect);

// Statistics (all authenticated users)
router.get("/statistics", getProjectStatistics);

// Get all projects (filtered by role)
router.get("/", getProjects);

// Get single project
router.get("/:id", getProjectById);

// Create project (Client only)
router.post("/", clientOnly, validateProject, createProject);

// Update project (Client can update their own, Admin can update any)
router.put("/:id", validateProjectUpdate, updateProject);

// Delete project (Client can delete their own, Admin can delete any)
router.delete("/:id", deleteProject);

// Upload attachment (Client can upload to their own projects)
router.post("/:id/attachments", uploadSingle("file"), uploadAttachment);

// Delete attachment (Client can delete from their own projects)
router.delete("/:id/attachments/:attachmentId", deleteAttachment);

module.exports = router;




