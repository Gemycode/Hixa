const mongoose = require("mongoose");

const ProjectRoomSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      unique: true,
    },
    // معلومات إضافية للعرض في Dashboard
    projectTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    // Note: unreadCount will be calculated dynamically per user
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
    closedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
ProjectRoomSchema.index({ project: 1 });
ProjectRoomSchema.index({ status: 1, createdAt: -1 });
ProjectRoomSchema.index({ lastActivityAt: -1 });

module.exports = mongoose.models.ProjectRoom || mongoose.model("ProjectRoom", ProjectRoomSchema);