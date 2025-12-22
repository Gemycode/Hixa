const ChatRoom = require("../models/chatRoomModel");
const ProjectRoom = require("../models/projectRoomModel");
const Project = require("../models/projectModel");
const Message = require("../models/messageModel");
const mongoose = require("mongoose");

// Get all chat rooms within a project room
const getChatRoomsByProjectRoom = async (req, res) => {
  try {
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
      // In a complete implementation, you'd check against proposals
      return res.status(403).json({ message: "غير مسموح لك بالوصول إلى هذه الغرفة" });
    }
    // Admins can access all project rooms

    let chatRoomQuery = { projectRoom: roomId };

    // Filter chat rooms based on user role and permissions
    if (userRole === "client") {
      // Clients see only chat rooms they are participants in
      chatRoomQuery = {
        projectRoom: roomId,
        "participants.user": userId,
      };
    } else if (userRole === "engineer") {
      // Engineers see only chat rooms they are participants in
      chatRoomQuery = {
        projectRoom: roomId,
        "participants.user": userId,
      };
    }
    // Admins see all chat rooms (no additional filter needed)

    const chatRooms = await ChatRoom.find(chatRoomQuery)
      .populate("participants.user", "name email role")
      .populate("engineer", "name")
      .populate("lastMessage.sender", "name")
      .sort({ createdAt: -1 });

    res.json({ data: chatRooms });
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
      .populate("participants.user", "name email role")
      .populate("engineer", "name")
      .populate("lastMessage.sender", "name");

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

    res.json({ data: chatRoom });
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

    const chatRooms = await ChatRoom.find({ "participants.user": userId })
      .populate("projectRoom", "project projectTitle")
      .populate("project", "title")
      .populate("participants.user", "name email role")
      .populate("engineer", "name")
      .populate("lastMessage.sender", "name")
      .sort({ "lastMessage.createdAt": -1, createdAt: -1 });

    res.json({ data: chatRooms });
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

module.exports = {
  getChatRoomsByProjectRoom,
  getChatRoomById,
  getMyChatRooms,
  createChatRoom,
};