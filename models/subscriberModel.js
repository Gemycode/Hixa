const mongoose = require("mongoose");

const SubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true, // Allows multiple nulls but unique when present
    },
    phone: {
      type: String,
      trim: true,
      sparse: true, // Allows multiple nulls but unique when present
    },
    // At least one of email or phone must be provided
    name: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    source: {
      type: String,
      enum: ["newsletter", "contact", "manual"],
      default: "newsletter",
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: {
      type: Date,
    },
    lastEmailSent: {
      type: Date,
    },
    emailCount: {
      type: Number,
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

// Compound index: email and phone should be unique together, but allow nulls
SubscriberSchema.index({ email: 1, phone: 1 }, { unique: true, sparse: true });

// Index for faster queries
SubscriberSchema.index({ email: 1 });
SubscriberSchema.index({ phone: 1 });
SubscriberSchema.index({ isActive: 1 });
SubscriberSchema.index({ subscribedAt: -1 });
SubscriberSchema.index({ source: 1 });

// Validation: At least email or phone must be provided
SubscriberSchema.pre("validate", function (next) {
  if (!this.email && !this.phone) {
    return next(new Error("يجب توفير البريد الإلكتروني أو رقم الهاتف"));
  }
  next();
});

module.exports = mongoose.models.Subscriber || mongoose.model("Subscriber", SubscriberSchema);














