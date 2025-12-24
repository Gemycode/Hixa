const Notification = require("../models/notificationModel");
const { NotFoundError, BadRequestError } = require("../utils/errors");
const { getWebSocketServer } = require("../websocket/websocket");

// Helper function to create notification and emit via WebSocket
const createNotification = async (notificationData) => {
  const notification = await Notification.create(notificationData);
  
  // Emit real-time notification via WebSocket
  try {
    const wss = getWebSocketServer();
    wss.sendToUser(notification.user, {
      type: 'new_notification',
      data: notification,
    });
  } catch (error) {
    // WebSocket might not be initialized or user not connected - that's okay
    console.log('Could not send notification via WebSocket:', error.message);
  }
  
  return notification;
};

// Get all notifications for current user
exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const filters = { user: userId };
    if (unreadOnly === "true") {
      filters.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Notification.countDocuments(filters),
    ]);

    res.json({
      data: notifications,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get unread notifications count
exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false,
    });

    res.json({
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get notification by ID
exports.getNotificationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({
      _id: id,
      user: userId,
    });

    if (!notification) {
      throw new NotFoundError("الإشعار غير موجود");
    }

    res.json({
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// Mark notification as read
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({
      _id: id,
      user: userId,
    });

    if (!notification) {
      throw new NotFoundError("الإشعار غير موجود");
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    res.json({
      message: "تم تحديد الإشعار كمقروء",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await Notification.updateMany(
      { user: userId, isRead: false },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    res.json({
      message: "تم تحديد جميع الإشعارات كمقروءة",
      data: {
        updatedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete notification
exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      user: userId,
    });

    if (!notification) {
      throw new NotFoundError("الإشعار غير موجود");
    }

    res.json({
      message: "تم حذف الإشعار بنجاح",
    });
  } catch (error) {
    next(error);
  }
};

// Delete all read notifications
exports.deleteAllRead = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await Notification.deleteMany({
      user: userId,
      isRead: true,
    });

    res.json({
      message: "تم حذف جميع الإشعارات المقروءة",
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Export helper function for use in other controllers
exports.createNotification = createNotification;
