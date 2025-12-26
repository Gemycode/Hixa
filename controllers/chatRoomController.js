const ChatRoom = require("../models/chatRoomModel");
const ProjectRoom = require("../models/projectRoomModel");
const Project = require("../models/projectModel");
const Message = require("../models/messageModel");
const Proposal = require("../models/proposalModel");
const mongoose = require("mongoose");
const {
  addUnreadCountToChatRooms,
  addUnreadCountToChatRoom,
  updateLastReadAt,
} = require("../utils/chatHelpers");

// Get all chat rooms within a project room
const getChatRoomsByProjectRoom = async (req, res) => {
  try {
    console.log('📥 getChatRoomsByProjectRoom called - roomId:', req.params.roomId, 'userId:', req.user._id, 'role:', req.user.role);
    const { roomId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Check if project room exists
    const projectRoom = await ProjectRoom.findById(roomId);
    if (!projectRoom) {
      return res.status(404).json({ message: "غرفة المشروع غير موجودة" });
    }

    // Check permissions based on project room
    if (userRole === "client") {
      const project = await Project.findById(projectRoom.project);
      if (!project || project.client.toString() !== userId.toString()) {
        return res.status(403).json({ message: "غير مسموح لك بالوصول إلى هذه الغرفة" });
      }
    } else if (userRole === "engineer") {
      // Check if engineer has submitted proposal for this project
      const hasProposal = await Proposal.findOne({
        project: projectRoom.project,
        engineer: userId,
      });
      if (!hasProposal) {
        return res.status(403).json({ message: "غير مسموح لك بالوصول إلى هذه الغرفة" });
      }
    }
    // Admins can access all project rooms

    let chatRoomQuery = { projectRoom: roomId, status: "active" }; // Only show active rooms

    // Filter chat rooms based on user role and permissions
    if (userRole === "client") {
      // Clients see only chat rooms they are participants in
      chatRoomQuery = {
        projectRoom: roomId,
        "participants.user": userId,
        status: "active",
      };
    } else if (userRole === "engineer") {
      // Engineers see only chat rooms they are participants in OR where they are the engineer
      // This handles both cases: when engineer is in participants array, or when engineer field matches
      chatRoomQuery = {
        $or: [
          { projectRoom: roomId, "participants.user": userId, status: "active" },
          { projectRoom: roomId, engineer: userId, status: "active" },
        ],
      };
    }
    // Admins see all active chat rooms (no additional filter needed)

    const chatRooms = await ChatRoom.find(chatRoomQuery)
      .populate("participants.user", "name email role avatar")
      .populate("engineer", "name avatar")
      .populate("lastMessage.sender", "name avatar")
      .sort({ createdAt: -1 });

    // Add unread count to each chat room
    const chatRoomsWithUnread = await addUnreadCountToChatRooms(chatRooms, userId);

    res.json({ data: chatRoomsWithUnread });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "معرف الغرفة غير صحيح" });
    }
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Get chat room by ID
const getChatRoomById = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const chatRoom = await ChatRoom.findById(roomId)
      .populate("participants.user", "name email role avatar")
      .populate("engineer", "name avatar")
      .populate("lastMessage.sender", "name avatar");

    if (!chatRoom) {
      return res.status(404).json({ message: "غرفة الدردشة غير موجودة" });
    }

    // Check if user is participant in this chat room
    const isParticipant = chatRoom.participants.some(
      participant => participant.user.toString() === userId.toString()
    );

    if (!isParticipant) {
      // Admins can access all chat rooms
      if (userRole !== "admin") {
        return res.status(403).json({ message: "غير مسموح لك بالوصول إلى هذه الغرفة" });
      }
    }

    // Add unread count
    const chatRoomWithUnread = await addUnreadCountToChatRoom(chatRoom, userId);

    res.json({ data: chatRoomWithUnread });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "معرف الغرفة غير صحيح" });
    }
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Get user's chat rooms across all projects
const getMyChatRooms = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { type, status: statusFilter, search } = req.query;

    let chatRoomQuery = { "participants.user": userId, status: "active" };

    // For engineers, also include rooms where they are the engineer (even if not in participants yet)
    if (userRole === "engineer") {
      chatRoomQuery = {
        $or: [
          { "participants.user": userId, status: "active" },
          { engineer: userId, status: "active" },
        ],
      };
    }

    // Filter by type
    if (type && ["admin-engineer", "admin-client", "group"].includes(type)) {
      if (chatRoomQuery.$or) {
        chatRoomQuery.$or = chatRoomQuery.$or.map(condition => ({ ...condition, type }));
      } else {
        chatRoomQuery.type = type;
      }
    }

    // Filter by status (if admin wants to see archived)
    if (statusFilter && statusFilter === "archived" && userRole === "admin") {
      if (chatRoomQuery.$or) {
        chatRoomQuery.$or = chatRoomQuery.$or.map(condition => ({ ...condition, status: "archived" }));
      } else {
        chatRoomQuery.status = "archived";
      }
    }

    const chatRooms = await ChatRoom.find(chatRoomQuery)
      .populate("projectRoom", "project projectTitle")
      .populate("project", "title status")
      .populate("participants.user", "name email role avatar")
      .populate("engineer", "name email role avatar")
      .populate("lastMessage.sender", "name avatar");

    // Filter by search if provided
    let filteredChatRooms = chatRooms;
    if (search) {
      const searchRegex = new RegExp(search, "i");
      filteredChatRooms = chatRooms.filter(room => {
        // Search in project title, participant names, or last message content
        const projectTitleMatch = room.project?.title?.match(searchRegex);
        const participantNamesMatch = room.participants.some(p => 
          p.user?.name?.match(searchRegex) || p.user?.email?.match(searchRegex)
        );
        const lastMessageMatch = room.lastMessage?.content?.match(searchRegex);
        return projectTitleMatch || participantNamesMatch || lastMessageMatch;
      });
    }

    // Sort: rooms with lastMessage first (by lastMessage date), then by createdAt
    filteredChatRooms.sort((a, b) => {
      const aDate = a.lastMessage?.createdAt || a.createdAt;
      const bDate = b.lastMessage?.createdAt || b.createdAt;
      return new Date(bDate) - new Date(aDate);
    });

    // Add unread count to each chat room
    const chatRoomsWithUnread = await addUnreadCountToChatRooms(filteredChatRooms, userId);

    res.json({ data: chatRoomsWithUnread });
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Create a new chat room (admin only)
const createChatRoom = async (req, res) => {
  try {
    const { project, projectRoom, type, engineer } = req.body;

    const chatRoom = await ChatRoom.create({
      project,
      projectRoom,
      type,
      engineer: type === "admin-engineer" ? engineer : undefined,
      participants: [], // Will be populated when messages are sent
    });

    res.status(201).json({
      message: "تم إنشاء غرفة الدردشة بنجاح",
      data: chatRoom,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "غرفة الدردشة موجودة بالفعل" });
    }
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Archive chat room
const archiveChatRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: "غرفة الدردشة غير موجودة" });
    }

    // Only admin can archive chat rooms
    if (userRole !== "admin") {
      return res.status(403).json({ message: "الأرشفة متاحة للأدمن فقط" });
    }

    chatRoom.status = "archived";
    await chatRoom.save();

    res.json({
      message: "تم أرشفة الغرفة بنجاح",
      data: chatRoom,
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Unarchive chat room
const unarchiveChatRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: "غرفة الدردشة غير موجودة" });
    }

    // Only admin can unarchive chat rooms
    if (userRole !== "admin") {
      return res.status(403).json({ message: "إلغاء الأرشفة متاح للأدمن فقط" });
    }

    chatRoom.status = "active";
    await chatRoom.save();

    res.json({
      message: "تم إلغاء أرشفة الغرفة بنجاح",
      data: chatRoom,
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Delete chat room (soft delete - Admin only)
const deleteChatRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userRole = req.user.role;

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: "غرفة الدردشة غير موجودة" });
    }

    // Only admin can delete chat rooms
    if (userRole !== "admin") {
      return res.status(403).json({ message: "الحذف متاح للأدمن فقط" });
    }

    // Soft delete - set status to archived
    chatRoom.status = "archived";
    await chatRoom.save();

    res.json({
      message: "تم حذف الغرفة بنجاح",
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Add participant to chat room (Admin only)
const addParticipant = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, role } = req.body;
    const userRole = req.user.role;

    if (userRole !== "admin") {
      return res.status(403).json({ message: "إضافة المشاركين متاحة للأدمن فقط" });
    }

    if (!userId || !role) {
      return res.status(400).json({ message: "معرف المستخدم والدور مطلوبان" });
    }

    if (!["admin", "engineer", "client"].includes(role)) {
      return res.status(400).json({ message: "الدور غير صحيح" });
    }

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: "غرفة الدردشة غير موجودة" });
    }

    // Check if user is already a participant
    const isAlreadyParticipant = chatRoom.participants.some(
      p => p.user.toString() === userId.toString()
    );

    if (isAlreadyParticipant) {
      return res.status(400).json({ message: "المستخدم مشارك بالفعل في هذه الغرفة" });
    }

    // Add participant
    chatRoom.participants.push({
      user: userId,
      role,
      joinedAt: new Date(),
    });

    await chatRoom.save();

    const populatedChatRoom = await ChatRoom.findById(roomId)
      .populate("participants.user", "name email role avatar");

    res.json({
      message: "تم إضافة المشارك بنجاح",
      data: populatedChatRoom,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "معرف غير صحيح" });
    }
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Remove participant from chat room (Admin only)
const removeParticipant = async (req, res) => {
  try {
    const { roomId, participantId } = req.params;
    const userRole = req.user.role;

    if (userRole !== "admin") {
      return res.status(403).json({ message: "إزالة المشاركين متاحة للأدمن فقط" });
    }

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: "غرفة الدردشة غير موجودة" });
    }

    // Remove participant
    chatRoom.participants = chatRoom.participants.filter(
      p => p.user.toString() !== participantId.toString()
    );

    await chatRoom.save();

    const populatedChatRoom = await ChatRoom.findById(roomId)
      .populate("participants.user", "name email role avatar");

    res.json({
      message: "تم إزالة المشارك بنجاح",
      data: populatedChatRoom,
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Get unread count for a specific chat room
const getChatRoomUnreadCount = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: "غرفة الدردشة غير موجودة" });
    }

    // Check if user is participant
    const isParticipant = chatRoom.participants.some(
      p => p.user.toString() === userId.toString()
    );

    if (!isParticipant && req.user.role !== "admin") {
      return res.status(403).json({ message: "غير مسموح لك بالوصول إلى هذه الغرفة" });
    }

    const { calculateUnreadCountForChatRoom } = require("../utils/chatHelpers");
    const unreadCount = await calculateUnreadCountForChatRoom(roomId, userId);

    res.json({
      data: {
        chatRoomId: roomId,
        unreadCount,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Mark chat room as read (update lastReadAt)
const markChatRoomAsRead = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: "غرفة الدردشة غير موجودة" });
    }

    // Check if user is participant
    const isParticipant = chatRoom.participants.some(
      p => p.user.toString() === userId.toString()
    );

    if (!isParticipant && req.user.role !== "admin") {
      return res.status(403).json({ message: "غير مسموح لك بالوصول إلى هذه الغرفة" });
    }

    // Update lastReadAt
    await updateLastReadAt(roomId, userId);

    res.json({
      message: "تم تحديث حالة القراءة بنجاح",
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Get chat room statistics (Admin only)
const getChatRoomStatistics = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== "admin") {
      return res.status(403).json({ message: "الإحصائيات متاحة للأدمن فقط" });
    }

    const [total, active, archived, adminEngineer, adminClient, group] = await Promise.all([
      ChatRoom.countDocuments({}),
      ChatRoom.countDocuments({ status: "active" }),
      ChatRoom.countDocuments({ status: "archived" }),
      ChatRoom.countDocuments({ type: "admin-engineer", status: "active" }),
      ChatRoom.countDocuments({ type: "admin-client", status: "active" }),
      ChatRoom.countDocuments({ type: "group", status: "active" }),
    ]);

    res.json({
      data: {
        total,
        active,
        archived,
        byType: {
          adminEngineer,
          adminClient,
          group,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

module.exports = {
  getChatRoomsByProjectRoom,
  getChatRoomById,
  getMyChatRooms,
  createChatRoom,
  archiveChatRoom,
  unarchiveChatRoom,
  deleteChatRoom,
  addParticipant,
  removeParticipant,
  getChatRoomUnreadCount,
  markChatRoomAsRead,
  getChatRoomStatistics,
};