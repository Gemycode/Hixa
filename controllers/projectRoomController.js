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
    let projectIds = []; // Store project IDs for verification later

    // Filter based on user role
    if (userRole === "client") {
      // Clients see only project rooms for their projects
      const clientProjects = await Project.find({ client: userId }).select("_id");
      projectIds = clientProjects.map(project => project._id);
      projectRoomQuery = { "project": { $in: projectIds } };
    } else if (userRole === "engineer" || userRole === "company") {
      // Engineers and companies see only project rooms for projects they've submitted proposals to
      console.log(`🔍 Filtering project rooms for ${userRole} with userId:`, userId);
      console.log(`🔍 UserId type:`, typeof userId, userId.constructor.name);
      console.log(`🔍 UserId string:`, userId.toString());
      
      // Ensure userId is ObjectId
      const userIdObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? (userId instanceof mongoose.Types.ObjectId ? userId : new mongoose.Types.ObjectId(userId))
        : userId;
      
      console.log(`🔍 UserId ObjectId:`, userIdObjectId.toString());
      
      // Try multiple query strategies to ensure we find all proposals
      const query1 = await Proposal.find({ engineer: userIdObjectId }).select("project engineer").lean();
      const query2 = await Proposal.find({ engineer: userId.toString() }).select("project engineer").lean();
      const query3 = await Proposal.find({ engineer: new mongoose.Types.ObjectId(userId.toString()) }).select("project engineer").lean();
      
      console.log(`📋 Query 1 (ObjectId): Found ${query1.length} proposals`);
      console.log(`📋 Query 2 (String): Found ${query2.length} proposals`);
      console.log(`📋 Query 3 (New ObjectId): Found ${query3.length} proposals`);
      
      // Combine all results and remove duplicates
      const allProposals = [...query1, ...query2, ...query3];
      const uniqueProposals = allProposals.filter((p, index, self) => 
        index === self.findIndex(prop => prop._id.toString() === p._id.toString())
      );
      
      console.log(`📋 Total unique proposals: ${uniqueProposals.length}`);
      console.log(`📋 Proposals details:`, uniqueProposals.map(p => ({ 
        id: p._id.toString(), 
        project: p.project.toString(),
        engineer: p.engineer ? p.engineer.toString() : 'N/A',
        engineerMatches: p.engineer ? (p.engineer.toString() === userIdObjectId.toString() || p.engineer.toString() === userId.toString()) : false
      })));
      
      projectIds = uniqueProposals.map(prop => prop.project);
      console.log(`📋 Project IDs from proposals:`, projectIds.map(id => id.toString()));
      
      if (projectIds.length === 0) {
        console.log(`⚠️ No proposals found for ${userRole} (userId: ${userIdObjectId.toString()}), returning empty list`);
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
      console.log(`✅ Project room query for ${userRole}:`, JSON.stringify(projectRoomQuery));
    }
    // Admins see all project rooms (no filter needed)

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    console.log(`🔍 Final projectRoomQuery for ${userRole}:`, JSON.stringify(projectRoomQuery));
    
    // For engineers/companies, if query is empty, return empty (should have been handled above, but double-check)
    if ((userRole === "engineer" || userRole === "company")) {
      // Check if query is empty or doesn't have project filter
      if (Object.keys(projectRoomQuery).length === 0 || !projectRoomQuery.project) {
        console.log(`⚠️ Empty or invalid query for ${userRole}, returning empty list`);
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
      
      // Additional safety check: verify that projectIds array is not empty
      if (projectIds.length === 0) {
        console.log(`⚠️ No project IDs found for ${userRole}, returning empty list`);
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
      
      // Verify that the query has the correct structure
      if (!projectRoomQuery.project || !projectRoomQuery.project.$in || projectRoomQuery.project.$in.length === 0) {
        console.log(`⚠️ Invalid query structure for ${userRole}, returning empty list`);
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
    }
    
    const [projectRooms, total] = await Promise.all([
      ProjectRoom.find(projectRoomQuery)
        .populate("project", "title status")
        .sort({ lastActivityAt: -1 })
        .skip(skip)
        .limit(limit),
      ProjectRoom.countDocuments(projectRoomQuery),
    ]);
    console.log(`📋 Found ${projectRooms.length} project rooms (total: ${total}) for ${userRole}`);
    console.log(`📋 Project rooms details:`, projectRooms.map(pr => ({
      id: pr._id.toString(),
      project: pr.project?._id?.toString() || pr.project?.toString(),
      projectTitle: pr.projectTitle
    })));
    
    // Additional verification for engineers/companies
    if (userRole === "engineer" || userRole === "company") {
      const projectRoomProjectIds = projectRooms.map(pr => pr.project?._id?.toString() || pr.project?.toString()).filter(Boolean);
      console.log(`🔍 Project Room Project IDs:`, projectRoomProjectIds);
      console.log(`🔍 Matching with proposal Project IDs:`, projectIds.map(id => id.toString()));
      
      // Verify all project rooms belong to proposals
      const mismatched = projectRoomProjectIds.filter(prId => !projectIds.some(pId => pId.toString() === prId));
      if (mismatched.length > 0) {
        console.error(`❌ ERROR: Found ${mismatched.length} project rooms that don't match any proposals:`, mismatched);
        console.error(`❌ These project rooms should NOT be visible to ${userRole} ${userId}`);
        
        // Return empty list if there are mismatched project rooms (safety check)
        return res.json({
          data: [],
          meta: {
            total: 0,
            page: 1,
            limit: 10,
            pages: 1,
          },
        });
      } else {
        console.log(`✅ All ${projectRooms.length} project rooms match proposals for ${userRole}`);
      }
    }

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
    } else if (userRole === "engineer" || userRole === "company") {
      // Check if engineer/company has submitted proposal for this project
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
    } else if (userRole === "engineer" || userRole === "company") {
      // Check if engineer/company has submitted proposal for this project
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
    } else if (userRole === "engineer" || userRole === "company") {
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