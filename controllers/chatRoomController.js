const ChatRoom = require("../models/chatRoomModel");
const ProjectRoom = require("../models/projectRoomModel");
const Project = require("../models/projectModel");
const Message = require("../models/messageModel");
const Proposal = require("../models/proposalModel");
const User = require("../models/userModel");
const mongoose = require("mongoose");
const {
  addUnreadCountToChatRooms,
  addUnreadCountToChatRoom,
  updateLastReadAt,
} = require("../utils/chatHelpers");

// Import sanitizeProject helper
const sanitizeProject = (project) => {
  const projectObj = project.toObject ? project.toObject() : project;
  return {
    id: projectObj._id,
    title: projectObj.title,
    description: projectObj.description,
    country: projectObj.country,
    city: projectObj.city,
    location: projectObj.location,
    category: projectObj.category,
    requirements: projectObj.requirements,
    projectType: projectObj.projectType,
    client: projectObj.client,
    assignedEngineer: projectObj.assignedEngineer,
    status: projectObj.status,
    budget: projectObj.budget,
    startDate: projectObj.startDate,
    deadline: projectObj.deadline,
    progress: projectObj.progress || 0,
    statusHistory: projectObj.statusHistory || [],
    attachments: projectObj.attachments || [],
    proposalsCount: projectObj.proposalsCount || 0,
    isActive: projectObj.isActive,
    tags: projectObj.tags || [],
    adminApproval: projectObj.adminApproval || {
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
    },
    createdAt: projectObj.createdAt,
    updatedAt: projectObj.updatedAt,
  };
};

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

    // Get project to check status
    const project = await Project.findById(projectRoom.project);
    if (!project) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    // Don't show chat rooms for deleted projects (isActive: false)
    if (!project.isActive) {
      return res.json({ data: [] });
    }

    // Check permissions based on project room
    if (userRole === "client") {
      if (project.client.toString() !== userId.toString()) {
        return res.status(403).json({ message: "غير مسموح لك بالوصول إلى هذه الغرفة" });
      }
    } else if (userRole === "engineer" || userRole === "company") {
      // Check if engineer/company has submitted proposal for this project
      console.log(`🔍 Checking proposal for ${userRole} userId:`, userId, 'project:', projectRoom.project);
      const hasProposal = await Proposal.findOne({
        project: projectRoom.project,
        engineer: userId,
      });
      console.log(`📋 Proposal check result:`, hasProposal ? `Found proposal ${hasProposal._id}` : 'No proposal found');
      if (!hasProposal) {
        console.log(`❌ Access denied: ${userRole} has no proposal for project ${projectRoom.project}`);
        return res.status(403).json({ message: "غير مسموح لك بالوصول إلى هذه الغرفة" });
      }
      console.log(`✅ Access granted: ${userRole} has proposal for project ${projectRoom.project}`);
    }
    // Admins can access all project rooms

    let chatRoomQuery = { projectRoom: roomId, status: "active" }; // Only show active rooms

    // Filter chat rooms based on user role and permissions
    if (userRole === "client") {
      // Clients see only chat rooms they are participants in AND admin has started the chat
      // OR group chats (which are always visible after assignment)
      chatRoomQuery = {
        projectRoom: roomId,
        status: "active",
        $or: [
          {
            "participants.user": userId,
            adminStartedChat: true, // Admin must have started the chat
          },
          {
            type: "group", // Group chats are always visible after assignment
          },
        ],
      };
    } else if (userRole === "engineer" || userRole === "company") {
      // Engineers and companies see only chat rooms they are participants in OR where they are the engineer
      // BUT only if admin has started the chat (or it's a group chat)
      // Ensure userId is ObjectId for proper matching
      const userIdObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? (userId instanceof mongoose.Types.ObjectId ? userId : new mongoose.Types.ObjectId(userId))
        : userId;
      
      console.log(`🔍 Building chat room query for ${userRole}, userId:`, userIdObjectId.toString());
      
      chatRoomQuery = {
        projectRoom: roomId,
        status: "active",
        $or: [
          {
            "participants.user": userIdObjectId,
            adminStartedChat: true, // Admin must have started the chat
          },
          {
            engineer: userIdObjectId,
            adminStartedChat: true, // Admin must have started the chat
          },
          {
            type: "group", // Group chats are always visible after assignment
          },
        ],
      };
      
      console.log(`✅ Chat room query for ${userRole}:`, JSON.stringify(chatRoomQuery));
    }
    // Admins see all active chat rooms (no additional filter needed)
    // BUT: Hide chat rooms for cancelled projects (except group chats that were created after assignment)
    // Note: Deleted projects (isActive: false) are already filtered out above (return empty array)
    if (project.status === "Cancelled") {
      // For cancelled projects, only show group chats (if they exist)
      // Don't show admin-engineer/admin-company/admin-client chats for cancelled projects
      chatRoomQuery = {
        ...chatRoomQuery,
        type: "group", // Only group chats for cancelled projects
      };
    }

    const chatRooms = await ChatRoom.find(chatRoomQuery)
      .populate({
        path: "project",
        select: "title status client",
        populate: { path: "client", select: "name email" },
      })
      .populate("participants.user", "name email role avatar")
      .populate("engineer", "name email role avatar")
      .populate("lastMessage.sender", "name avatar")
      .sort({ createdAt: -1 });

    // Additional filter: Remove chat rooms for cancelled projects (except group chats)
    // This is a safety check in case the query didn't filter them out
    const filteredChatRooms = chatRooms.filter(room => {
      if (project.status === "Cancelled" && room.type !== "group") {
        return false; // Hide non-group chats for cancelled projects
      }
      return true;
    });

    console.log(`📋 Found ${filteredChatRooms.length} chat rooms for ${userRole} in project room ${roomId} (after filtering)`);
    filteredChatRooms.forEach((room, index) => {
      console.log(`📋 Chat room ${index + 1}:`, {
        id: room._id.toString(),
        type: room.type,
        engineer: room.engineer ? (typeof room.engineer === 'object' ? room.engineer._id?.toString() : room.engineer.toString()) : 'N/A',
        participants: room.participants?.map(p => ({
          user: typeof p.user === 'object' ? p.user._id?.toString() : p.user?.toString(),
          role: p.role
        })) || []
      });
    });

    // Add unread count to each chat room
    let chatRoomsWithUnread = await addUnreadCountToChatRooms(filteredChatRooms, userId);

    // Add displayTitle for frontend (with fallback from User collection)
    chatRoomsWithUnread = await Promise.all(
      chatRoomsWithUnread.map(async (room) => {
        const r = room.toObject ? room.toObject() : { ...room };
        let displayTitle = "";
        if (r.type === "group") displayTitle = "الدردشة الجماعية";
        else if (r.type === "admin-client") {
          const name = (r.participants || []).find((p) => p.role === "client")?.user?.name || r.project?.client?.name;
          if (name && String(name).trim()) displayTitle = String(name).trim();
          else {
            const clientId = r.project?.client?._id || r.project?.client;
            if (clientId) {
              const user = await User.findById(clientId).select("name").lean();
              displayTitle = (user?.name && String(user.name).trim()) ? String(user.name).trim() : "العميل";
            } else displayTitle = "العميل";
          }
        } else if (r.type === "admin-engineer" || r.type === "admin-company") {
          const name = (r.participants || []).find((p) => p.role === "engineer" || p.role === "company")?.user?.name || r.engineer?.name;
          if (name && String(name).trim()) displayTitle = String(name).trim();
          else {
            const engineerId = r.engineer?._id || r.engineer;
            if (engineerId) {
              const user = await User.findById(engineerId).select("name").lean();
              displayTitle = (user?.name && String(user.name).trim()) ? String(user.name).trim() : "المهندس";
            } else displayTitle = "المهندس";
          }
        } else displayTitle = "محادثة";
        return { ...r, displayTitle };
      })
    );

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
      .populate("lastMessage.sender", "name avatar")
      .populate("project", "_id");

    if (!chatRoom) {
      return res.status(404).json({ message: "غرفة الدردشة غير موجودة" });
    }

    // For engineers and companies: check if they have submitted proposal for this project
    if (userRole === "engineer" || userRole === "company") {
      const projectId = chatRoom.project?._id || chatRoom.project;
      if (projectId) {
        console.log(`🔍 Checking proposal for ${userRole} userId:`, userId, 'project:', projectId);
        const hasProposal = await Proposal.findOne({
          project: projectId,
          engineer: userId,
        });
        console.log(`📋 Proposal check result:`, hasProposal ? `Found proposal ${hasProposal._id}` : 'No proposal found');
        if (!hasProposal) {
          console.log(`❌ Access denied: ${userRole} has no proposal for project ${projectId}`);
          return res.status(403).json({ message: "غير مسموح لك بالوصول إلى هذه الغرفة" });
        }
        console.log(`✅ Access granted: ${userRole} has proposal for project ${projectId}`);
      }
    }

    // Check if user is participant in this chat room
    const isParticipant = chatRoom.participants.some(
      participant => participant.user.toString() === userId.toString()
    );

    // Also check if engineer/company field matches (for admin-engineer/admin-company rooms)
    const isEngineerField = chatRoom.engineer && chatRoom.engineer._id?.toString() === userId.toString();

    if (!isParticipant && !isEngineerField) {
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

    let chatRoomQuery;

    // Admin sees all chat rooms in the system (no participant filter)
    if (userRole === "admin") {
      chatRoomQuery = { status: "active" };
    } else if (userRole === "engineer" || userRole === "company") {
      // Ensure userId is ObjectId for proper matching
      const userIdObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? (userId instanceof mongoose.Types.ObjectId ? userId : new mongoose.Types.ObjectId(userId))
        : userId;
      
      console.log(`🔍 Building getMyChatRooms query for ${userRole}, userId:`, userIdObjectId.toString());
      
      chatRoomQuery = {
        status: "active",
        $or: [
          {
            "participants.user": userIdObjectId,
            adminStartedChat: true, // Admin must have started the chat
          },
          {
            engineer: userIdObjectId,
            adminStartedChat: true, // Admin must have started the chat
          },
          {
            type: "group", // Group chats are always visible after assignment
          },
        ],
      };
      
      console.log(`✅ getMyChatRooms query for ${userRole}:`, JSON.stringify(chatRoomQuery));
    } else if (userRole === "client") {
      // Clients see only chat rooms where admin has started the chat OR group chats
      chatRoomQuery = {
        status: "active",
        "participants.user": userId,
        $or: [
          { adminStartedChat: true }, // Admin must have started the chat
          { type: "group" }, // Group chats are always visible after assignment
        ],
      };
    } else {
      // Fallback for any other role: only rooms where user is participant
      chatRoomQuery = { "participants.user": userId, status: "active" };
    }

    // Filter by type
    if (type && ["admin-engineer", "admin-company", "admin-client", "group"].includes(type)) {
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
      .populate({
        path: "project",
        select: "title status client",
        populate: { path: "client", select: "name email" },
      })
      .populate("participants.user", "name email role avatar")
      .populate("engineer", "name email role avatar")
      .populate("lastMessage.sender", "name avatar");

    // For engineers and companies: filter to only show chat rooms for projects they've submitted proposals to
    let filteredChatRooms = chatRooms;
    if (userRole === "engineer" || userRole === "company") {
      console.log(`🔍 Filtering chat rooms for ${userRole} with userId:`, userId);
      
      // Get all project IDs where this engineer/company has submitted proposals
      // Ensure userId is ObjectId for proper matching
      const userIdObjectId = mongoose.Types.ObjectId.isValid(userId) 
        ? (userId instanceof mongoose.Types.ObjectId ? userId : new mongoose.Types.ObjectId(userId))
        : userId;
      
      const proposals = await Proposal.find({ engineer: userIdObjectId }).select("project");
      const proposalProjectIds = proposals.map(p => p.project.toString());
      console.log(`📋 Found ${proposals.length} proposals for ${userRole}, project IDs:`, proposalProjectIds);
      
      // Filter chat rooms to only include those for projects with proposals
      filteredChatRooms = chatRooms.filter(room => {
        const projectId = room.project?._id?.toString() || room.project?.toString();
        const projectRoomProjectId = room.projectRoom?.project?.toString();
        const hasProposal = proposalProjectIds.includes(projectId) || proposalProjectIds.includes(projectRoomProjectId);
        
        if (!hasProposal) {
          console.log(`❌ Excluding chat room ${room._id} - no proposal for project ${projectId || projectRoomProjectId}`);
          console.log(`   Room details:`, {
            id: room._id.toString(),
            type: room.type,
            projectId,
            projectRoomProjectId,
            proposalProjectIds
          });
        } else {
          console.log(`✅ Including chat room ${room._id} - has proposal for project ${projectId || projectRoomProjectId}`);
        }
        
        return hasProposal;
      });
      
      console.log(`✅ Filtered to ${filteredChatRooms.length} chat rooms (from ${chatRooms.length} total) for ${userRole}`);
    }

    // Filter by search if provided
    if (search) {
      const searchRegex = new RegExp(search, "i");
      filteredChatRooms = filteredChatRooms.filter(room => {
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
    let chatRoomsWithUnread = await addUnreadCountToChatRooms(filteredChatRooms, userId);

    // Add displayTitle for frontend (client/engineer actual names) - with fallback from User collection
    chatRoomsWithUnread = await Promise.all(
      chatRoomsWithUnread.map(async (room) => {
        const r = room.toObject ? room.toObject() : { ...room };
        let displayTitle = "";
        if (r.type === "group") {
          displayTitle = "الدردشة الجماعية";
        } else if (r.type === "admin-client") {
          const clientParticipant = (r.participants || []).find((p) => p.role === "client");
          const participantName = clientParticipant?.user?.name;
          if (participantName && String(participantName).trim()) {
            displayTitle = String(participantName).trim();
          } else if (r.project?.client) {
            const client = r.project.client;
            if (typeof client === "object" && client?.name && String(client.name).trim()) {
              displayTitle = String(client.name).trim();
            }
          }
          if (!displayTitle) {
            const clientId = r.project?.client?._id || r.project?.client;
            if (clientId) {
              const user = await User.findById(clientId).select("name").lean();
              displayTitle = (user?.name && String(user.name).trim()) ? String(user.name).trim() : "العميل";
            } else {
              displayTitle = "العميل";
            }
          }
        } else if (r.type === "admin-engineer" || r.type === "admin-company") {
          const engParticipant = (r.participants || []).find(
            (p) => p.role === "engineer" || p.role === "company"
          );
          const participantName = engParticipant?.user?.name;
          if (participantName && String(participantName).trim()) {
            displayTitle = String(participantName).trim();
          } else if (r.engineer) {
            const eng = r.engineer;
            if (typeof eng === "object" && eng?.name && String(eng.name).trim()) {
              displayTitle = String(eng.name).trim();
            }
          }
          if (!displayTitle) {
            const engineerId = r.engineer?._id || r.engineer;
            if (engineerId) {
              const user = await User.findById(engineerId).select("name").lean();
              displayTitle = (user?.name && String(user.name).trim()) ? String(user.name).trim() : "المهندس";
            } else {
              displayTitle = "المهندس";
            }
          }
        } else {
          displayTitle = "محادثة";
        }
        return { ...r, displayTitle };
      })
    );

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
      engineer: (type === "admin-engineer" || type === "admin-company") ? engineer : undefined,
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

// Start chat - Admin initiates conversation (makes chat visible to engineer/client)
const startChat = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Only admin can start chats
    if (userRole !== "admin") {
      return res.status(403).json({ message: "غير مصرح لك بهذه العملية" });
    }

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: "غرفة الدردشة غير موجودة" });
    }

    // Check if project is cancelled or deleted - don't allow starting chat for cancelled/deleted projects
    const project = await Project.findById(chatRoom.project);
    if (!project) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }
    
    if (!project.isActive) {
      return res.status(400).json({ 
        message: "لا يمكن بدء الدردشة لمشروع محذوف" 
      });
    }
    
    if (project.status === "Cancelled") {
      return res.status(400).json({ 
        message: "لا يمكن بدء الدردشة لمشروع ملغي. تم إلغاء المشروع من قبل العميل" 
      });
    }

    // Check if chat is already started
    if (chatRoom.adminStartedChat) {
      return res.status(400).json({ message: "تم بدء الدردشة بالفعل" });
    }

    // Mark chat as started
    chatRoom.adminStartedChat = true;

    // Add admin to participants if not already present
    const adminExists = chatRoom.participants.some(
      p => p.user.toString() === userId.toString() && p.role === "admin"
    );
    
    if (!adminExists) {
      chatRoom.participants.push({
        user: userId,
        role: "admin",
        joinedAt: new Date(),
      });
    }

    await chatRoom.save();

    // Send system message
    const Message = require("../models/messageModel");
    const { getSystemUserId } = require("../utils/systemUser");
    const systemUserId = await getSystemUserId();
    
    const systemMessage = await Message.create({
      chatRoom: chatRoom._id,
      sender: systemUserId,
      content: "بدأ الأدمن الدردشة. يمكنك الآن التواصل.",
      type: "system",
    });

    // Update chat room's last message
    chatRoom.lastMessage = {
      content: systemMessage.content.substring(0, 100),
      sender: systemUserId,
      createdAt: systemMessage.createdAt,
    };
    await chatRoom.save();

    // Send notification to the other participant (engineer/client)
    const { createNotification } = require("./notificationController");
    const otherParticipant = chatRoom.participants.find(
      p => p.user.toString() !== userId.toString()
    );
    
    if (otherParticipant) {
      const chatRoomType = chatRoom.type;
      let notificationMessage = "";
      if (chatRoomType === "admin-engineer" || chatRoomType === "admin-company") {
        notificationMessage = "بدأ الأدمن الدردشة معك. يمكنك الآن التواصل.";
      } else if (chatRoomType === "admin-client") {
        notificationMessage = "بدأ الأدمن الدردشة معك. يمكنك الآن التواصل.";
      }

      if (notificationMessage) {
        await createNotification({
          user: otherParticipant.user,
          type: "chat_started",
          title: "بدء الدردشة",
          message: notificationMessage,
          data: {
            chatRoomId: chatRoom._id,
            projectId: chatRoom.project,
          },
          actionUrl: `/messages?chatRoom=${chatRoom._id}`,
        }).catch(err => console.error("❌ Error creating notification:", err));
      }
    }

    // Emit socket event
    const { getIO } = require('../socket');
    const io = getIO();
    if (io) {
      io.to(chatRoom._id.toString()).emit('chat_started', {
        chatRoomId: chatRoom._id,
        adminStartedChat: true,
      });
    }

    res.json({
      message: "تم بدء الدردشة بنجاح",
      data: chatRoom,
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Assign engineer from chat room - Admin assigns engineer directly from chat
const assignEngineerFromChat = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { engineerId } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;

    // Only admin can assign engineers
    if (userRole !== "admin") {
      return res.status(403).json({ message: "غير مصرح لك بهذه العملية" });
    }

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: "غرفة الدردشة غير موجودة" });
    }

    // Only allow assignment from admin-engineer or admin-company chat rooms
    if (chatRoom.type !== "admin-engineer" && chatRoom.type !== "admin-company") {
      return res.status(400).json({ message: "يمكن تعيين المهندس من شات الأدمن مع المهندس فقط" });
    }

    // Get engineer ID from chat room if not provided
    const targetEngineerId = engineerId || chatRoom.engineer;
    if (!targetEngineerId) {
      return res.status(400).json({ message: "لم يتم العثور على معرف المهندس" });
    }

    // Get project
    const project = await Project.findById(chatRoom.project);
    if (!project) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    // Check if project is deleted - don't allow assigning engineer to deleted projects
    if (!project.isActive) {
      return res.status(400).json({ 
        message: "لا يمكن تعيين مهندس لمشروع محذوف" 
      });
    }

    // Check if project is cancelled - don't allow assigning engineer to cancelled projects
    if (project.status === "Cancelled") {
      return res.status(400).json({ 
        message: "لا يمكن تعيين مهندس لمشروع ملغي. تم إلغاء المشروع من قبل العميل" 
      });
    }

    // Get engineer user
    const engineer = await User.findById(targetEngineerId);
    if (!engineer || (engineer.role !== "engineer" && engineer.role !== "company")) {
      return res.status(404).json({ message: "المهندس غير موجود" });
    }

    // Assign engineer to project
    project.assignedEngineer = targetEngineerId;
    project.status = "In Progress";
    await project.save();

    // Reject all other proposals for this project
    await Proposal.updateMany(
      {
        project: project._id,
        engineer: { $ne: targetEngineerId },
        status: { $ne: "rejected" }
      },
      { status: "rejected" }
    );

    // Get or create ProjectRoom
    let projectRoom = await ProjectRoom.findOne({ project: project._id });
    if (!projectRoom) {
      projectRoom = await ProjectRoom.create({
        project: project._id,
        projectTitle: project.title,
      });
    }

    // Create or update group chat room
    let groupChatRoom = await ChatRoom.findOne({
      project: project._id,
      projectRoom: projectRoom._id,
      type: "group",
    });

    if (!groupChatRoom) {
      // Create Group ChatRoom with adminObserver
      groupChatRoom = await ChatRoom.create({
        project: project._id,
        projectRoom: projectRoom._id,
        type: "group",
        adminObserver: true, // Admin is observer only
        participants: [
          {
            user: project.client,
            role: "client",
            joinedAt: new Date(),
          },
          {
            user: targetEngineerId,
            role: engineer.role, // "engineer" or "company"
            joinedAt: new Date(),
          },
        ],
      });
    } else {
      // Add engineer if not already in participants
      const engineerExists = groupChatRoom.participants.some(
        p => p.user.toString() === targetEngineerId.toString()
      );
      if (!engineerExists) {
        groupChatRoom.participants.push({
          user: targetEngineerId,
          role: engineer.role,
          joinedAt: new Date(),
        });
        groupChatRoom.adminObserver = true; // Ensure admin observer mode
        await groupChatRoom.save();
      }
    }

    // Send system message about assignment and admin observation
    const { getSystemUserId } = require("../utils/systemUser");
    const systemUserId = await getSystemUserId();
    const systemMessage = await Message.create({
      chatRoom: groupChatRoom._id,
      sender: systemUserId,
      content: `تم تعيين ${engineer.role === "company" ? "الشركة" : "المهندس"} ${engineer.name || 'مجهول'} للمشروع "${project.title}". يمكنكم الآن التواصل مباشرة. ملاحظة: يتم رؤية محتوى هذه الدردشة من قبل الإدارة لضمان حقوق الطرفين.`,
      type: "system",
    });

    // Update chat room's last message
    groupChatRoom.lastMessage = {
      content: systemMessage.content.substring(0, 100),
      sender: systemUserId,
      createdAt: systemMessage.createdAt,
    };
    await groupChatRoom.save();

    // Update project room's last activity
    projectRoom.lastActivityAt = systemMessage.createdAt;
    await projectRoom.save();

    // Send notifications
    const { createNotification } = require("./notificationController");
    
    // Notify client
    await createNotification({
      user: project.client,
      type: "engineer_assigned",
      title: "تم تعيين المهندس",
      message: `تم تعيين ${engineer.role === "company" ? "الشركة" : "المهندس"} ${engineer.name || 'مجهول'} لمشروعك "${project.title}"`,
      data: {
        projectId: project._id,
        engineerId: targetEngineerId,
        chatRoomId: groupChatRoom._id,
      },
      actionUrl: `/messages?chatRoom=${groupChatRoom._id}`,
    }).catch(err => console.error("❌ Error creating client notification:", err));

    // Notify engineer
    await createNotification({
      user: targetEngineerId,
      type: "project_assigned",
      title: "تم تعيينك للمشروع",
      message: `تم تعيينك لمشروع "${project.title}". يمكنك الآن التواصل مع العميل.`,
      data: {
        projectId: project._id,
        chatRoomId: groupChatRoom._id,
      },
      actionUrl: `/messages?chatRoom=${groupChatRoom._id}`,
    }).catch(err => console.error("❌ Error creating engineer notification:", err));

    res.json({
      message: "تم تعيين المهندس بنجاح",
      data: {
        project: sanitizeProject(project),
        groupChatRoom: groupChatRoom,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Reject engineer from chat - Admin rejects engineer's proposal from chat room
const rejectEngineerFromChat = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { reason, engineerId: bodyEngineerId } = req.body;
    const userRole = req.user.role;

    if (userRole !== "admin") {
      return res.status(403).json({ message: "غير مصرح لك بهذه العملية" });
    }

    const chatRoom = await ChatRoom.findById(roomId);
    if (!chatRoom) {
      return res.status(404).json({ message: "غرفة الدردشة غير موجودة" });
    }

    if (chatRoom.type !== "admin-engineer" && chatRoom.type !== "admin-company") {
      return res.status(400).json({ message: "يمكن رفض المهندس من شات الأدمن مع المهندس/الشركة فقط" });
    }

    let engineerId = bodyEngineerId || chatRoom.engineer;
    if (!engineerId) {
      const engineerParticipant = chatRoom.participants.find(
        (p) => p.role === "engineer" || p.role === "company"
      );
      if (engineerParticipant) {
        engineerId = engineerParticipant.user;
      }
    }
    if (!engineerId) {
      return res.status(400).json({ message: "لم يتم العثور على معرف المهندس" });
    }
    const engineerIdStr =
      typeof engineerId === "object" && engineerId !== null
        ? (engineerId._id || engineerId.id || engineerId).toString()
        : String(engineerId);

    const projectId = chatRoom.project._id || chatRoom.project;
    const proposal = await Proposal.findOne({
      project: projectId,
      engineer: engineerIdStr,
    }).populate("project", "title");

    if (!proposal) {
      return res.status(404).json({ message: "العرض غير موجود لهذا المهندس على هذا المشروع" });
    }

    if (proposal.status === "rejected") {
      return res.status(400).json({ message: "تم رفض هذا العرض مسبقاً" });
    }

    proposal.status = "rejected";
    await proposal.save();

    const project = proposal.project;
    const { createNotification } = require("./notificationController");
    const rejectionMessage =
      reason && reason.trim()
        ? `تم رفض عرضك على المشروع "${project.title}". السبب: ${reason.trim()}`
        : `تم رفض عرضك على المشروع "${project.title}"`;

    await createNotification({
      user: engineerIdStr,
      type: "proposal_rejected",
      title: "تم رفض عرضك",
      message: rejectionMessage,
      data: {
        projectId: project._id,
        proposalId: proposal._id,
      },
      actionUrl: `/proposals/${proposal._id}`,
    }).catch((err) => console.error("Error creating rejection notification:", err));

    res.json({
      message: "تم رفض المهندس بنجاح",
      data: { proposalId: proposal._id, status: "rejected" },
    });
  } catch (error) {
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
    let isParticipant = chatRoom.participants.some(
      p => p.user.toString() === userId.toString()
    );

    if (!isParticipant && req.user.role !== "admin") {
      return res.status(403).json({ message: "غير مسموح لك بالوصول إلى هذه الغرفة" });
    }

    // If admin viewing "all rooms" and not yet in participants, add them so lastReadAt/unread work
    if (!isParticipant && req.user.role === "admin") {
      chatRoom.participants.push({
        user: userId,
        role: "admin",
        joinedAt: new Date(),
        lastReadAt: new Date(),
      });
      await chatRoom.save();
      isParticipant = true;
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

    const [total, active, archived, adminEngineer, adminCompany, adminClient, group] = await Promise.all([
      ChatRoom.countDocuments({}),
      ChatRoom.countDocuments({ status: "active" }),
      ChatRoom.countDocuments({ status: "archived" }),
      ChatRoom.countDocuments({ type: "admin-engineer", status: "active" }),
      ChatRoom.countDocuments({ type: "admin-company", status: "active" }),
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
          adminCompany,
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
  startChat,
  assignEngineerFromChat,
  rejectEngineerFromChat,
  archiveChatRoom,
  unarchiveChatRoom,
  deleteChatRoom,
  addParticipant,
  removeParticipant,
  getChatRoomUnreadCount,
  markChatRoomAsRead,
  getChatRoomStatistics,
};