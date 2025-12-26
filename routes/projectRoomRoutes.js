const express = require("express");
const router = express.Router();

const {
  getProjectRooms,
  getProjectRoomById,
  getProjectRoomByProjectId,
  closeProjectRoom,
  reopenProjectRoom,
  getProjectRoomUnreadCount,
  getProjectRoomStatistics,
} = require("../controllers/projectRoomController");

const {
  getChatRoomsByProjectRoom,
} = require("../controllers/chatRoomController");

const { protect, restrictTo } = require("../middleware/auth");

router.use(protect);

router.get("/statistics", restrictTo("admin"), getProjectRoomStatistics);
router.get("/", getProjectRooms);
router.get("/project/:projectId", getProjectRoomByProjectId);
// Specific routes must come before parameterized routes
router.get("/:roomId/chat-rooms", getChatRoomsByProjectRoom);
router.get("/:roomId/unread-count", getProjectRoomUnreadCount);
router.get("/:roomId", getProjectRoomById);
router.patch("/:roomId/close", restrictTo("admin"), closeProjectRoom);
router.patch("/:roomId/reopen", restrictTo("admin"), reopenProjectRoom);

module.exports = router;
