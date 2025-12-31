const mongoose = require("mongoose");

const ChatRoomSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    projectRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectRoom",
      required: true,
    },
    type: {
      type: String,
      enum: ["admin-engineer", "admin-company", "admin-client", "group"],
      required: true,
    },
    // للمساعدة في التصفية والبحث
    engineer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // معلومات للعرض
    lastMessage: {
      content: { type: String },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date },
    },
    // Note: unreadCount will be calculated dynamically per user
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["admin", "engineer", "company", "client"],
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        lastReadAt: {
          type: Date,
        },
      },
    ],
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
ChatRoomSchema.index({ projectRoom: 1, type: 1 });
ChatRoomSchema.index({ project: 1, type: 1 });
ChatRoomSchema.index({ projectRoom: 1, createdAt: -1 });
ChatRoomSchema.index({ "participants.user": 1 });
ChatRoomSchema.index({ engineer: 1 });
ChatRoomSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.ChatRoom || mongoose.model("ChatRoom", ChatRoomSchema);