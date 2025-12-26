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

router.get("/statistics", restrictTo("admin"), getChatRoomStatistics);
router.get("/project-room/:roomId", getChatRoomsByProjectRoom);
router.get("/:roomId", getChatRoomById);
router.get("/:roomId/unread-count", getChatRoomUnreadCount);
router.get("/", getMyChatRooms);
router.post("/", restrictTo("admin"), validateChatRoomCreate, createChatRoom);
router.put("/:roomId/read", markChatRoomAsRead);
router.patch("/:roomId/archive", restrictTo("admin"), archiveChatRoom);
router.patch("/:roomId/unarchive", restrictTo("admin"), unarchiveChatRoom);
router.delete("/:roomId", restrictTo("admin"), deleteChatRoom);
router.post("/:roomId/participants", restrictTo("admin"), validateAddParticipant, addParticipant);
router.delete("/:roomId/participants/:participantId", restrictTo("admin"), removeParticipant);

module.exports = router;
