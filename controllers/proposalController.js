const Proposal = require("../models/proposalModel");
const Project = require("../models/projectModel");
const ProjectRoom = require("../models/projectRoomModel");
const ChatRoom = require("../models/chatRoomModel");
const Message = require("../models/messageModel");
const { getSystemUserId } = require("../utils/systemUser");

// Format proposal for responses
const sanitizeProposal = (proposal, userRole = null) => {
  const obj = proposal.toObject ? proposal.toObject() : proposal;
  
  // Handle project sanitization based on user role
  let project = obj.project;
  if (project && typeof project === 'object') {
    // Clone project to avoid mutating original
    project = { ...project };
    
    // Hide sensitive admin information from engineers
    if (userRole === "engineer" && project.adminApproval) {
      project.adminApproval = {
        status: project.adminApproval.status, // فقط حالة الموافقة
        // لا نعرض reviewedBy, reviewedAt, rejectionReason للمهندسين
      };
    }
  }
  
  return {
    id: obj._id,
    project: project,
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

    // Check if project is approved and waiting for engineers
    if (project.status !== "Waiting for Engineers") {
      return res.status(400).json({ 
        message: "لا يمكن تقديم عروض على هذا المشروع. يجب أن يكون المشروع موافقاً عليه و في انتظار المهندسين" 
      });
    }

    if (project.adminApproval?.status !== "approved") {
      return res.status(400).json({ 
        message: "لا يمكن تقديم عروض على مشروع غير موافق عليه من الأدمن" 
      });
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
        const systemUserId = await getSystemUserId();
        const systemMessageClient = await Message.create({
          chatRoom: adminClientChatRoom._id,
          sender: systemUserId,
          content: `قام المهندس ${req.user.name || 'مجهول'} بتقديم عرض على مشروعك "${project.title}". سيتم التواصل معك قريباً.`,
          type: "system",
        });
        
        // Update chat room's last message
        adminClientChatRoom.lastMessage = {
          content: systemMessageClient.content.substring(0, 100),
          sender: systemUserId,
          createdAt: systemMessageClient.createdAt,
        };
        await adminClientChatRoom.save();
      }

      // Send system message in Admin-Engineer ChatRoom
      const systemUserId = await getSystemUserId();
      const systemMessageEngineer = await Message.create({
        chatRoom: adminEngineerChatRoom._id,
        sender: systemUserId,
        content: `قام المهندس ${req.user.name || 'مجهول'} بتقديم عرض على المشروع "${project.title}". يرجى التواصل معه لإجراء مقابلة.`,
        type: "system",
      });
      
      // Update chat room's last message
      adminEngineerChatRoom.lastMessage = {
        content: systemMessageEngineer.content.substring(0, 100),
        sender: systemUserId,
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
      data: sanitizeProposal(proposal, req.user.role),
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
      .populate("engineer", "name email role avatar")
      .populate("project", "title client status adminApproval");

    res.json({
      data: proposals.map(p => sanitizeProposal(p, req.user.role)),
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
      .populate("project", "title status assignedEngineer client adminApproval");

    res.json({
      data: proposals.map(p => sanitizeProposal(p, req.user.role)),
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

    const proposal = await Proposal.findById(id).populate("project");
    if (!proposal) {
      return res.status(404).json({ message: "العرض غير موجود" });
    }

    const project = proposal.project;
    if (!project || !project.isActive) {
      return res.status(404).json({ message: "المشروع المرتبط بالعرض غير موجود" });
    }

    const oldStatus = proposal.status;
    proposal.status = status;
    await proposal.save();

    // If accepting proposal, update project and reject other proposals
    if (status === "accepted" && oldStatus !== "accepted") {
      // Update project: assign engineer and change status
      project.assignedEngineer = proposal.engineer;
      project.status = "In Progress";
      await project.save();

      // Reject all other proposals for this project
      await Proposal.updateMany(
        { 
          project: proposal.project._id, 
          _id: { $ne: proposal._id },
          status: { $ne: "rejected" }
        },
        { status: "rejected" }
      );

      // Create/update group chat room
      try {
        const projectId = proposal.project._id || proposal.project;
        let projectRoom = await ProjectRoom.findOne({ project: projectId });
        
        if (!projectRoom) {
          projectRoom = await ProjectRoom.create({
            project: projectId,
            projectTitle: project.title,
          });
        }

        // Check if Group ChatRoom already exists
        let groupChatRoom = await ChatRoom.findOne({
          project: projectId,
          projectRoom: projectRoom._id,
          type: "group",
        });

        if (!groupChatRoom) {
          // Create Group ChatRoom
          groupChatRoom = await ChatRoom.create({
            project: projectId,
            projectRoom: projectRoom._id,
            type: "group",
            participants: [
              {
                user: project.client,
                role: "client",
                joinedAt: new Date(),
              },
              {
                user: proposal.engineer,
                role: "engineer",
                joinedAt: new Date(),
              },
            ],
          });

          // Send system message about acceptance
          const systemUserId = await getSystemUserId();
          const systemMessage = await Message.create({
            chatRoom: groupChatRoom._id,
            sender: systemUserId,
            content: `تم قبول العرض وتم تعيين المهندس للمشروع "${project.title}". يمكنكم الآن التواصل مباشرة.`,
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
        } else {
          // Ensure participants are in the group
          const engineerExists = groupChatRoom.participants.some(
            p => p.user.toString() === proposal.engineer.toString()
          );

          if (!engineerExists) {
            groupChatRoom.participants.push({
              user: proposal.engineer,
              role: "engineer",
              joinedAt: new Date(),
            });
            await groupChatRoom.save();

            // Send system message about adding engineer
            const systemUserId = await getSystemUserId();
            const systemMessage = await Message.create({
              chatRoom: groupChatRoom._id,
              sender: systemUserId,
              content: `تم قبول العرض وتم إضافة المهندس للمشروع "${project.title}".`,
              type: "system",
            });
            
            groupChatRoom.lastMessage = {
              content: systemMessage.content.substring(0, 100),
              sender: systemUserId,
              createdAt: systemMessage.createdAt,
            };
            await groupChatRoom.save();
            
            projectRoom.lastActivityAt = systemMessage.createdAt;
            await projectRoom.save();
          }
        }
      } catch (chatError) {
        console.error("Error creating group chat room:", chatError);
      }
    }

    res.json({
      message: "تم تحديث حالة العرض",
      data: sanitizeProposal(proposal, req.user.role),
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
      data: sanitizeProposal(proposal, req.user.role),
    });
  } catch (error) {
    next(error);
  }
};

// Delete proposal (engineer can delete own pending proposals, admin can delete any)
exports.deleteProposal = async (req, res, next) => {
  try {
    const { id } = req.params;

    const proposal = await Proposal.findById(id).populate("project");
    if (!proposal) {
      return res.status(404).json({ message: "العرض غير موجود" });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = proposal.engineer.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "غير مسموح بحذف هذا العرض" });
    }

    // Engineer can only delete pending proposals
    if (!isAdmin && proposal.status !== "pending") {
      return res.status(403).json({ message: "لا يمكن حذف العرض إلا إذا كان في حالة انتظار" });
    }

    // Decrement project's proposals count
    await Project.updateOne(
      { _id: proposal.project._id || proposal.project }, 
      { $inc: { proposalsCount: -1 } }
    ).catch(() => {});

    await Proposal.findByIdAndDelete(id);

    res.json({
      message: "تم حذف العرض بنجاح",
    });
  } catch (error) {
    next(error);
  }
};

