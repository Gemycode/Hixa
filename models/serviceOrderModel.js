const mongoose = require("mongoose");

const ServiceOrderSchema = new mongoose.Schema(
  {
    serviceId: {
      type: String,
      required: true, // Will be auto-determined in controller if not provided
      trim: true,
      maxlength: 200,
    },
    serviceType: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    orderDetails: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    image: {
      url: { type: String, trim: true },
      uploadedAt: { type: Date, default: Date.now },
    },
    status: {
      type: String,
      enum: ["New", "In Review", "Processing", "Completed", "Cancelled"],
      default: "New",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

ServiceOrderSchema.index({ serviceId: 1 });
ServiceOrderSchema.index({ serviceType: 1 });
ServiceOrderSchema.index({ status: 1 });
ServiceOrderSchema.index({ email: 1 });
ServiceOrderSchema.index({ createdAt: -1 });

ServiceOrderSchema.set("toJSON", { virtuals: true });
ServiceOrderSchema.set("toObject", { virtuals: true });

module.exports =
  mongoose.models.ServiceOrder || mongoose.model("ServiceOrder", ServiceOrderSchema);

