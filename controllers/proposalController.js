const Proposal = require("../models/proposalModel");
const Project = require("../models/projectModel");
const ProjectRoom = require("../models/projectRoomModel");
const ChatRoom = require("../models/chatRoomModel");
const Message = require("../models/messageModel");

// Format proposal for responses
const sanitizeProposal = (proposal) => {
  const obj = proposal.toObject ? proposal.toObject() : proposal;
  return {
    id: obj._id,
    project: obj.project,
    engineer: obj.engineer,
    description: obj.description,
    estimatedTimeline: obj.estimatedTimeline,
    relevantExperience: obj.relevantExperience,
    proposedBudget: obj.proposedBudget,
    status: obj.status,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

// Engineer submits proposal on a project
exports.createProposal = async (req, res, next) => {
  try {
    const { projectId, description, estimatedTimeline, relevantExperience, proposedBudget } = req.body;

    if (req.user.role !== "engineer") {
      return res.status(403).json({ message: "هذه العملية للمهندسين فقط" });
    }

    const project = await Project.findById(projectId);
    if (!project || !project.isActive) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    // Ensure no duplicate proposal for same project/engineer
    const existing = await Proposal.findOne({ project: projectId, engineer: req.user._id });
    if (existing) {
      return res.status(400).json({ message: "لقد قدمت عرضاً لهذا المشروع بالفعل" });
    }

    const proposal = await Proposal.create({
      project: projectId,
      engineer: req.user._id,
      description,
      estimatedTimeline,
      relevantExperience,
      proposedBudget,
    });

    // Increment project's proposals count (soft fail)
    await Project.updateOne({ _id: projectId }, { $inc: { proposalsCount: 1 } }).catch(() => {});

    // Automatically create ProjectRoom and ChatRooms when first proposal is submitted
    try {
      // Check if ProjectRoom already exists
      let projectRoom = await ProjectRoom.findOne({ project: projectId });
      
      if (!projectRoom) {
        // Create ProjectRoom
        projectRoom = await ProjectRoom.create({
          project: projectId,
          projectTitle: project.title,
        });
        
        console.log(`Created ProjectRoom for project ${projectId}`);
      }

      // Check if ChatRoom between Admin and Engineer already exists
      let adminEngineerChatRoom = await ChatRoom.findOne({
        project: projectId,
        projectRoom: projectRoom._id,
        type: "admin-engineer",
        engineer: req.user._id,
      });

      if (!adminEngineerChatRoom) {
        // Create ChatRoom for Admin-Engineer communication
        adminEngineerChatRoom = await ChatRoom.create({
          project: projectId,
          projectRoom: projectRoom._id,
          type: "admin-engineer",
          engineer: req.user._id,
          participants: [
            {
              user: req.user._id,
              role: "engineer",
              joinedAt: new Date(),
            },
            // Admin will be added when they join the chat
          ],
        });
        
        console.log(`Created Admin-Engineer ChatRoom for project ${projectId}`);
      }

      // Check if ChatRoom between Admin and Client already exists
      let adminClientChatRoom = await ChatRoom.findOne({
        project: projectId,
        projectRoom: projectRoom._id,
        type: "admin-client",
      });

      if (!adminClientChatRoom) {
        // Create ChatRoom for Admin-Client communication
        adminClientChatRoom = await ChatRoom.create({
          project: projectId,
          projectRoom: projectRoom._id,
          type: "admin-client",
          participants: [
            {
              user: project.client,
              role: "client",
              joinedAt: new Date(),
            },
            // Admin will be added when they join the chat
          ],
        });
        
        console.log(`Created Admin-Client ChatRoom for project ${projectId}`);
        
        // Send system message in Admin-Client ChatRoom
        const systemMessageClient = await Message.create({
          chatRoom: adminClientChatRoom._id,
          sender: "system",
          content: `قام المهندس ${req.user.name || 'مجهول'} بتقديم عرض على مشروعك "${project.title}". سيتم التواصل معك قريباً.`,
          type: "system",
        });
        
        // Update chat room's last message
        adminClientChatRoom.lastMessage = {
          content: systemMessageClient.content.substring(0, 100),
          sender: "system",
          createdAt: systemMessageClient.createdAt,
        };
        await adminClientChatRoom.save();
      }

      // Send system message in Admin-Engineer ChatRoom
      const systemMessageEngineer = await Message.create({
        chatRoom: adminEngineerChatRoom._id,
        sender: "system",
        content: `قام المهندس ${req.user.name || 'مجهول'} بتقديم عرض على المشروع "${project.title}". يرجى التواصل معه لإجراء مقابلة.`,
        type: "system",
      });
      
      // Update chat room's last message
      adminEngineerChatRoom.lastMessage = {
        content: systemMessageEngineer.content.substring(0, 100),
        sender: "system",
        createdAt: systemMessageEngineer.createdAt,
      };
      await adminEngineerChatRoom.save();
      
      // Update project room's last activity
      projectRoom.lastActivityAt = systemMessageEngineer.createdAt;
      await projectRoom.save();
      
    } catch (chatError) {
      // Log error but don't fail the proposal creation
      console.error("Error creating chat rooms:", chatError);
    }

    res.status(201).json({
      message: "تم إرسال العرض بنجاح",
      data: sanitizeProposal(proposal),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "لقد قدمت عرضاً لهذا المشروع بالفعل" });
    }
    next(error);
  }
};

// Get proposals for a specific project
exports.getProposalsByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project || !project.isActive) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    // Permission: admin sees all, client sees their project, engineer sees only own proposal
    if (req.user.role === "client" && project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "غير مصرح لك بعرض عروض هذا المشروع" });
    }

    const filters = { project: projectId };
    if (req.user.role === "engineer") {
      filters.engineer = req.user._id;
    }

    const proposals = await Proposal.find(filters)
      .sort({ createdAt: -1 })
      .populate("engineer", "name email role")
      .populate("project", "title client");

    res.json({
      data: proposals.map(sanitizeProposal),
    });
  } catch (error) {
    next(error);
  }
};

