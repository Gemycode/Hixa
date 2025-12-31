const Message = require("../models/messageModel");
const ChatRoom = require("../models/chatRoomModel");
const ProjectRoom = require("../models/projectRoomModel");
const User = require("../models/userModel");
const mongoose = require("mongoose");
const { getIO } = require('../socket');
const { uploadFileToCloudinary } = require('../middleware/upload');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');
const { createNotification } = require('./notificationController');
const { getSystemUserId } = require('../utils/systemUser');

// Send a new message with support for attachments, replies, and reactions
const sendMessage = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Handle both JSON and FormData requests
    const chatRoomId = req.body.chatRoomId;
    const content = req.body.content || '';
    const type = req.body.type || (req.files && req.files.length > 0 ? 'file' : 'text');
    const attachments = req.body.attachments || [];
    const replyTo = req.body.replyTo;
    const senderId = req.user._id;

    console.log('📤 sendMessage called:', {
      chatRoomId,
      chatRoomIdType: typeof chatRoomId,
      content: content?.substring(0, 50),
      type,
      hasFiles: !!(req.files && req.files.length > 0),
      filesCount: req.files ? req.files.length : 0,
      senderId
    });
    
    // Validate: must have either content or files
    if (!content.trim() && (!req.files || req.files.length === 0)) {
      throw new BadRequestError('يجب إرسال محتوى نصي أو ملف على الأقل');
    }

    // Convert chatRoomId to ObjectId if it's a string
    const chatRoomObjectId = mongoose.Types.ObjectId.isValid(chatRoomId) 
      ? new mongoose.Types.ObjectId(chatRoomId) 
      : chatRoomId;

    // Validate chat room exists and user is a participant
    const chatRoom = await ChatRoom.findById(chatRoomObjectId).session(session);
    if (!chatRoom) {
      throw new NotFoundError('غرفة الدردشة غير موجودة');
    }

    const isParticipant = chatRoom.participants.some(
      p => p.user.toString() === senderId.toString()
    );

    // For engineers and companies, also check if they are the engineer/company in the chat room
    const isEngineerOrCompany = (req.user.role === 'engineer' || req.user.role === 'company') &&
      chatRoom.engineer &&
      chatRoom.engineer.toString() === senderId.toString();

    // If engineer/company is in engineer field but not in participants, add them
    if (isEngineerOrCompany && !isParticipant) {
      console.log('➕ Adding engineer/company to participants:', senderId);
      chatRoom.participants.push({
        user: senderId,
        role: req.user.role, // "engineer" or "company"
        joinedAt: new Date(),
      });
      await chatRoom.save({ session });
      console.log('✅ Engineer/company added to participants');
    }

    if (!isParticipant && !isEngineerOrCompany && req.user.role !== 'admin') {
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
      chatRoom: chatRoomObjectId, // Use ObjectId instead of string
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

    console.log('📝 Creating message in database...');
    console.log('📝 Message data:', {
      chatRoom: chatRoomId,
      chatRoomObjectId: chatRoomObjectId.toString(),
      sender: senderId,
      content: content?.substring(0, 50),
      type,
      attachmentsCount: [...attachments, ...uploadedAttachments].length
    });
    
    // Verify chatRoom exists before creating message
    console.log('📝 Verifying chatRoom exists...');
    const verifyChatRoom = await ChatRoom.findById(chatRoomObjectId).session(session);
    if (!verifyChatRoom) {
      throw new NotFoundError('Chat room not found for message creation');
    }
    console.log('✅ ChatRoom verified:', verifyChatRoom._id.toString());
    
    // Check if there are existing messages before creating new one
    const existingMessagesCount = await Message.countDocuments({ 
      chatRoom: chatRoomObjectId 
    }).session(session);
    console.log('📝 Existing messages count before create (all):', existingMessagesCount);
    
    // Also check non-deleted messages
    const existingNonDeletedCount = await Message.countDocuments({ 
      chatRoom: chatRoomObjectId,
      isDeleted: false
    }).session(session);
    console.log('📝 Existing non-deleted messages count before create:', existingNonDeletedCount);
    
    // Get last few messages to verify they exist
    const lastMessages = await Message.find({ 
      chatRoom: chatRoomObjectId 
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('_id createdAt content isDeleted')
    .session(session)
    .lean();
    console.log('📝 Last 5 messages before create:', lastMessages.map(m => ({
      id: m._id.toString(),
      createdAt: m.createdAt,
      content: m.content?.substring(0, 30),
      isDeleted: m.isDeleted
    })));

    const message = await Message.create([messageData], { session });
    const newMessage = message[0];
    
    console.log('✅ Message created in DB:', {
      messageId: newMessage._id.toString(),
      chatRoom: newMessage.chatRoom.toString(),
      chatRoomType: typeof newMessage.chatRoom,
      sender: newMessage.sender.toString(),
      createdAt: newMessage.createdAt
    });
    
    // Verify message was actually saved and count increased
    const messagesCountAfter = await Message.countDocuments({ 
      chatRoom: chatRoomObjectId 
    }).session(session);
    console.log('📝 Messages count after create (all):', messagesCountAfter);
    
    const nonDeletedCountAfter = await Message.countDocuments({ 
      chatRoom: chatRoomObjectId,
      isDeleted: false
    }).session(session);
    console.log('📝 Non-deleted messages count after create:', nonDeletedCountAfter);
    
    // Get last few messages after create to verify
    const lastMessagesAfter = await Message.find({ 
      chatRoom: chatRoomObjectId 
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('_id createdAt content isDeleted')
    .session(session)
    .lean();
    console.log('📝 Last 5 messages after create:', lastMessagesAfter.map(m => ({
      id: m._id.toString(),
      createdAt: m.createdAt,
      content: m.content?.substring(0, 30),
      isDeleted: m.isDeleted
    })));
    
    if (messagesCountAfter <= existingMessagesCount) {
      console.error('❌ WARNING: Message count did not increase! Message may have replaced existing one.');
      console.error('❌ Existing count:', existingMessagesCount, 'After count:', messagesCountAfter);
    }
    
    // Verify message was actually saved
    const verifyMessage = await Message.findById(newMessage._id).session(session);
    if (!verifyMessage) {
      console.error('❌ Message was not saved to database!');
      throw new Error('Message creation failed');
    }
    console.log('✅ Message verified in DB:', verifyMessage._id.toString());

    // Update chat room's last message
    chatRoom.lastMessage = {
      content: content ? content.substring(0, 100) : 'مرفق',
      sender: senderId,
      messageId: newMessage._id,
      createdAt: newMessage.createdAt,
    };
    await chatRoom.save({ session });
    console.log('✅ Chat room lastMessage updated');

    // Update project room's last activity if applicable
    if (chatRoom.projectRoom) {
      await ProjectRoom.findByIdAndUpdate(
        chatRoom.projectRoom,
        { lastActivityAt: newMessage.createdAt },
        { session }
      );
      console.log('✅ Project room lastActivityAt updated');
    }

    console.log('📝 Committing transaction...');
    await session.commitTransaction();
    session.endSession();
    console.log('✅ Transaction committed successfully');

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

    // Emit real-time message via Socket.io
    try {
      const io = getIO();
      const roomId = chatRoomObjectId.toString();
      console.log('📡 Emitting new_message to room:', roomId);
      console.log('📡 Message data:', {
        messageId: newMessage._id,
        chatRoomId: roomId,
        sender: newMessage.sender?._id || newMessage.sender,
        content: newMessage.content?.substring(0, 50)
      });
      io.to(roomId).emit('new_message', {
        message: newMessage,
        chatRoomId: roomId,
      });
      console.log('✅ new_message event emitted successfully');
    } catch (error) {
      console.error('❌ Error emitting new_message via Socket.io:', error);
      // Don't fail the request if Socket.io fails
    }

    // Create notifications for participants (except sender) about the new message
    const senderName = req.user.name || 'مجهول';
    const notificationPromises = chatRoom.participants
      .filter(participant => participant.user.toString() !== senderId.toString())
      .map(async (participant) => {
        try {
          await createNotification({
            user: participant.user,
            type: 'message_received',
            title: 'رسالة جديدة',
            message: `${senderName}: ${content ? content.substring(0, 100) : 'مرفق'}`,
            data: {
              chatRoomId: chatRoom._id,
              messageId: newMessage._id,
            },
            actionUrl: `/chat/${chatRoom._id}`,
          });
        } catch (error) {
          console.error('Error creating notification:', error);
        }
      });

    // Run notifications in parallel (don't await to avoid blocking)
    Promise.all(notificationPromises).catch(err => 
      console.error('Error creating notifications:', err)
    );

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
    console.log('📥 getMessagesByRoom called:', req.params.roomId);
    const { roomId } = req.params;
    const userId = req.user._id;

    // Check if chat room exists and user is participant
    console.log('📥 Finding chat room:', roomId);
    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      console.log('❌ Chat room not found:', roomId);
      return res.status(404).json({ message: "غرفة الدردشة غير موجودة" });
    }
    console.log('✅ Chat room found');

    // Check if user is participant in this chat room
    const isParticipant = chatRoom.participants.some(
      participant => participant.user.toString() === userId.toString()
    );

    // Admins can access all chat rooms
    if (!isParticipant && req.user.role !== "admin") {
      console.log('❌ User not participant and not admin');
      return res.status(403).json({ message: "غير مسموح لك بالوصول إلى هذه الغرفة" });
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    console.log('📥 Fetching messages from DB...');
    console.log('📥 Query params:', { roomId, page, limit, skip, isDeleted: false });
    console.log('📥 roomId type:', typeof roomId, 'value:', roomId);
    
    // Convert roomId to ObjectId if it's a string
    const chatRoomObjectId = mongoose.Types.ObjectId.isValid(roomId) 
      ? new mongoose.Types.ObjectId(roomId) 
      : roomId;
    
    console.log('📥 Using chatRoomObjectId:', chatRoomObjectId.toString());
    
    // Check all messages in DB to see what chatRoomIds exist
    try {
      const allMessagesSample = await Message.find({}).limit(10).select('chatRoom createdAt content isDeleted').lean();
      console.log('📥 Sample messages from DB:', allMessagesSample.map(m => ({
        chatRoom: m.chatRoom?.toString(),
        createdAt: m.createdAt,
        content: m.content?.substring(0, 30),
        isDeleted: m.isDeleted
      })));
      
      // Check ALL messages for this specific chatRoom (including deleted)
      const allMessagesForRoom = await Message.find({ 
        chatRoom: chatRoomObjectId 
      }).select('_id createdAt content isDeleted sender').lean();
      console.log('📥 ALL messages for this chatRoom (including deleted):', allMessagesForRoom.length);
      console.log('📥 Messages details:', allMessagesForRoom.map(m => ({
        id: m._id.toString(),
        createdAt: m.createdAt,
        content: m.content?.substring(0, 30),
        isDeleted: m.isDeleted,
        sender: m.sender?.toString()
      })));
      
      // Check non-deleted messages
      const nonDeletedMessages = allMessagesForRoom.filter(m => !m.isDeleted);
      console.log('📥 Non-deleted messages:', nonDeletedMessages.length);
    } catch (sampleError) {
      console.error('❌ Error getting sample messages:', sampleError);
    }
    
    const queryStart = Date.now();
    console.log('📥 Starting database query...');
    
    // First, check if there are any messages at all for this chat room (simple query)
    try {
      const totalMessagesCount = await Message.countDocuments({ 
        chatRoom: chatRoomObjectId 
      });
      console.log('📥 Total messages in DB (including deleted):', totalMessagesCount);
      
      const nonDeletedCount = await Message.countDocuments({ 
        chatRoom: chatRoomObjectId, 
        isDeleted: false 
      });
      console.log('📥 Non-deleted messages in DB:', nonDeletedCount);
      
      // Also check with string comparison
      const stringCount = await Message.countDocuments({ 
        chatRoom: roomId.toString()
      });
      console.log('📥 Messages with string chatRoomId:', stringCount);
    } catch (countError) {
      console.error('❌ Error counting messages:', countError);
    }
    
    // Simplify query - only populate sender, skip nested populate for now
    console.log('📥 Executing main query...');
    
    // Add timeout protection for the query
    const queryPromise = Message.find({ 
      chatRoom: chatRoomObjectId, 
      isDeleted: false 
    })
        .populate("sender", "name email role avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
      .limit(limit)
      .lean(); // Use lean() for better performance
    
    const countPromise = Message.countDocuments({ 
      chatRoom: chatRoomObjectId, 
      isDeleted: false 
    });
    
    // Add timeout (5 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 5000);
    });
    
    const [messages, total] = await Promise.race([
      Promise.all([queryPromise, countPromise]),
      timeoutPromise
    ]).catch((error) => {
      console.error('❌ Query timeout or error:', error);
      // Return empty results if query fails
      return [[], 0];
    });
    
    const queryTime = Date.now() - queryStart;
    console.log(`✅ Messages fetched from DB in ${queryTime}ms:`, messages.length);
    console.log(`✅ Total messages count:`, total);

    // Reverse messages to show oldest first
    const reversedMessages = messages.reverse();

    console.log('📤 Sending messages response:', {
      chatRoomId: roomId,
      messagesCount: reversedMessages.length,
      total,
      page,
      limit
    });

    res.json({
      data: reversedMessages,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
    console.log('✅ Response sent successfully');
  } catch (error) {
    console.error('❌ Error in getMessagesByRoom:', error);
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

    // Update participant's lastReadAt in chat room (use helper function)
    const { updateLastReadAt } = require("../utils/chatHelpers");
    await updateLastReadAt(message.chatRoom.toString(), userId);

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

    // Emit update via Socket.io
    try {
      const io = getIO();
      io.to(message.chatRoom.toString()).emit('message_updated', {
        message: message,
        chatRoomId: message.chatRoom.toString(),
      });
    } catch (wsError) {
      console.error('Socket.io error:', wsError);
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

    // Emit delete via Socket.io
    try {
      const io = getIO();
      io.to(message.chatRoom.toString()).emit('message_deleted', {
        messageId: message._id.toString(),
        chatRoomId: message.chatRoom.toString(),
      });
    } catch (wsError) {
      console.error('Socket.io error:', wsError);
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

    // Emit reaction update via Socket.io
    try {
      const io = getIO();
      io.to(message.chatRoom.toString()).emit('reaction_updated', {
        message: message,
        chatRoomId: message.chatRoom.toString(),
      });
    } catch (wsError) {
      console.error('Socket.io error:', wsError);
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