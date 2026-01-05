const Project = require("../models/projectModel");
const ProjectRoom = require("../models/projectRoomModel");
const ChatRoom = require("../models/chatRoomModel");
const Message = require("../models/messageModel");
const Proposal = require("../models/proposalModel");
const ProjectNote = require("../models/projectNoteModel");
const User = require("../models/userModel");
const { uploadToCloudinary, uploadFileToCloudinary, deleteFromCloudinary } = require("../middleware/upload");
const { getSystemUserId } = require("../utils/systemUser");
const { createNotification } = require("./notificationController");
const { validateStatusTransition } = require("../utils/projectStatusValidator");

// Helper to sanitize project data for response
const sanitizeProject = (project) => {
  const projectObj = project.toObject ? project.toObject() : project;
  return {
    id: projectObj._id,
    title: projectObj.title,
    description: projectObj.description,
    country: projectObj.country,
    city: projectObj.city,
    location: projectObj.location, // Keep for backward compatibility
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

// CREATE project (Client only)
exports.createProject = async (req, res, next) => {
  try {
    const {
      title,
      description,
      country,
      city,
      location, // Keep for backward compatibility
      category,
      requirements,
      projectType,
      budget,
      startDate,
      deadline,
      tags,
    } = req.body;

    // Auto-generate location if not provided (for backward compatibility)
    const generatedLocation = location || (country && city ? `${city}, ${country}` : null);

    // Client can only create projects for themselves
    // المشروع يبدأ في حالة "Pending Review" وينتظر موافقة الأدمن
    const project = await Project.create({
      title,
      description,
      country,
      city,
      location: generatedLocation,
      category,
      requirements,
      projectType,
      client: req.user._id,
      budget: budget || {},
      startDate: startDate ? new Date(startDate) : undefined,
      deadline: deadline ? new Date(deadline) : undefined,
      progress: 0,
      statusHistory: [
        {
          status: "Pending Review",
          changedBy: req.user._id,
          changedAt: new Date(),
        },
      ],
      tags: tags || [],
      status: "Pending Review", // يبدأ في انتظار مراجعة الأدمن
      adminApproval: {
        status: "pending", // في انتظار المراجعة
      },
    });

    // Notify all admins about new project
    try {
      const adminUsers = await User.find({ role: "admin", isActive: true }).select("_id");
      if (adminUsers.length > 0) {
        const clientName = req.user.name || 'مجهول';
        const adminNotificationPromises = adminUsers.map(admin =>
          createNotification({
            user: admin._id,
            type: "project_created",
            title: "مشروع جديد",
            message: `العميل ${clientName} أنشأ مشروع جديد "${project.title}" ويحتاج إلى مراجعة`,
            data: {
              projectId: project._id,
            },
            actionUrl: `/admin/projects/${project._id}`,
          }).catch(err => console.error("❌ Error creating admin notification:", err))
        );
        await Promise.all(adminNotificationPromises);
        console.log(`✅ Created ${adminUsers.length} notification(s) for admins about new project`);
      }
    } catch (notifError) {
      console.error("❌ Error creating notifications:", notifError);
      // Don't fail the project creation if notification fails
    }

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

    const { status, projectType, search, city, country, category, browseOnly } = req.query;

    // Build filters based on user role
    const filters = {};
    const andConditions = [];

    // Role-based filters
    if (req.user.role === "client") {
      // Check if this is a "browse only" request (for browse projects page)
      // Handle both string "true" and boolean true
      const isBrowseOnly = browseOnly === "true" || browseOnly === true || browseOnly === "1";
      
      console.log("🔍 Client request details:", {
        userId: req.user._id,
        browseOnly: browseOnly,
        isBrowseOnly: isBrowseOnly,
        allQueryParams: req.query,
      });
      
      if (isBrowseOnly) {
        // For "Browse Projects" page: Only show public approved projects (NOT own projects)
        // Public projects: approved and in specific statuses (Waiting for Engineers, In Progress, Completed)
        // Exclude cancelled and rejected projects
        andConditions.push({
          $and: [
            { client: { $ne: req.user._id } }, // Exclude own projects
            { "adminApproval.status": "approved" }, // Must be approved
            { status: { $in: ["Waiting for Engineers", "In Progress", "Completed"] } }, // Only these statuses
            { status: { $nin: ["Cancelled", "Rejected"] } }, // Exclude cancelled and rejected
          ],
        });
        console.log("🔍 Client browse-only filter applied (public projects only):", {
          userId: req.user._id,
          excludesOwnProjects: true,
          requiresApproval: true,
          allowedStatuses: ["Waiting for Engineers", "In Progress", "Completed"],
        });
      } else {
        // For "My Projects" page: Show ONLY own projects (not public projects)
        filters.client = req.user._id;
        console.log("🔍 Client filter applied (own projects only):", {
          userId: req.user._id,
          includesOwnProjects: true,
          includesPublicProjects: false,
        });
      }
    } else if (req.user.role === "engineer" || req.user.role === "company") {
      // Engineers and companies see all projects assigned to them (regardless of status) or available projects
      // Show cancelled projects too (but they won't be available for proposals)
      andConditions.push({
        $or: [
          { assignedEngineer: req.user._id }, // All assigned projects regardless of status (including cancelled)
          { status: { $in: ["Waiting for Engineers", "Pending Review", "Cancelled"] } }, // Show cancelled projects too
        ],
      });
    }
    // Admin sees all projects (no filter)

    // Status filter
    if (status) {
      filters.status = status;
    }

    // Project type filter
    if (projectType) {
      filters.projectType = projectType;
    }

    // Category filter (نطاق الأعمال)
    if (category) {
      filters.category = category;
    }

    // Location filters (country and city)
    if (country) {
      filters.country = country;
    }
    if (city) {
      filters.city = city;
    }
    // Backward compatibility: if location is provided instead of country/city
    if (!country && !city && req.query.location) {
      const locationRegex = new RegExp(req.query.location, "i");
      andConditions.push({
        $or: [
          { location: locationRegex },
          { country: locationRegex },
          { city: locationRegex },
        ],
      });
    }

    // Search filter
    if (search) {
      const regex = new RegExp(search, "i");
      andConditions.push({
        $or: [
          { title: regex },
          { description: regex },
          { tags: { $in: [regex] } },
        ],
      });
    }

    // Only show active projects
    filters.isActive = true;

    // Clients see all their projects (including rejected and cancelled)
    // Engineers and companies see approved projects (including cancelled - but cancelled won't accept proposals)
    // Admin sees all projects (including rejected and cancelled)
    if ((req.user.role === "engineer" || req.user.role === "company") && !status) {
      filters["adminApproval.status"] = "approved";
      filters.status = { $ne: "Rejected" }; // المهندسين والشركات لا يرون المشاريع المرفوضة (لكن يرون الملغية للتوثيق)
    }

    // Combine all conditions using $and if needed
    if (andConditions.length > 0) {
      filters.$and = andConditions;
    }
    // Admin و Client يرون جميع المشاريع (لا حاجة لفلتر إضافي)

    // Log final filters for debugging
    if (req.user.role === "client") {
      console.log("🔍 Final filters for client:", JSON.stringify(filters, null, 2));
      console.log("🔍 Query params:", {
        browseOnly: browseOnly,
        page: page,
        limit: limit,
        skip: skip,
      });
    }

    // Get all projects - sort by creation date (newest first) for all users
    let projects;
    let total;

    [projects, total] = await Promise.all([
      Project.find(filters)
        .populate("client", "name email")
        .populate("assignedEngineer", "name email")
        .populate("adminApproval.reviewedBy", "name email")
        .sort({ createdAt: -1 }) // Sort by creation date: newest first
        .skip(skip)
        .limit(limit),
      Project.countDocuments(filters),
    ]);

    // Log results for debugging
    if (req.user.role === "client") {
      console.log("📊 Client projects query results:", {
        total,
        projectsCount: projects.length,
        statuses: projects.map((p) => ({
          id: p._id,
          title: p.title,
          status: p.status,
          adminApproval: p.adminApproval?.status,
          client: p.client?._id?.toString(),
          isOwnProject: p.client?._id?.toString() === req.user._id.toString(),
        })),
      });
    }

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

// GET single project by ID with detailed information
exports.getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("client", "name email avatar")
      .populate("assignedEngineer", "name email avatar")
      .populate("adminApproval.reviewedBy", "name email");

    if (!project) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    // Check permissions
    if (req.user.role === "client" && project.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "غير مصرح لك بالوصول لهذا المشروع" });
    }

    if (req.user.role === "engineer" || req.user.role === "company") {
      const isAssigned = project.assignedEngineer && project.assignedEngineer._id.toString() === req.user._id.toString();
      const isAvailable = project.status === "Waiting for Engineers" || project.status === "Pending Review";
      if (!isAssigned && !isAvailable) {
        return res.status(403).json({ message: "غير مصرح لك بالوصول لهذا المشروع" });
      }
    }

    // Get additional details

    // Get proposals count and details (based on user role)
    let proposalsInfo = {
      total: 0,
      pending: 0,
      accepted: 0,
      rejected: 0,
      myProposal: null, // For engineers and companies: their proposal if exists
    };

    try {
      const proposalFilters = { project: project._id };
      
      // Engineers and companies only see their own proposal count/details
      if (req.user.role === "engineer" || req.user.role === "company") {
        proposalFilters.engineer = req.user._id;
        const myProposal = await Proposal.findOne(proposalFilters)
          .populate("engineer", "name email avatar")
          .lean();
        if (myProposal) {
          proposalsInfo.total = 1;
          proposalsInfo[myProposal.status] = 1;
          proposalsInfo.myProposal = {
            id: myProposal._id,
            description: myProposal.description,
            estimatedTimeline: myProposal.estimatedTimeline,
            proposedBudget: myProposal.proposedBudget,
            status: myProposal.status,
            createdAt: myProposal.createdAt,
          };
        }
      } else {
        // Admin and Client see all proposals
        const [total, pending, accepted, rejected] = await Promise.all([
          Proposal.countDocuments(proposalFilters),
          Proposal.countDocuments({ ...proposalFilters, status: "pending" }),
          Proposal.countDocuments({ ...proposalFilters, status: "accepted" }),
          Proposal.countDocuments({ ...proposalFilters, status: "rejected" }),
        ]);
        
        proposalsInfo.total = total;
        proposalsInfo.pending = pending;
        proposalsInfo.accepted = accepted;
        proposalsInfo.rejected = rejected;
      }
    } catch (proposalError) {
      console.error("Error fetching proposals info:", proposalError);
      // Continue without proposals info
    }

    // Get ProjectRoom info if exists
    let projectRoomInfo = null;
    try {
      const projectRoom = await ProjectRoom.findOne({ project: project._id }).lean();
      if (projectRoom) {
        projectRoomInfo = {
          id: projectRoom._id,
          lastActivityAt: projectRoom.lastActivityAt,
        };
      }
    } catch (projectRoomError) {
      console.error("Error fetching project room info:", projectRoomError);
    }

    // Get ChatRooms count (if user has access)
    let chatRoomsCount = 0;
    try {
      if (projectRoomInfo) {
        const chatRooms = await ChatRoom.find({ project: project._id });
        // Filter based on user role and participation
        if (req.user.role === "admin") {
          chatRoomsCount = chatRooms.length;
        } else {
          chatRoomsCount = chatRooms.filter(room => {
            return room.participants.some(p => p.user.toString() === req.user._id.toString());
          }).length;
        }
      }
    } catch (chatRoomError) {
      console.error("Error fetching chat rooms count:", chatRoomError);
    }

    // Build response with project data and additional info
    const projectData = sanitizeProject(project);
    
    res.json({
      data: {
        ...projectData,
        // Additional detailed information
        proposals: proposalsInfo,
        projectRoom: projectRoomInfo,
        chatRoomsCount,
        // Calculate duration if start date exists (for future use)
        // duration: project.startDate && project.deadline 
        //   ? Math.ceil((new Date(project.deadline) - new Date(project.startDate)) / (1000 * 60 * 60 * 24))
        //   : null,
      },
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
      country,
      city,
      location, // Keep for backward compatibility
      category,
      requirements,
      projectType,
      budget,
      startDate,
      deadline,
      progress,
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

    // Validate status transition if status is being changed
    if (status !== undefined && status !== project.status) {
      const validation = validateStatusTransition(project.status, status, req.user.role, project);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
      }
    }

    // Update fields
    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (country !== undefined) project.country = country;
    if (city !== undefined) project.city = city;
    if (location !== undefined) project.location = location;
    // Auto-update location if country/city changed
    if (country !== undefined || city !== undefined) {
      const newCountry = country !== undefined ? country : project.country;
      const newCity = city !== undefined ? city : project.city;
      if (newCountry && newCity) {
        project.location = `${newCity}, ${newCountry}`;
      }
    }
    if (category !== undefined) project.category = category;
    if (requirements !== undefined) project.requirements = requirements;
    if (projectType !== undefined) project.projectType = projectType;
    if (budget !== undefined) project.budget = { ...project.budget, ...budget };
    if (startDate !== undefined) project.startDate = startDate ? new Date(startDate) : undefined;
    if (deadline !== undefined) project.deadline = deadline ? new Date(deadline) : undefined;
    if (progress !== undefined) {
      const progressValue = parseInt(progress, 10);
      if (progressValue >= 0 && progressValue <= 100) {
        project.progress = progressValue;
      }
    }
    if (tags !== undefined) project.tags = tags;
    
    // Update status with history tracking
    if (status !== undefined && status !== project.status) {
      if (req.user.role !== "client") {
        // Add to status history for non-client users
        if (!project.statusHistory) {
          project.statusHistory = [];
        }
        project.statusHistory.push({
          status: project.status, // Previous status
          changedBy: req.user._id,
          changedAt: new Date(),
        });
      }
      // Update status
      project.status = status;
    } else if (status !== undefined && ["Draft", "Pending Review", "Waiting for Engineers"].includes(status) && req.user.role === "client") {
      // Client can only set these statuses without history tracking
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
          // adminObserver: true - Admin can see messages but not participate
          groupChatRoom = await ChatRoom.create({
            project: id,
            projectRoom: projectRoom._id,
            type: "group",
            adminObserver: true, // Admin is observer only, cannot send messages
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
              // Admin is observer, not a participant
            ],
          });

          // Send system message about hiring and admin observation
          const systemUserId = await getSystemUserId();
          const systemMessage = await Message.create({
            chatRoom: groupChatRoom._id,
            sender: systemUserId,
            content: `تم توظيف المهندس ${req.user.name || 'مجهول'} للمشروع "${project.title}". يمكنكم الآن التواصل مباشرة. ملاحظة: يتم رؤية محتوى هذه الدردشة من قبل الإدارة لضمان حقوق الطرفين.`,
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
            const systemUserId = await getSystemUserId();
            const systemMessage = await Message.create({
              chatRoom: groupChatRoom._id,
              sender: systemUserId,
              content: `تم تحديث المشاركين في مجموعة المشروع "${project.title}".`,
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

// CANCEL project (Client can cancel their own projects, Admin can cancel any project)
exports.cancelProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    // Check permissions - client can cancel their own projects, admin can cancel any project
    if (req.user.role === "admin") {
      // Admin can cancel any project
    } else if (req.user.role === "client" && project.client.toString() === req.user._id.toString()) {
      // Client can cancel their own projects
    } else {
      return res.status(403).json({ message: "غير مصرح لك بإلغاء هذا المشروع" });
    }

    // Check if project can be cancelled (not already completed or cancelled)
    if (project.status === "Completed") {
      return res.status(400).json({ message: "لا يمكن إلغاء مشروع مكتمل" });
    }
    
    if (project.status === "Cancelled") {
      return res.status(400).json({ message: "المشروع ملغي بالفعل" });
    }

    // Update project status to Cancelled
    const oldStatus = project.status;
    project.status = "Cancelled";
    
    // Add to status history with cancellation info
    const cancellationReason = req.user.role === "admin" 
      ? "تم الإلغاء من قبل الأدمن"
      : "تم الإلغاء من قبل العميل";
    
    project.statusHistory.push({
      status: "Cancelled",
      changedBy: req.user._id,
      changedAt: new Date(),
      reason: cancellationReason,
      cancelledBy: req.user.role, // Mark who cancelled it (admin or client)
    });

    // Keep isActive = true so project remains visible for documentation
    // But it won't be available for proposals (filtered by status)
    // project.isActive remains true
    
    await project.save();

    res.json({
      message: "تم إلغاء المشروع بنجاح",
      data: sanitizeProject(project),
    });
  } catch (error) {
    next(error);
  }
};

// DELETE project (Client can delete their own projects - Soft Delete)
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

// HARD DELETE project (Admin only - Permanent deletion)
exports.hardDeleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    // Only admin can hard delete
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "الحذف النهائي متاح للأدمن فقط" });
    }

    // Delete project permanently
    await Project.findByIdAndDelete(req.params.id);

    res.json({
      message: "تم حذف المشروع نهائياً",
    });
  } catch (error) {
    next(error);
  }
};

