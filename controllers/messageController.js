const Message = require("../models/messageModel");
const ChatRoom = require("../models/chatRoomModel");
const ProjectRoom = require("../models/projectRoomModel");
const User = require("../models/userModel");
const mongoose = require("mongoose");
const { getWebSocketServer } = require('../websocket/websocket');
const { uploadFileToCloudinary } = require('../middleware/upload');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');

// Send a new message with support for attachments, replies, and reactions
const sendMessage = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { chatRoomId, content, type = 'text', attachments = [], replyTo } = req.body;
    const senderId = req.user._id;

    // Validate chat room exists and user is a participant
    const chatRoom = await ChatRoom.findById(chatRoomId).session(session);
    if (!chatRoom) {
      throw new NotFoundError('غرفة الدردشة غير موجودة');
    }

    const isParticipant = chatRoom.participants.some(
      p => p.user.toString() === senderId.toString()
    );

    if (!isParticipant && req.user.role !== 'admin') {
      throw new ForbiddenError('غير مصرح لك بإرسال رسائل في هذه الغرفة');
    }

    // Handle file uploads if any
    let uploadedAttachments = [];
    if (req.files && req.files.length > 0) {
      uploadedAttachments = await Promise.all(
        req.files.map(async (file) => {
          // Use buffer (memory storage)
          const url = await uploadFileToCloudinary(
            file.buffer, 
            `hixa/messages/${chatRoomId}`, 
            file.originalname
          );
          return {
            url: url,
            type: file.mimetype.split('/')[0], // 'image', 'video', etc.
            name: file.originalname,
            size: file.size,
          };
        })
      );
    }

    // Create message
    const messageData = {
      chatRoom: chatRoomId,
      sender: senderId,
      content: content || '',
      type,
      attachments: [...attachments, ...uploadedAttachments],
    };

    if (replyTo) {
      const repliedMessage = await Message.findById(replyTo).session(session);
      if (repliedMessage) {
        messageData.replyTo = repliedMessage._id;
      }
    }

    const message = await Message.create([messageData], { session });
    const newMessage = message[0];

    // Update chat room's last message
    chatRoom.lastMessage = {
      content: content ? content.substring(0, 100) : 'مرفق',
      sender: senderId,
      messageId: newMessage._id,
      createdAt: newMessage.createdAt,
    };
    await chatRoom.save({ session });

    // Update project room's last activity if applicable
    if (chatRoom.projectRoom) {
      await ProjectRoom.findByIdAndUpdate(
        chatRoom.projectRoom,
        { lastActivityAt: newMessage.createdAt },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    // Populate sender and other references
    await newMessage.populate([
      { path: 'sender', select: 'name email role avatar' },
      {
        path: 'replyTo',
        select: 'content sender',
        populate: {
          path: 'sender',
          select: 'name avatar',
        },
      },
    ]);

    // Emit real-time message via WebSocket
    const wss = getWebSocketServer();
    wss.broadcastToRoom(chatRoomId.toString(), {
      type: 'new_message',
      data: newMessage,
    });

    // Notify participants (except sender) about the new message
    chatRoom.participants.forEach(participant => {
      if (participant.user.toString() !== senderId.toString()) {
        wss.sendToUser(participant.user.toString(), {
          type: 'notification',
          data: {
            title: 'رسالة جديدة',
            body: `رسالة جديدة في ${chatRoom.name || 'المحادثة'}`,
            chatRoomId: chatRoom._id,
            messageId: newMessage._id,
          },
        });
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم إرسال الرسالة بنجاح',
      data: newMessage,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    // Cleanup uploaded files if any error occurred (if using disk storage)
    // Note: With memory storage, buffers are automatically garbage collected
    
    next(error);
  }
};

// Get messages for a chat room
const getMessagesByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    // Check if chat room exists and user is participant
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: "غرفة الدردشة غير موجودة" });
    }

    // Check if user is participant in this chat room
    const isParticipant = chatRoom.participants.some(
      participant => participant.user.toString() === userId.toString()
    );

    // Admins can access all chat rooms
    if (!isParticipant && req.user.role !== "admin") {
      return res.status(403).json({ message: "غير مسموح لك بالوصول إلى هذه الغرفة" });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find({ chatRoom: roomId, isDeleted: false })
        .populate("sender", "name email role avatar")
        .populate({
          path: 'replyTo',
          select: 'content sender',
          populate: {
            path: 'sender',
            select: 'name avatar',
          },
        })
        .populate("reactions.user", "name avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments({ chatRoom: roomId, isDeleted: false }),
    ]);

    // Reverse messages to show oldest first
    const reversedMessages = messages.reverse();

    res.json({
      data: reversedMessages,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "معرف الغرفة غير صحيح" });
    }
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Mark message as read
const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "الرسالة غير موجودة" });
    }

    // Check if user is participant in this chat room
    const chatRoom = await ChatRoom.findById(message.chatRoom);
    if (!chatRoom) {
      return res.status(404).json({ message: "غرفة الدردشة غير موجودة" });
    }

    const isParticipant = chatRoom.participants.some(
      participant => participant.user.toString() === userId.toString()
    );

    if (!isParticipant && req.user.role !== "admin") {
      return res.status(403).json({ message: "غير مسموح لك بتعديل هذه الرسالة" });
    }

    // Check if user has already read this message
    const alreadyRead = message.readBy.some(
      reader => reader.user.toString() === userId.toString()
    );

    if (!alreadyRead) {
      message.readBy.push({
        user: userId,
        readAt: new Date(),
      });
      await message.save();
    }

    // Update participant's lastReadAt in chat room
    const participantIndex = chatRoom.participants.findIndex(
      p => p.user.toString() === userId.toString()
    );

    if (participantIndex !== -1) {
      chatRoom.participants[participantIndex].lastReadAt = new Date();
      await chatRoom.save();
    }

    res.json({ message: "تم تحديث حالة القراءة بنجاح" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "معرف الرسالة غير صحيح" });
    }
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Get unread messages count
const getUnreadMessagesCount = async (req, res) => {
  try {
    const userId = req.user._id;

    // This is a simplified version - in a production app, you would need a more
    // efficient way to calculate unread counts, possibly with aggregation pipelines
    const chatRooms = await ChatRoom.find({ "participants.user": userId });

    let totalCount = 0;
    const unreadCounts = [];

    for (const chatRoom of chatRooms) {
      // Find participant info
      const participant = chatRoom.participants.find(
        p => p.user.toString() === userId.toString()
      );

      if (participant) {
        // Count messages created after lastReadAt
        const count = await Message.countDocuments({
          chatRoom: chatRoom._id,
          sender: { $ne: userId }, // Don't count own messages
          isDeleted: false,
          createdAt: { 
            $gt: participant.lastReadAt || new Date(0) 
          },
          'readBy.user': { $ne: userId }, // Not already read by this user
        });

        totalCount += count;
        unreadCounts.push({
          chatRoom: chatRoom._id,
          count,
        });
      }
    }

    res.json({
      data: {
        total: totalCount,
        unreadCounts,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Update message (edit)
const updateMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "الرسالة غير موجودة" });
    }

    // Check if user is the sender
    if (message.sender.toString() !== userId.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "غير مسموح لك بتعديل هذه الرسالة" });
    }

    // Check if message is deleted
    if (message.isDeleted) {
      return res.status(400).json({ message: "لا يمكن تعديل رسالة محذوفة" });
    }

    message.content = content;
    message.isEdited = true;
    await message.save();

    // Populate sender for response
    await message.populate('sender', 'name email role avatar');

    // Emit update via WebSocket
    try {
      const wss = getWebSocketServer();
      wss.broadcastToRoom(message.chatRoom.toString(), {
        type: 'message_updated',
        data: message,
      });
    } catch (wsError) {
      console.error('WebSocket error:', wsError);
    }

    res.json({
      message: "تم تحديث الرسالة بنجاح",
      data: message,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "معرف الرسالة غير صحيح" });
    }
    next(error);
  }
};

