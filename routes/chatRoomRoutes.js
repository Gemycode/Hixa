const express = require("express");
const router = express.Router();

const {
  getChatRoomsByProjectRoom,
  getChatRoomById,
  getMyChatRooms,
  createChatRoom,
  archiveChatRoom,
  unarchiveChatRoom,
  deleteChatRoom,
  addParticipant,
  removeParticipant,
  getChatRoomUnreadCount,
  markChatRoomAsRead,
  getChatRoomStatistics,
} = require("../controllers/chatRoomController");

const { protect, restrictTo } = require("../middleware/auth");
const { validateChatRoomCreate, validateAddParticipant } = require("../middleware/validate");

router.use(protect);

// Specific routes must come before generic :roomId routes
router.get("/statistics", restrictTo("admin"), getChatRoomStatistics);
router.get("/project-room/:roomId", getChatRoomsByProjectRoom);
router.get("/", getMyChatRooms);
router.post("/", restrictTo("admin"), validateChatRoomCreate, createChatRoom);

// Specific routes with :roomId must come before generic :roomId route
router.put("/:roomId/read", markChatRoomAsRead);
router.get("/:roomId/unread-count", getChatRoomUnreadCount);
router.patch("/:roomId/archive", restrictTo("admin"), archiveChatRoom);
router.patch("/:roomId/unarchive", restrictTo("admin"), unarchiveChatRoom);
router.post("/:roomId/participants", restrictTo("admin"), validateAddParticipant, addParticipant);
router.delete("/:roomId/participants/:participantId", restrictTo("admin"), removeParticipant);

// Generic routes come last
router.get("/:roomId", getChatRoomById);
router.delete("/:roomId", restrictTo("admin"), deleteChatRoom);

module.exports = router;
