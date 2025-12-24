const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    chatRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: function() {
        return this.type === 'text' || this.type === 'system';
      },
      trim: true,
      maxlength: 5000,
    },
    type: {
      type: String,
      enum: ["text", "file", "system"],
      default: "text",
    },
    attachments: [
      {
        name: { type: String, trim: true },
        url: { type: String },
        type: { type: String },
      },
    ],
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        emoji: {
          type: String,
          required: true,
        },
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
MessageSchema.index({ chatRoom: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, createdAt: -1 });
MessageSchema.index({ "readBy.user": 1 });
MessageSchema.index({ replyTo: 1 });
MessageSchema.index({ "reactions.user": 1 });
MessageSchema.index({ isDeleted: 1 });

// Pre-save hook to update isEdited
MessageSchema.pre("save", function (next) {
  if (this.isModified("content") && !this.isNew) {
    this.isEdited = true;
  }
  next();
});

module.exports = mongoose.models.Message || mongoose.model("Message", MessageSchema);