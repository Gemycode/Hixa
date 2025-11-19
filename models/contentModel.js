const mongoose = require("mongoose");

const ContentSchema = new mongoose.Schema(
  {
    hero: {
      title_en: { type: String, required: true },
      title_ar: { type: String, required: true },
      subtitle_en: { type: String, required: true },
      subtitle_ar: { type: String, required: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Content", ContentSchema);
