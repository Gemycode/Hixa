const express = require("express");
const router = express.Router();

const {
  getChatRoomsByProjectRoom,
  getChatRoomById,
  getMyChatRooms,
  createChatRoom,
} = require("../controllers/chatRoomController");
const { validateChatRoomCreate } = require("../middleware/validate");
const { protect, adminOnly } = require("../middleware/auth");

// Apply protection middleware to all routes
router.use(protect);

// Get all chat rooms within a project room
router.get("/project-room/:roomId", getChatRoomsByProjectRoom);

// Get chat room by ID
router.get("/:roomId", getChatRoomById);

// Get user's chat rooms across all projects
router.get("/", getMyChatRooms);

// Create a new chat room (admin only)
router.post("/", adminOnly, validateChatRoomCreate, createChatRoom);

module.exports = router;