// Delete message
const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "الرسالة غير موجودة" });
    }

    // Check if user is the sender or admin
    if (message.sender.toString() !== userId.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "غير مسموح لك بحذف هذه الرسالة" });
    }

    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = userId;
    await message.save();

    // Emit delete via WebSocket
    try {
      const wss = getWebSocketServer();
      wss.broadcastToRoom(message.chatRoom.toString(), {
        type: 'message_deleted',
        data: { messageId: message._id, chatRoom: message.chatRoom },
      });
    } catch (wsError) {
      console.error('WebSocket error:', wsError);
    }

    res.json({ message: "تم حذف الرسالة بنجاح" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "معرف الرسالة غير صحيح" });
    }
    next(error);
  }
};

// Toggle reaction (add or remove)
const toggleReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "الرسالة غير موجودة" });
    }

    // Check if user is participant in chat room
    const chatRoom = await ChatRoom.findById(message.chatRoom);
    if (!chatRoom) {
      return res.status(404).json({ message: "غرفة الدردشة غير موجودة" });
    }

    const isParticipant = chatRoom.participants.some(
      p => p.user.toString() === userId.toString()
    );

    if (!isParticipant && req.user.role !== "admin") {
      return res.status(403).json({ message: "غير مسموح لك بالتفاعل مع هذه الرسالة" });
    }

    // Check if reaction already exists
    const existingReactionIndex = message.reactions.findIndex(
      r => r.user.toString() === userId.toString() && r.emoji === emoji
    );

    if (existingReactionIndex !== -1) {
      // Remove reaction
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Add reaction
      message.reactions.push({ user: userId, emoji });
    }

    await message.save();
    await message.populate('reactions.user', 'name avatar');

    // Emit reaction update via WebSocket
    try {
      const wss = getWebSocketServer();
      wss.broadcastToRoom(message.chatRoom.toString(), {
        type: 'reaction_updated',
        data: message,
      });
    } catch (wsError) {
      console.error('WebSocket error:', wsError);
    }

    res.json({
      message: existingReactionIndex !== -1 ? "تم إزالة التفاعل" : "تم إضافة التفاعل",
      data: message,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "معرف الرسالة غير صحيح" });
    }
    next(error);
  }
};

// Search messages
const searchMessages = async (req, res, next) => {
  try {
    const { roomId, query } = req.query;
    const userId = req.user._id;

    // Check if chat room exists and user is participant
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: "غرفة الدردشة غير موجودة" });
    }

    const isParticipant = chatRoom.participants.some(
      p => p.user.toString() === userId.toString()
    );

    if (!isParticipant && req.user.role !== "admin") {
      return res.status(403).json({ message: "غير مسموح لك بالبحث في هذه الغرفة" });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const searchRegex = new RegExp(query, 'i');

    const [messages, total] = await Promise.all([
      Message.find({
        chatRoom: roomId,
        isDeleted: false,
        content: searchRegex,
      })
        .populate("sender", "name email role avatar")
        .populate({
          path: 'replyTo',
          select: 'content sender',
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments({
        chatRoom: roomId,
        isDeleted: false,
        content: searchRegex,
      }),
    ]);

    res.json({
      data: messages,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "معرف الغرفة غير صحيح" });
    }
    next(error);
  }
};

module.exports = {
  sendMessage,
  getMessagesByRoom,
  markMessageAsRead,
  getUnreadMessagesCount,
  updateMessage,
  deleteMessage,
  toggleReaction,
  searchMessages,
};