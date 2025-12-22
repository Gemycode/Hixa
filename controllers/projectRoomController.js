const ProjectRoom = require("../models/projectRoomModel");
const Project = require("../models/projectModel");
const ChatRoom = require("../models/chatRoomModel");
const mongoose = require("mongoose");

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
      // This would require joining with Proposal model, but for now we'll return empty
      // In a complete implementation, you'd need to join with proposals
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

    res.json({
      data: projectRooms,
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
      // In a complete implementation, you'd check against proposals
      return res.status(403).json({ message: "غير مسموح لك بالوصول إلى هذه الغرفة" });
    }
    // Admins can access all project rooms

    res.json({ data: projectRoom });
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

    res.json({ data: projectRoom });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ message: "معرف المشروع غير صحيح" });
    }
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

module.exports = {
  getProjectRooms,
  getProjectRoomById,
  getProjectRoomByProjectId,
};