const ProjectRoom = require("../models/projectRoomModel");
const Project = require("../models/projectModel");
const ChatRoom = require("../models/chatRoomModel");
const Proposal = require("../models/proposalModel");
const mongoose = require("mongoose");
const {
  addUnreadCountToProjectRooms,
  addUnreadCountToProjectRoom,
} = require("../utils/chatHelpers");

// Get all project rooms for dashboard
const getProjectRooms = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    let projectRoomQuery = {};

    // Filter based on user role
    if (userRole === "client") {
      // Clients see only project rooms for their projects
      const clientProjects = await Project.find({ client: userId }).select("_id");
      const projectIds = clientProjects.map(project => project._id);
      projectRoomQuery = { "project": { $in: projectIds } };
    } else if (userRole === "engineer") {
      // Engineers see only project rooms for projects they've submitted proposals to
      const engineerProposals = await Proposal.find({ engineer: userId }).select("project");
      const projectIds = engineerProposals.map(prop => prop.project);
      
      if (projectIds.length === 0) {
        return res.json({
          data: [],
          meta: {
            total: 0,
            page: 1,
            limit: 10,
            pages: 1,
          },
        });
      }
      
      projectRoomQuery = { "project": { $in: projectIds } };
    }
    // Admins see all project rooms (no filter needed)

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const [projectRooms, total] = await Promise.all([
      ProjectRoom.find(projectRoomQuery)
        .populate("project", "title status")
        .sort({ lastActivityAt: -1 })
        .skip(skip)
        .limit(limit),
      ProjectRoom.countDocuments(projectRoomQuery),
    ]);

    // Add unread count to each project room
    const projectRoomsWithUnread = await addUnreadCountToProjectRooms(projectRooms, userId);

    res.json({
      data: projectRoomsWithUnread,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Get project room by ID
const getProjectRoomById = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const projectRoom = await ProjectRoom.findById(roomId)
      .populate("project", "title status");

    if (!projectRoom) {
      return res.status(404).json({ message: "غرفة المشروع غير موجودة" });
    }

    // Check permissions
    if (userRole === "client") {
      const project = await Project.findById(projectRoom.project);
      if (!project || project.client.toString() !== userId.toString()) {
        return res.status(403).json({ message: "غير مسموح لك بالوصول إلى هذه الغرفة" });
      }
    } else if (userRole === "engineer") {
      // Check if engineer has submitted proposal for this project
      const project = await Project.findById(projectRoom.project);
      if (!project) {
        return res.status(404).json({ message: "المشروع غير موجود" });
      }
      
      const hasProposal = await Proposal.findOne({
        project: projectRoom.project,
        engineer: userId,
      });
      
      if (!hasProposal) {
        return res.status(403).json({ message: "غير مسموح لك بالوصول إلى هذه الغرفة" });
      }
    }
    // Admins can access all project rooms

    // Add unread count
    const projectRoomWithUnread = await addUnreadCountToProjectRoom(projectRoom, userId);

    res.json({ data: projectRoomWithUnread });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "معرف الغرفة غير صحيح" });
    }
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Get project room by project ID
const getProjectRoomByProjectId = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const projectRoom = await ProjectRoom.findOne({ project: projectId })
      .populate("project", "title status");

    if (!projectRoom) {
      return res.status(404).json({ message: "غرفة المشروع غير موجودة" });
    }

    // Check permissions
    if (userRole === "client") {
      const project = await Project.findById(projectId);
      if (!project || project.client.toString() !== userId.toString()) {
        return res.status(403).json({ message: "غير مسموح لك بالوصول إلى هذه الغرفة" });
      }
    } else if (userRole === "engineer") {
      // Check if engineer has submitted proposal for this project
      const hasProposal = await Proposal.findOne({
        project: projectId,
        engineer: userId,
      });
      
      if (!hasProposal) {
        return res.status(403).json({ message: "غير مسموح لك بالوصول إلى هذه الغرفة" });
      }
    }
    // Admins can access all project rooms

    // Add unread count
    const projectRoomWithUnread = await addUnreadCountToProjectRoom(projectRoom, userId);

    res.json({ data: projectRoomWithUnread });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "معرف المشروع غير صحيح" });
    }
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Close project room (Admin only)
const closeProjectRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userRole = req.user.role;

    if (userRole !== "admin") {
      return res.status(403).json({ message: "الإغلاق متاح للأدمن فقط" });
    }

    const projectRoom = await ProjectRoom.findById(roomId);
    if (!projectRoom) {
      return res.status(404).json({ message: "غرفة المشروع غير موجودة" });
    }

    projectRoom.status = "closed";
    projectRoom.closedAt = new Date();
    await projectRoom.save();

    res.json({
      message: "تم إغلاق غرفة المشروع بنجاح",
      data: projectRoom,
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Reopen project room (Admin only)
const reopenProjectRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userRole = req.user.role;

    if (userRole !== "admin") {
      return res.status(403).json({ message: "إعادة الفتح متاحة للأدمن فقط" });
    }

    const projectRoom = await ProjectRoom.findById(roomId);
    if (!projectRoom) {
      return res.status(404).json({ message: "غرفة المشروع غير موجودة" });
    }

    projectRoom.status = "active";
    projectRoom.closedAt = undefined;
    await projectRoom.save();

    res.json({
      message: "تم إعادة فتح غرفة المشروع بنجاح",
      data: projectRoom,
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Get unread count for a project room
const getProjectRoomUnreadCount = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const projectRoom = await ProjectRoom.findById(roomId);
    if (!projectRoom) {
      return res.status(404).json({ message: "غرفة المشروع غير موجودة" });
    }

    // Check permissions
    const userRole = req.user.role;
    if (userRole === "client") {
      const project = await Project.findById(projectRoom.project);
      if (!project || project.client.toString() !== userId.toString()) {
        return res.status(403).json({ message: "غير مسموح لك بالوصول إلى هذه الغرفة" });
      }
    } else if (userRole === "engineer") {
      const hasProposal = await Proposal.findOne({
        project: projectRoom.project,
        engineer: userId,
      });
      if (!hasProposal) {
        return res.status(403).json({ message: "غير مسموح لك بالوصول إلى هذه الغرفة" });
      }
    }

    const { calculateUnreadCountForProjectRoom } = require("../utils/chatHelpers");
    const unreadCount = await calculateUnreadCountForProjectRoom(roomId, userId);

    res.json({
      data: {
        projectRoomId: roomId,
        unreadCount,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Get project room statistics (Admin only)
const getProjectRoomStatistics = async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== "admin") {
      return res.status(403).json({ message: "الإحصائيات متاحة للأدمن فقط" });
    }

    const [total, active, closed] = await Promise.all([
      ProjectRoom.countDocuments({}),
      ProjectRoom.countDocuments({ status: "active" }),
      ProjectRoom.countDocuments({ status: "closed" }),
    ]);

    res.json({
      data: {
        total,
        active,
        closed,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

module.exports = {
  getProjectRooms,
  getProjectRoomById,
  getProjectRoomByProjectId,
  closeProjectRoom,
  reopenProjectRoom,
  getProjectRoomUnreadCount,
  getProjectRoomStatistics,
};