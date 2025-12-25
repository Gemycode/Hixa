const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    // Location fields
    country: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    // Keep location for backward compatibility (optional, can be auto-generated)
    location: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    requirements: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    projectType: {
      type: String,
      enum: [
        "Architecture",
        "Construction",
        "Civil Engineering",
        "Mechanical Engineering",
        "Electrical Engineering",
        "Interior Design",
        "Landscape Design",
        "Structural Engineering",
        "Other",
      ],
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedEngineer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: [
        "Draft", // مسودة
        "Pending Review", // في انتظار المراجعة
        "Waiting for Engineers", // في انتظار المهندسين
        "In Progress", // قيد التنفيذ
        "Completed", // مكتمل
        "Cancelled", // ملغي
        "Rejected", // مرفوض من الأدمن
      ],
      default: "Pending Review", // يبدأ في انتظار المراجعة
    },
    budget: {
      amount: { type: Number, min: 0 },
      currency: { type: String, default: "SAR", maxlength: 10 },
    },
    startDate: {
      type: Date,
    },
    deadline: {
      type: Date,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: [
            "Draft",
            "Pending Review",
            "Waiting for Engineers",
            "In Progress",
            "Completed",
            "Cancelled",
            "Rejected",
          ],
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        reason: {
          type: String,
          trim: true,
          maxlength: 500,
        },
      },
    ],
    attachments: [
      {
        name: { type: String, trim: true },
        url: { type: String, required: true },
        type: { type: String, enum: ["image", "document", "other"] },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    proposalsCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
    // نظام موافقة الأدمن
    adminApproval: {
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reviewedAt: {
        type: Date,
      },
      rejectionReason: {
        type: String,
        trim: true,
        maxlength: 1000,
      },
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
ProjectSchema.index({ client: 1, status: 1 });
ProjectSchema.index({ assignedEngineer: 1 });
ProjectSchema.index({ projectType: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ createdAt: -1 });
ProjectSchema.index({ location: 1 });
ProjectSchema.index({ country: 1, city: 1 }); // للبحث السريع حسب الموقع
ProjectSchema.index({ country: 1 }); // للبحث حسب الدولة
ProjectSchema.index({ city: 1 }); // للبحث حسب المدينة
ProjectSchema.index({ category: 1 });
ProjectSchema.index({ "adminApproval.status": 1, status: 1 }); // للبحث السريع عن المشاريع في انتظار المراجعة

// Ensure virtuals are included in JSON
ProjectSchema.set("toJSON", { virtuals: true });
ProjectSchema.set("toObject", { virtuals: true });

module.exports = mongoose.models.Project || mongoose.model("Project", ProjectSchema);