// Engineer: get own proposals
exports.getMyProposals = async (req, res, next) => {
  try {
    if (req.user.role !== "engineer") {
      return res.status(403).json({ message: "هذه العملية للمهندسين فقط" });
    }

    const proposals = await Proposal.find({ engineer: req.user._id })
      .sort({ createdAt: -1 })
      .populate("project", "title status assignedEngineer client");

    res.json({
      data: proposals.map(sanitizeProposal),
    });
  } catch (error) {
    next(error);
  }
};

// Admin: update proposal status
exports.updateProposalStatus = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "غير مسموح - هذه العملية للمسؤول فقط" });
    }

    const { id } = req.params;
    const { status } = req.body;

    const proposal = await Proposal.findById(id);
    if (!proposal) {
      return res.status(404).json({ message: "العرض غير موجود" });
    }

    proposal.status = status;
    await proposal.save();

    res.json({
      message: "تم تحديث حالة العرض",
      data: sanitizeProposal(proposal),
    });
  } catch (error) {
    next(error);
  }
};

// Update proposal (admin anytime, engineer within 1 hour of creation)
exports.updateProposal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description, estimatedTimeline, relevantExperience, proposedBudget, status } = req.body;

    const proposal = await Proposal.findById(id);
    if (!proposal) {
      return res.status(404).json({ message: "العرض غير موجود" });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = proposal.engineer.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "غير مسموح بتعديل هذا العرض" });
    }

    // Engineer can update only within 1 hour of creation
    if (!isAdmin) {
      const oneHourMs = 60 * 60 * 1000;
      const diff = Date.now() - new Date(proposal.createdAt).getTime();
      if (diff > oneHourMs) {
        return res.status(403).json({ message: "انتهت مدة التعديل على العرض (ساعة واحدة من وقت الإنشاء)" });
      }
    }

    // Apply updates
    if (description !== undefined) proposal.description = description;
    if (estimatedTimeline !== undefined) proposal.estimatedTimeline = estimatedTimeline;
    if (relevantExperience !== undefined) proposal.relevantExperience = relevantExperience;
    if (proposedBudget !== undefined) {
      proposal.proposedBudget = { ...proposal.proposedBudget, ...proposedBudget };
    }

    // Only admin can change status via this endpoint
    if (status !== undefined && isAdmin) {
      proposal.status = status;
    }

    await proposal.save();

    res.json({
      message: "تم تحديث العرض بنجاح",
      data: sanitizeProposal(proposal),
    });
  } catch (error) {
    next(error);
  }
};

