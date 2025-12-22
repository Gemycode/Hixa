const express = require("express");
const router = express.Router();

const {
  getProjectRooms,
  getProjectRoomById,
  getProjectRoomByProjectId,
} = require("../controllers/projectRoomController");
const { protect } = require("../middleware/auth");

// Apply protection middleware to all routes
router.use(protect);

// Get all project rooms (Dashboard)
router.get("/", getProjectRooms);

// Get project room by ID
router.get("/:roomId", getProjectRoomById);

// Get project room by project ID
router.get("/project/:projectId", getProjectRoomByProjectId);

module.exports = router;