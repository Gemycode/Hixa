const Message = require("../models/messageModel");
const ChatRoom = require("../models/chatRoomModel");
const ProjectRoom = require("../models/projectRoomModel");
const User = require("../models/userModel");
const mongoose = require("mongoose");
const { getWebSocketServer } = require('../websocket/websocket');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
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
          const result = await uploadToCloudinary(file.path);
          return {
            url: result.secure_url,
            type: file.mimetype.split('/')[0], // 'image', 'video', etc.
            name: file.originalname,
            size: file.size,
            publicId: result.public_id,
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
    await newMessage
      .populate('sender', 'name email role avatar')
      .populate({
        path: 'replyTo',
        select: 'content sender',
        populate: {
          path: 'sender',
          select: 'name avatar',
        },
      })
      .execPopulate();

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
    
    // Cleanup uploaded files if any error occurred
    if (req.files && req.files.length > 0) {
      await Promise.all(
        req.files.map(file => {
          if (file.path) {
            const fs = require('fs');
            fs.unlink(file.path, () => {});
          }
        })
      );
    }
    
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
      Message.find({ chatRoom: roomId })
        .populate("sender", "name email role avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Message.countDocuments({ chatRoom: roomId }),
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
          createdAt: { 
            $gt: participant.lastReadAt || new Date(0) 
          },
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

module.exports = {
  sendMessage,
  getMessagesByRoom,
  markMessageAsRead,
  getUnreadMessagesCount,
};