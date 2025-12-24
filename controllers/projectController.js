const Project = require("../models/projectModel");
const ProjectRoom = require("../models/projectRoomModel");
const ChatRoom = require("../models/chatRoomModel");
const Message = require("../models/messageModel");
const { uploadToCloudinary, uploadFileToCloudinary, deleteFromCloudinary } = require("../middleware/upload");

// Helper to sanitize project data for response
const sanitizeProject = (project) => {
  const projectObj = project.toObject ? project.toObject() : project;
  return {
    id: projectObj._id,
    title: projectObj.title,
    description: projectObj.description,
    location: projectObj.location,
    category: projectObj.category,
    requirements: projectObj.requirements,
    projectType: projectObj.projectType,
    client: projectObj.client,
    assignedEngineer: projectObj.assignedEngineer,
    status: projectObj.status,
    budget: projectObj.budget,
    deadline: projectObj.deadline,
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

// CREATE project (Client only)
exports.createProject = async (req, res, next) => {
  try {
    const {
      title,
      description,
      location,
      category,
      requirements,
      projectType,
      budget,
      deadline,
      tags,
    } = req.body;

    // Client can only create projects for themselves
    // المشروع يبدأ في حالة "Pending Review" وينتظر موافقة الأدمن
    const project = await Project.create({
      title,
      description,
      location,
      category,
      requirements,
      projectType,
      client: req.user._id,
      budget: budget || {},
      deadline: deadline ? new Date(deadline) : undefined,
      tags: tags || [],
      status: "Pending Review", // يبدأ في انتظار مراجعة الأدمن
      adminApproval: {
        status: "pending", // في انتظار المراجعة
      },
    });

    res.status(201).json({
      message: "تم إنشاء المشروع بنجاح",
      data: sanitizeProject(project),
    });
  } catch (error) {
    next(error);
  }
};

// GET all projects (Client sees their own, Admin sees all, Engineer sees assigned)
exports.getProjects = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const { status, projectType, search, city, country } = req.query;

    // Build filters based on user role
    const filters = {};

    if (req.user.role === "client") {
      // Clients only see their own projects
      filters.client = req.user._id;
    } else if (req.user.role === "engineer") {
      // Engineers see projects assigned to them or available projects
      filters.$or = [
        { assignedEngineer: req.user._id },
        { status: "Waiting for Engineers" },
        { status: "Pending Review" },
      ];
    }
    // Admin sees all projects (no filter)

    if (status) {
      filters.status = status;
    }

    if (projectType) {
      filters.projectType = projectType;
    }

    if (city || country) {
      const locationRegex = new RegExp(city || country, "i");
      filters.location = locationRegex;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      filters.$or = [
        ...(filters.$or || []),
        { title: regex },
        { description: regex },
        { tags: { $in: [regex] } },
      ];
    }

    // Only show active projects
    filters.isActive = true;

    // Clients see all their projects (including rejected)
    // Engineers only see approved projects (unless filtering by status)
    // Admin sees all projects (including rejected)
    if (req.user.role === "engineer" && !status) {
      filters["adminApproval.status"] = "approved";
      filters.status = { $ne: "Rejected" }; // المهندسين لا يرون المشاريع المرفوضة
    }
    // Admin و Client يرون جميع المشاريع (لا حاجة لفلتر إضافي)

    const [projects, total] = await Promise.all([
      Project.find(filters)
        .populate("client", "name email")
        .populate("assignedEngineer", "name email")
        .populate("adminApproval.reviewedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Project.countDocuments(filters),
    ]);

    res.json({
      data: projects.map(sanitizeProject),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET single project by ID
exports.getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("client", "name email")
      .populate("assignedEngineer", "name email")
      .populate("adminApproval.reviewedBy", "name email");

    if (!project) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    // Check permissions
    if (req.user.role === "client" && project.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "غير مصرح لك بالوصول لهذا المشروع" });
    }

    if (req.user.role === "engineer") {
      const isAssigned = project.assignedEngineer && project.assignedEngineer._id.toString() === req.user._id.toString();
      const isAvailable = project.status === "Waiting for Engineers" || project.status === "Pending Review";
      if (!isAssigned && !isAvailable) {
        return res.status(403).json({ message: "غير مصرح لك بالوصول لهذا المشروع" });
      }
    }

    res.json({
      data: sanitizeProject(project),
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE project (Client can update their own projects)
exports.updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      location,
      category,
      requirements,
      projectType,
      budget,
      deadline,
      tags,
      status,
      assignedEngineer, // Add this
    } = req.body;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    // Store original assignedEngineer for comparison
    const originalAssignedEngineer = project.assignedEngineer;

    // Check permissions
    if (req.user.role === "client" && project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "غير مصرح لك بتعديل هذا المشروع" });
    }

    // Clients can only update certain fields and can't change status to certain values
    if (req.user.role === "client") {
      if (status && !["Draft", "Pending Review", "Waiting for Engineers"].includes(status)) {
        return res.status(403).json({ message: "لا يمكنك تغيير الحالة إلى هذه القيمة" });
      }
      // Clients can't assign engineers
      if (assignedEngineer !== undefined) {
        return res.status(403).json({ message: "لا يمكنك تعيين مهندس لهذا المشروع" });
      }
    }

    // Update fields
    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (location !== undefined) project.location = location;
    if (category !== undefined) project.category = category;
    if (requirements !== undefined) project.requirements = requirements;
    if (projectType !== undefined) project.projectType = projectType;
    if (budget !== undefined) project.budget = { ...project.budget, ...budget };
    if (deadline !== undefined) project.deadline = deadline ? new Date(deadline) : undefined;
    if (tags !== undefined) project.tags = tags;
    if (status !== undefined && req.user.role !== "client") {
      project.status = status;
    } else if (status !== undefined && ["Draft", "Pending Review", "Waiting for Engineers"].includes(status)) {
      project.status = status;
    }
    
    // Admins can assign engineers
    if (assignedEngineer !== undefined && req.user.role === "admin") {
      project.assignedEngineer = assignedEngineer;
    }

    await project.save();

    // If engineer was assigned, create group chat room
    if (req.user.role === "admin" && 
        assignedEngineer && 
        originalAssignedEngineer?.toString() !== assignedEngineer.toString()) {
      
      try {
        // Get or create ProjectRoom
        let projectRoom = await ProjectRoom.findOne({ project: id });
        
        if (!projectRoom) {
          projectRoom = await ProjectRoom.create({
            project: id,
            projectTitle: project.title,
          });
        }

        // Check if Group ChatRoom already exists
        let groupChatRoom = await ChatRoom.findOne({
          project: id,
          projectRoom: projectRoom._id,
          type: "group",
        });

        if (!groupChatRoom) {
          // Create Group ChatRoom
          groupChatRoom = await ChatRoom.create({
            project: id,
            projectRoom: projectRoom._id,
            type: "group",
            participants: [
              {
                user: project.client,
                role: "client",
                joinedAt: new Date(),
              },
              {
                user: assignedEngineer,
                role: "engineer",
                joinedAt: new Date(),
              },
              // Admin will be added when they join the chat
            ],
          });

          // Send system message about hiring
          const systemMessage = await Message.create({
            chatRoom: groupChatRoom._id,
            sender: "system",
            content: `تم توظيف المهندس ${req.user.name || 'مجهول'} للمشروع "${project.title}". يمكنكم الآن التواصل مباشرة.`,
            type: "system",
          });
          
          // Update chat room's last message
          groupChatRoom.lastMessage = {
            content: systemMessage.content.substring(0, 100),
            sender: "system",
            createdAt: systemMessage.createdAt,
          };
          await groupChatRoom.save();
          
          // Update project room's last activity
          projectRoom.lastActivityAt = systemMessage.createdAt;
          await projectRoom.save();
        } else {
          // Add participants if they don't exist
          const clientExists = groupChatRoom.participants.some(
            p => p.user.toString() === project.client.toString()
          );
          
          const engineerExists = groupChatRoom.participants.some(
            p => p.user.toString() === assignedEngineer.toString()
          );

          let updated = false;
          
          if (!clientExists) {
            groupChatRoom.participants.push({
              user: project.client,
              role: "client",
              joinedAt: new Date(),
            });
            updated = true;
          }

          if (!engineerExists) {
            groupChatRoom.participants.push({
              user: assignedEngineer,
              role: "engineer",
              joinedAt: new Date(),
            });
            updated = true;
          }

          if (updated) {
            await groupChatRoom.save();
            
            // Send system message about adding participants
            const systemMessage = await Message.create({
              chatRoom: groupChatRoom._id,
              sender: "system",
              content: `تم تحديث المشاركين في مجموعة المشروع "${project.title}".`,
              type: "system",
            });
            
            // Update chat room's last message
            groupChatRoom.lastMessage = {
              content: systemMessage.content.substring(0, 100),
              sender: "system",
              createdAt: systemMessage.createdAt,
            };
            await groupChatRoom.save();
            
            // Update project room's last activity
            projectRoom.lastActivityAt = systemMessage.createdAt;
            await projectRoom.save();
          }
        }
      } catch (chatError) {
        // Log error but don't fail the project update
        console.error("Error creating group chat room:", chatError);
      }
    }

    res.json({
      message: "تم تحديث المشروع بنجاح",
      data: sanitizeProject(project),
    });
  } catch (error) {
    next(error);
  }
};

