const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    chatRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: true,
    },
    content: {
      type: String,
      trim: true,
    },
    attachments: [
      {
        url: String,
        type: {
          type: String,
          enum: ['image', 'video', 'document', 'audio', 'other'],
          default: 'other',
        },
        name: String,
        size: Number,
      },
    ],
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
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
      ref: 'User',
    },
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        emoji: String,
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
messageSchema.index({ chatRoom: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ 'readBy.user': 1 });

// Virtual for unread messages count
messageSchema.virtual('unreadCount', {
  ref: 'MessageRead',
  localField: '_id',
  foreignField: 'message',
  count: true,
});

// Pre-save hook to update timestamps
messageSchema.pre('save', function (next) {
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
  }
  next();
});

// Static method to mark messages as read
messageSchema.statics.markAsRead = async function (messageId, userId) {
  return this.findByIdAndUpdate(
    messageId,
    {
      $addToSet: {
        readBy: {
          user: userId,
          readAt: Date.now(),
        },
      },
    },
    { new: true }
  );
};

// Static method to get unread messages count
messageSchema.statics.getUnreadCount = async function (userId, chatRoomId) {
  return this.countDocuments({
    chatRoom: chatRoomId,
    sender: { $ne: userId },
    'readBy.user': { $ne: userId },
    isDeleted: false,
  });
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
