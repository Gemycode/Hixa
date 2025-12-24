const express = require("express");
const router = express.Router();

const {
  getProjectRooms,
  getProjectRoomById,
  getProjectRoomByProjectId,
} = require("../controllers/projectRoomController");

const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/", getProjectRooms);
router.get("/:roomId", getProjectRoomById);
router.get("/project/:projectId", getProjectRoomByProjectId);

module.exports = router;
