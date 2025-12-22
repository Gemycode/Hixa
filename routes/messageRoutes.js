const express = require("express");
const router = express.Router();

const {
  sendMessage,
  getMessagesByRoom,
  markMessageAsRead,
  getUnreadMessagesCount,
} = require("../controllers/messageController");
const { validateMessageCreate } = require("../middleware/validate");
const { protect } = require("../middleware/auth");

// Apply protection middleware to all routes
router.use(protect);

// Send a new message
router.post("/", validateMessageCreate, sendMessage);

// Get messages for a chat room
router.get("/room/:roomId", getMessagesByRoom);

// Mark message as read
router.put("/:messageId/read", markMessageAsRead);

// Get unread messages count
router.get("/unread-count", getUnreadMessagesCount);

module.exports = router;