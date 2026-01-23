const mongoose = require("mongoose");

const TrackingSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: [true, "Event is required"],
      trim: true,
    },
    page: {
      type: String,
      required: [true, "Page is required"],
      trim: true,
    },
    userId: {
      type: String,
      trim: true,
      default: null,
    },
    sessionId: {
      type: String,
      required: [true, "Session ID is required"],
      trim: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    userAgent: {
      type: String,
      trim: true,
    },
    ip: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
TrackingSchema.index({ sessionId: 1 });
TrackingSchema.index({ userId: 1 });
TrackingSchema.index({ event: 1 });
TrackingSchema.index({ page: 1 });
TrackingSchema.index({ createdAt: -1 });
TrackingSchema.index({ createdAt: 1, event: 1, page: 1 }); // Compound index for analytics queries

module.exports = mongoose.models.Tracking || mongoose.model("Tracking", TrackingSchema);