// DELETE project (Client can delete their own projects)
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    // Check permissions
    if (req.user.role === "client" && project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "غير مصرح لك بحذف هذا المشروع" });
    }

    // Soft delete - set isActive to false
    project.isActive = false;
    await project.save();

    res.json({
      message: "تم حذف المشروع بنجاح",
    });
  } catch (error) {
    next(error);
  }
};

// Upload attachment to project
exports.uploadAttachment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;

    // Handle both req.file (single) and req.files (any)
    const file = req.file || (req.files && req.files[0]);
    
    if (!file) {
      return res.status(400).json({ message: "لم يتم رفع أي ملف" });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    // Check permissions
    if (req.user.role === "client" && project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "غير مصرح لك برفع ملفات لهذا المشروع" });
    }

    // Upload to Cloudinary (supports any file type)
    const folder = `hixa/projects/${id}/attachments`;
    const fileUrl = await uploadFileToCloudinary(file.buffer, folder, file.originalname);

    // Determine file type
    let fileType = type;
    if (!fileType) {
      if (file.mimetype.startsWith("image/")) {
        fileType = "image";
      } else if (file.mimetype.includes("pdf")) {
        fileType = "document";
      } else if (file.mimetype.includes("word") || file.mimetype.includes("document")) {
        fileType = "document";
      } else {
        fileType = "other";
      }
    }

    // Add attachment to project
    project.attachments.push({
      name: name || file.originalname,
      url: fileUrl,
      type: fileType,
    });

    await project.save();

    res.json({
      message: "تم رفع الملف بنجاح",
      data: project.attachments[project.attachments.length - 1],
    });
  } catch (error) {
    next(error);
  }
};

