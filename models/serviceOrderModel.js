const mongoose = require("mongoose");

const ServiceOrderSchema = new mongoose.Schema(
  {
    orderDetails: {
      type: String,
      required: true,
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
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
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
// aya
ServiceOrderSchema.index({ status: 1 });
ServiceOrderSchema.index({ email: 1 });
ServiceOrderSchema.index({ phone: 1 });
ServiceOrderSchema.index({ createdAt: -1 });

ServiceOrderSchema.set("toJSON", { virtuals: true });
ServiceOrderSchema.set("toObject", { virtuals: true });

module.exports =
  mongoose.models.ServiceOrder || mongoose.model("ServiceOrder", ServiceOrderSchema);

