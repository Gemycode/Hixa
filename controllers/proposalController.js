const Proposal = require("../models/proposalModel");
const Project = require("../models/projectModel");

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

