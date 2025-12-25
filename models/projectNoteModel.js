const mongoose = require("mongoose");

const ProjectNoteSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    note: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isInternal: {
      type: Boolean,
      default: false, // false = visible to client, true = internal only (admin/engineer)
    },
  },
  { timestamps: true }
);

// Indexes
ProjectNoteSchema.index({ project: 1, createdAt: -1 });
ProjectNoteSchema.index({ createdBy: 1 });
ProjectNoteSchema.index({ isInternal: 1 });

module.exports = mongoose.models.ProjectNote || mongoose.model("ProjectNote", ProjectNoteSchema);
