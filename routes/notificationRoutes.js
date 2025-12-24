const express = require("express");
const router = express.Router();

const {
  getNotifications,
  getUnreadCount,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
} = require("../controllers/notificationController");

const { protect } = require("../middleware/auth");

// All routes require authentication
router.use(protect);

// Get all notifications (with pagination and filters)
router.get("/", getNotifications);

// Get unread notifications count
router.get("/unread/count", getUnreadCount);

// Get notification by ID
router.get("/:id", getNotificationById);

// Mark notification as read
router.patch("/:id/read", markAsRead);

// Mark all notifications as read
router.patch("/read-all", markAllAsRead);

// Delete notification
router.delete("/:id", deleteNotification);

// Delete all read notifications
router.delete("/read/all", deleteAllRead);

module.exports = router;
