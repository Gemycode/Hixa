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

const { protect, restrictTo } = require("../middleware/auth");

router.use(protect);

router.get("/statistics", restrictTo("admin"), getProjectRoomStatistics);
router.get("/", getProjectRooms);
router.get("/:roomId", getProjectRoomById);
router.get("/:roomId/unread-count", getProjectRoomUnreadCount);
router.get("/project/:projectId", getProjectRoomByProjectId);
router.patch("/:roomId/close", restrictTo("admin"), closeProjectRoom);
router.patch("/:roomId/reopen", restrictTo("admin"), reopenProjectRoom);

module.exports = router;