// DUPLICATE project (Create a copy of an existing project)
exports.duplicateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const originalProject = await Project.findById(id);

    if (!originalProject) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    // Check permissions - only client can duplicate their own projects, or admin
    if (req.user.role === "client" && originalProject.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "غير مصرح لك بنسخ هذا المشروع" });
    }

    // Create duplicate
    const duplicateData = {
      title: `نسخة من ${originalProject.title}`,
      description: originalProject.description,
      country: originalProject.country,
      city: originalProject.city,
      location: originalProject.location,
      category: originalProject.category,
      requirements: originalProject.requirements,
      projectType: originalProject.projectType,
      budget: originalProject.budget,
      startDate: originalProject.startDate,
      deadline: originalProject.deadline,
      tags: originalProject.tags,
      client: originalProject.client,
      status: "Draft", // Always start as Draft
      progress: 0,
      statusHistory: [
        {
          status: "Draft",
          changedBy: req.user._id,
          changedAt: new Date(),
          reason: "Duplicate project",
        },
      ],
      adminApproval: {
        status: "pending",
      },
      // Don't copy: assignedEngineer, attachments, proposalsCount, proposals
    };

    const duplicatedProject = await Project.create(duplicateData);

    res.status(201).json({
      message: "تم نسخ المشروع بنجاح",
      data: sanitizeProject(duplicatedProject),
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
    
    // Add status history entry
    if (!project.statusHistory) {
      project.statusHistory = [];
    }
    project.statusHistory.push({
      status: project.status,
      changedBy: req.user._id,
      changedAt: new Date(),
      reason: "Admin approval",
    });
    
    project.status = "Waiting for Engineers"; // بعد الموافقة، ينتظر المهندسين

    await project.save();

    // Notify Client
    try {
      await createNotification({
        user: project.client,
        type: "project_approved",
        title: "تم الموافقة على مشروعك",
        message: `تم الموافقة على مشروعك "${project.title}" وهو الآن في انتظار المهندسين`,
        data: {
          projectId: project._id,
        },
        actionUrl: `/projects/${project._id}`,
      }).catch(err => console.error("Error creating project approval notification:", err));
    } catch (notifError) {
      console.error("Error creating notification:", notifError);
    }

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
    
    // Add status history entry
    if (!project.statusHistory) {
      project.statusHistory = [];
    }
    project.statusHistory.push({
      status: project.status,
      changedBy: req.user._id,
      changedAt: new Date(),
      reason: `Rejection: ${rejectionReason.trim()}`,
    });
    
    project.status = "Rejected"; // رفض المشروع

    await project.save();

    // Notify Client
    try {
      await createNotification({
        user: project.client,
        type: "project_rejected",
        title: "تم رفض مشروعك",
        message: `تم رفض مشروعك "${project.title}". السبب: ${rejectionReason.trim()}`,
        data: {
          projectId: project._id,
        },
        actionUrl: `/projects/${project._id}`,
      }).catch(err => console.error("Error creating project rejection notification:", err));
    } catch (notifError) {
      console.error("Error creating notification:", notifError);
    }

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

// Add note to project
exports.addProjectNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note, isInternal } = req.body;

    if (!note || note.trim().length === 0) {
      return res.status(400).json({ message: "الملاحظة مطلوبة" });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    // Check permissions
    if (req.user.role === "client" && project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "غير مصرح لك بإضافة ملاحظات لهذا المشروع" });
    }

    // Clients cannot create internal notes
    const noteIsInternal = req.user.role !== "client" && (isInternal === true || isInternal === "true");

    const projectNote = await ProjectNote.create({
      project: project._id,
      note: note.trim(),
      createdBy: req.user._id,
      isInternal: noteIsInternal,
    });

    const populatedNote = await ProjectNote.findById(projectNote._id)
      .populate("createdBy", "name email avatar");

    res.status(201).json({
      message: "تم إضافة الملاحظة بنجاح",
      data: populatedNote,
    });
  } catch (error) {
    next(error);
  }
};

// Get project notes
exports.getProjectNotes = async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    // Check permissions
    if (req.user.role === "client" && project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "غير مصرح لك بعرض ملاحظات هذا المشروع" });
    }

    // Filter notes based on user role
    const filters = { project: project._id };
    
    // Clients cannot see internal notes
    if (req.user.role === "client") {
      filters.isInternal = false;
    }

    const notes = await ProjectNote.find(filters)
      .populate("createdBy", "name email avatar")
      .sort({ createdAt: -1 });

    res.json({
      data: notes,
    });
  } catch (error) {
    next(error);
  }
};

// Delete project note
exports.deleteProjectNote = async (req, res, next) => {
  try {
    const { id, noteId } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    const note = await ProjectNote.findById(noteId);
    if (!note || note.project.toString() !== id) {
      return res.status(404).json({ message: "الملاحظة غير موجودة" });
    }

    // Check permissions: user can delete their own notes, admin can delete any
    if (note.createdBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "غير مصرح لك بحذف هذه الملاحظة" });
    }

    await ProjectNote.findByIdAndDelete(noteId);

    res.json({
      message: "تم حذف الملاحظة بنجاح",
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
    } else if (req.user.role === "engineer" || req.user.role === "company") {
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

