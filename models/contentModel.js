const mongoose = require("mongoose");

const ContentSchema = new mongoose.Schema(
  {
    hero: {
      title_en: { type: String, required: true },
      title_ar: { type: String, required: true },
      subtitle_en: { type: String, required: true },
      subtitle_ar: { type: String, required: true },
    },
    about: {
      title_en: { type: String, default: "" },
      title_ar: { type: String, default: "" },
      description_en: { type: String, default: "" },
      description_ar: { type: String, default: "" },
      values: [
        {
          title_en: { type: String, default: "" },
          title_ar: { type: String, default: "" },
          description_en: { type: String, default: "" },
          description_ar: { type: String, default: "" },
          icon: { type: String, default: "" },
        },
      ],
    },
    services: {
      title_en: { type: String, default: "" },
      title_ar: { type: String, default: "" },
      subtitle_en: { type: String, default: "" },
      subtitle_ar: { type: String, default: "" },
      items: [
        {
          _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
          title_en: { type: String, default: "" },
          title_ar: { type: String, default: "" },
          description_en: { type: String, default: "" },
          description_ar: { type: String, default: "" },
          icon: { type: String, default: "" },
        },
      ],
    },
    projects: {
      title_en: { type: String, default: "" },
      title_ar: { type: String, default: "" },
      subtitle_en: { type: String, default: "" },
      subtitle_ar: { type: String, default: "" },
      items: [
        {
          _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
          title_en: { type: String, default: "" },
          title_ar: { type: String, default: "" },
          description_en: { type: String, default: "" },
          description_ar: { type: String, default: "" },
          image: { type: String, default: "" },
          link: { type: String, default: "" },
        },
      ],
    },
    partners: {
      title_en: { type: String, default: "" },
      title_ar: { type: String, default: "" },
      subtitle_en: { type: String, default: "" },
      subtitle_ar: { type: String, default: "" },
      items: [
        {
          _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
          name_en: { type: String, default: "" },
          name_ar: { type: String, default: "" },
          logo: { type: String, default: "" },
          link: { type: String, default: "" },
          isActive: { type: Boolean, default: true },
        },
      ],
    },
    features: {
      title_en: { type: String, default: "" },
      title_ar: { type: String, default: "" },
      subtitle_en: { type: String, default: "" },
      subtitle_ar: { type: String, default: "" },
      items: [
        {
          title_en: { type: String, default: "" },
          title_ar: { type: String, default: "" },
          description_en: { type: String, default: "" },
          description_ar: { type: String, default: "" },
          icon: { type: String, default: "" },
        },
      ],
    },
    cta: {
      title_en: { type: String, default: "" },
      title_ar: { type: String, default: "" },
      subtitle_en: { type: String, default: "" },
      subtitle_ar: { type: String, default: "" },
      buttonText_en: { type: String, default: "" },
      buttonText_ar: { type: String, default: "" },
      buttonLink: { type: String, default: "" },
    },
    jobs: {
      title_en: { type: String, default: "" },
      title_ar: { type: String, default: "" },
      subtitle_en: { type: String, default: "" },
      subtitle_ar: { type: String, default: "" },
      items: [
        {
          _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
          title_en: { type: String, default: "" },
          title_ar: { type: String, default: "" },
          description_en: { type: String, default: "" },
          description_ar: { type: String, default: "" },
          link: { type: String, default: "" },
          isActive: { type: Boolean, default: true },
        },
      ],
    },
    footer: {
      description_en: { type: String, default: "" },
      description_ar: { type: String, default: "" },
      copyright_en: { type: String, default: "" },
      copyright_ar: { type: String, default: "" },
      links: [
        {
          title_en: { type: String, default: "" },
          title_ar: { type: String, default: "" },
          url: { type: String, default: "" },
        },
      ],
      social: [
        {
          name: { type: String, default: "" },
          url: { type: String, default: "" },
        },
      ],
      contact: {
        email: { type: String, default: "" },
        phone: { type: String, default: "" },
        address_en: { type: String, default: "" },
        address_ar: { type: String, default: "" },
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Content", ContentSchema);
