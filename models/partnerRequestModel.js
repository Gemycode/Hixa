const mongoose = require("mongoose");

const PartnerRequestSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    businessType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    logo: {
      type: String,
      default: "",
    },
    portfolioImages: {
      type: [String],
      default: [],
      validate: {
        validator: function(v) {
          return v.length <= 2;
        },
        message: "Portfolio images cannot exceed 2 images"
      }
    },
    adType: {
      type: String,
      enum: ["عادي", "مميز", "premium", "normal"],
      default: "عادي",
    },
    status: {
      type: String,
      enum: ["New", "In Review", "Approved", "Rejected"],
      default: "New",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes
PartnerRequestSchema.index({ status: 1 });
PartnerRequestSchema.index({ email: 1 });
PartnerRequestSchema.index({ phone: 1 });
PartnerRequestSchema.index({ businessType: 1 });
PartnerRequestSchema.index({ createdAt: -1 });

PartnerRequestSchema.set("toJSON", { virtuals: true });
PartnerRequestSchema.set("toObject", { virtuals: true });

module.exports =
  mongoose.models.PartnerRequest || mongoose.model("PartnerRequest", PartnerRequestSchema);
