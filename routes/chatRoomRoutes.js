const express = require("express");
const router = express.Router();

const {
  getChatRoomsByProjectRoom,
  getChatRoomById,
  getMyChatRooms,
  createChatRoom,
} = require("../controllers/chatRoomController");

const { protect, restrictTo } = require("../middleware/auth");
const { validateChatRoomCreate } = require("../middleware/validate");

router.use(protect);

router.get("/project-room/:roomId", getChatRoomsByProjectRoom);
router.get("/:roomId", getChatRoomById);
router.get("/", getMyChatRooms);
router.post("/", restrictTo("admin"), validateChatRoomCreate, createChatRoom);

module.exports = router;
