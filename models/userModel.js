const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "engineer", "client", "company", "customer"], default: "customer" },
    name: { type: String, trim: true },
    phone: { type: String, trim: true, maxlength: 50 },
    countryCode: { type: String, trim: true, maxlength: 10 }, // كود البلد للجوال (مثل +966, +971)
    nationalId: { type: String, trim: true, maxlength: 20, unique: true, sparse: true }, // الرقم القومي
    // Location fields
    country: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    // Keep location for backward compatibility (optional)
    location: { type: String, trim: true, maxlength: 200 },
    bio: { type: String, trim: true, maxlength: 1000 },
  specializations: [
    {
      type: String,
      trim: true,
      maxlength: 100,
    },
  ],
  certifications: [
    {
      title: { type: String, trim: true, maxlength: 200 },
      year: { type: Number, min: 1900, max: 2100 },
    },
  ],
  averageRating: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },
    avatar: {
      url: { type: String, trim: true },
      uploadedAt: { type: Date, default: Date.now },
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

// Index for faster queries
// Note: email already has unique index from schema definition, so we don't need to add it again
UserSchema.index({ role: 1 });

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) {
    this.password = (await this.constructor.findById(this._id).select("password")).password;
  }
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