// Delete attachment from project
exports.deleteAttachment = async (req, res, next) => {
  try {
    const { id, attachmentId } = req.params;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    // Check permissions
    if (req.user.role === "client" && project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "غير مصرح لك بحذف ملفات من هذا المشروع" });
    }

    const attachment = project.attachments.id(attachmentId);

    if (!attachment) {
      return res.status(404).json({ message: "الملف غير موجود" });
    }

    // Delete from Cloudinary if it's a Cloudinary URL
    if (attachment.url && attachment.url.includes("cloudinary.com")) {
      await deleteFromCloudinary(attachment.url);
    }

    // Remove attachment
    project.attachments.pull(attachmentId);
    await project.save();

    res.json({
      message: "تم حذف الملف بنجاح",
    });
  } catch (error) {
    next(error);
  }
};

// Approve project (Admin only)
exports.approveProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    if (project.adminApproval.status === "approved") {
      return res.status(400).json({ message: "تم الموافقة على هذا المشروع بالفعل" });
    }

    // Update admin approval
    project.adminApproval.status = "approved";
    project.adminApproval.reviewedBy = req.user._id;
    project.adminApproval.reviewedAt = new Date();
    project.status = "Waiting for Engineers"; // بعد الموافقة، ينتظر المهندسين

    await project.save();

    res.json({
      message: "تم الموافقة على المشروع بنجاح",
      data: sanitizeProject(project),
    });
  } catch (error) {
    next(error);
  }
};

// Reject project (Admin only)
exports.rejectProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return res.status(400).json({ message: "يجب إضافة سبب الرفض" });
    }

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    if (project.adminApproval.status === "rejected") {
      return res.status(400).json({ message: "تم رفض هذا المشروع بالفعل" });
    }

    // Update admin approval
    project.adminApproval.status = "rejected";
    project.adminApproval.reviewedBy = req.user._id;
    project.adminApproval.reviewedAt = new Date();
    project.adminApproval.rejectionReason = rejectionReason.trim();
    project.status = "Rejected"; // رفض المشروع

    await project.save();

    res.json({
      message: "تم رفض المشروع",
      data: sanitizeProject(project),
    });
  } catch (error) {
    next(error);
  }
};

// Get pending projects for admin review
exports.getPendingProjects = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const filters = {
      "adminApproval.status": "pending",
      status: "Pending Review",
      isActive: true,
    };

    const [projects, total] = await Promise.all([
      Project.find(filters)
        .populate("client", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Project.countDocuments(filters),
    ]);

    res.json({
      data: projects.map(sanitizeProject),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get project statistics (for dashboard)
exports.getProjectStatistics = async (req, res, next) => {
  try {
    const filters = {};

    if (req.user.role === "client") {
      filters.client = req.user._id;
    } else if (req.user.role === "engineer") {
      filters.assignedEngineer = req.user._id;
    }

    filters.isActive = true;

    const [
      total,
      draft,
      pendingReview,
      waitingForEngineers,
      inProgress,
      completed,
    ] = await Promise.all([
      Project.countDocuments(filters),
      Project.countDocuments({ ...filters, status: "Draft" }),
      Project.countDocuments({ ...filters, status: "Pending Review" }),
      Project.countDocuments({ ...filters, status: "Waiting for Engineers" }),
      Project.countDocuments({ ...filters, status: "In Progress" }),
      Project.countDocuments({ ...filters, status: "Completed" }),
    ]);

    res.json({
      total,
      draft,
      pendingReview,
      waitingForEngineers,
      inProgress,
      completed,
    });
  } catch (error) {
    next(error);
  }
};

