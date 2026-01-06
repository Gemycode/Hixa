const mongoose = require("mongoose");

const ProposalSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    engineer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      required: true,
    },
    estimatedTimeline: {
      type: String,
      trim: true,
      maxlength: 200,
      required: true,
    },
    relevantExperience: {
      type: String,
      trim: true,
      maxlength: 3000,
    },
    proposedBudget: {
      amount: { type: Number, min: 0 }, // الإجمالي (يُحسب تلقائياً من البنود)
      currency: { type: String, trim: true, maxlength: 10, default: "SAR" },
      items: [ // بنود الميزانية
        {
          description: { type: String, trim: true, maxlength: 500, required: true },
          amount: { type: Number, min: 0, required: true },
        }
      ],
    },
    attachments: [ // الملفات المرفقة
      {
        name: { type: String, trim: true, maxlength: 500 },
        url: { type: String, required: true },
        type: { type: String, trim: true, maxlength: 100 }, // PDF, DOCX, JPG, etc.
        size: { type: Number }, // حجم الملف بالبايت
      }
    ],
    status: {
      type: String,
      enum: ["pending", "reviewed", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Each engineer can submit one proposal per project
ProposalSchema.index({ project: 1, engineer: 1 }, { unique: true });
ProposalSchema.index({ project: 1, status: 1, createdAt: -1 });
ProposalSchema.index({ engineer: 1, status: 1 }); // للبحث السريع عن عروض المهندس
ProposalSchema.index({ status: 1, createdAt: -1 }); // للبحث السريع حسب الحالة

module.exports = mongoose.models.Proposal || mongoose.model("Proposal", ProposalSchema);




















