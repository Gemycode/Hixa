const mongoose = require("mongoose");

const WorkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    client: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    status: {
      type: String,
      enum: ["Pending Review", "In Progress", "Completed"],
      default: "Pending Review",
    },
    mainImage: {
      url: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
    },
    gallery: [
      {
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    keyFeatures: [
      {
        type: String,
        trim: true,
        maxlength: 300,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

WorkSchema.index({ category: 1 });
WorkSchema.index({ status: 1 });
WorkSchema.index({ createdBy: 1 });
WorkSchema.index({ createdAt: -1 });

WorkSchema.set("toJSON", { virtuals: true });
WorkSchema.set("toObject", { virtuals: true });

module.exports = mongoose.models.Work || mongoose.model("Work", WorkSchema);


