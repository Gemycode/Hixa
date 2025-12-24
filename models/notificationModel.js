const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "project_approved",
        "project_rejected",
        "proposal_submitted",
        "proposal_accepted",
        "proposal_rejected",
        "message_received",
        "project_status_changed",
        "project_completed",
        "review_received",
        "system_announcement",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    data: {
      // Additional data for the notification (flexible)
      projectId: mongoose.Schema.Types.ObjectId,
      proposalId: mongoose.Schema.Types.ObjectId,
      chatRoomId: mongoose.Schema.Types.ObjectId,
      messageId: mongoose.Schema.Types.ObjectId,
      reviewId: mongoose.Schema.Types.ObjectId,
      // يمكن إضافة المزيد حسب الحاجة
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    actionUrl: {
      type: String,
      trim: true,
      maxlength: 500,
    }, // رابط للانتقال عند الضغط على الإشعار
  },
  { timestamps: true }
);

// Indexes for faster queries
NotificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

// Ensure virtuals are included in JSON
NotificationSchema.set("toJSON", { virtuals: true });
NotificationSchema.set("toObject", { virtuals: true });

module.exports =
  mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
