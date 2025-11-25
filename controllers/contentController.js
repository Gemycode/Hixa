const Content = require("../models/contentModel");
const { uploadToCloudinary, deleteFromCloudinary } = require("../middleware/upload");
const mongoose = require("mongoose");

// Helper function to update content section
const updateSection = async (sectionName, updateData, res) => {
  try {
    const updateFields = {};
    Object.keys(updateData).forEach((key) => {
      updateFields[`${sectionName}.${key}`] = updateData[key];
    });

    const updated = await Content.findOneAndUpdate(
      {},
      { $set: updateFields },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      message: `تم تحديث ${sectionName} بنجاح`,
      data: updated[sectionName],
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// Helper function to filter content by language
const filterByLanguage = (content, lang = "en") => {
  if (!content) return null;

  const filtered = JSON.parse(JSON.stringify(content)); // Deep clone

  const processSection = (section) => {
    if (!section) return section;

    // Replace _en or _ar fields with single field based on language
    Object.keys(section).forEach((key) => {
      if (key.endsWith("_en") || key.endsWith("_ar")) {
        const baseKey = key.replace(/_en$|_ar$/, "");
        const langKey = `${baseKey}_${lang}`;

        if (key === langKey) {
          // Rename to base key (remove _en or _ar)
          section[baseKey] = section[key];
        }
        // Delete the old key
        delete section[key];
      }
    });

    // Process nested arrays (items, values, links, social)
    ["items", "values", "links", "social"].forEach((arrayKey) => {
      if (Array.isArray(section[arrayKey])) {
        section[arrayKey] = section[arrayKey].map((item) => {
          const processed = { ...item };
          Object.keys(item).forEach((key) => {
            if (key.endsWith("_en") || key.endsWith("_ar")) {
              const baseKey = key.replace(/_en$|_ar$/, "");
              const langKey = `${baseKey}_${lang}`;

              if (key === langKey) {
                processed[baseKey] = item[key];
              }
              delete processed[key];
            }
          });
          return processed;
        });
      }
    });

    return section;
  };

  // Process all sections
  Object.keys(filtered).forEach((key) => {
    if (typeof filtered[key] === "object" && filtered[key] !== null && !Array.isArray(filtered[key])) {
      filtered[key] = processSection(filtered[key]);
    }
  });

  return filtered;
};

// GET all content
exports.getContent = async (req, res) => {
  try {
    const { lang } = req.query; // lang can be 'en' or 'ar'
    let content = await Content.findOne();
    
    if (!content) {
      content = await Content.create({});
    }

    // If language is specified, filter the content
    if (lang === "en" || lang === "ar") {
      content = filterByLanguage(content, lang);
    }

    res.json(content);
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// UPDATE hero section
exports.updateHero = async (req, res) => {
  const { title_en, title_ar, subtitle_en, subtitle_ar } = req.body;
  await updateSection("hero", { title_en, title_ar, subtitle_en, subtitle_ar }, res);
};

// UPDATE about section
exports.updateAbout = async (req, res) => {
  try {
    const { title_en, title_ar, description_en, description_ar, values } = req.body;

    const updateFields = {
      "about.title_en": title_en,
      "about.title_ar": title_ar,
      "about.description_en": description_en,
      "about.description_ar": description_ar,
      "about.values": values || [],
    };

    const updated = await Content.findOneAndUpdate(
      {},
      { $set: updateFields },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      message: "تم تحديث about بنجاح",
      data: updated.about,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// UPDATE services section
exports.updateServices = async (req, res) => {
  try {
    const { title_en, title_ar, subtitle_en, subtitle_ar, items } = req.body;

    const updateFields = {
      "services.title_en": title_en,
      "services.title_ar": title_ar,
      "services.subtitle_en": subtitle_en,
      "services.subtitle_ar": subtitle_ar,
      "services.items": items || [],
    };

    const updated = await Content.findOneAndUpdate(
      {},
      { $set: updateFields },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      message: "تم تحديث services بنجاح",
      data: updated.services,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// ADD new project item
exports.addProjectItem = async (req, res) => {
  try {
    const { title_en, title_ar, description_en, description_ar, image, link } = req.body;
    let imageUrl = image;

    // Handle file upload if image file is provided
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, "hixa/projects");
    }

    const newItem = {
      _id: new mongoose.Types.ObjectId(),
      title_en: title_en || "",
      title_ar: title_ar || "",
      description_en: description_en || "",
      description_ar: description_ar || "",
      image: imageUrl || "",
      link: link || "",
    };

    const updated = await Content.findOneAndUpdate(
      {},
      { $push: { "projects.items": newItem } },
      { new: true, upsert: true, runValidators: true }
    );

    const addedItem = updated.projects.items[updated.projects.items.length - 1];
    res.json({
      message: "تم إضافة المشروع بنجاح",
      data: addedItem,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// UPDATE project item by ID
exports.updateProjectItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرف المشروع غير صحيح" });
    }

    const { title_en, title_ar, description_en, description_ar, image, link } = req.body;

    // Get current content
    const content = await Content.findOne();
    if (!content || !content.projects || !content.projects.items) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    // Find item by ID
    const itemIndex = content.projects.items.findIndex(
      (item) => item._id && item._id.toString() === id
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    const currentItem = content.projects.items[itemIndex];
    let imageUrl = image || currentItem.image;

    // Handle file upload if image file is provided
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, "hixa/projects");
      
      // Delete old image if exists
      if (currentItem.image && currentItem.image.includes("cloudinary.com")) {
        await deleteFromCloudinary(currentItem.image);
      }
    }

    // Update the item
    const updateFields = {};
    if (title_en !== undefined) updateFields[`projects.items.${itemIndex}.title_en`] = title_en;
    if (title_ar !== undefined) updateFields[`projects.items.${itemIndex}.title_ar`] = title_ar;
    if (description_en !== undefined) updateFields[`projects.items.${itemIndex}.description_en`] = description_en;
    if (description_ar !== undefined) updateFields[`projects.items.${itemIndex}.description_ar`] = description_ar;
    if (imageUrl !== undefined) updateFields[`projects.items.${itemIndex}.image`] = imageUrl;
    if (link !== undefined) updateFields[`projects.items.${itemIndex}.link`] = link;

    const updated = await Content.findOneAndUpdate(
      {},
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    res.json({
      message: "تم تحديث المشروع بنجاح",
      data: updated.projects.items[itemIndex],
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// DELETE project item by ID
exports.deleteProjectItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرف المشروع غير صحيح" });
    }

    // Get current content
    const content = await Content.findOne();
    if (!content || !content.projects || !content.projects.items) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    // Find item by ID
    const itemIndex = content.projects.items.findIndex(
      (item) => item._id && item._id.toString() === id
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "المشروع غير موجود" });
    }

    const itemToDelete = content.projects.items[itemIndex];

    // Delete image from Cloudinary if exists
    if (itemToDelete.image && itemToDelete.image.includes("cloudinary.com")) {
      await deleteFromCloudinary(itemToDelete.image);
    }

    // Remove item from array using $pull
    const updated = await Content.findOneAndUpdate(
      {},
      { $pull: { "projects.items": { _id: new mongoose.Types.ObjectId(id) } } },
      { new: true }
    );

    res.json({
      message: "تم حذف المشروع بنجاح",
      data: updated.projects.items,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// UPDATE projects section
exports.updateProjects = async (req, res) => {
  try {
    const { title_en, title_ar, subtitle_en, subtitle_ar, items } = req.body;

    // Parse items if it's a string (from form-data)
    let parsedItems = items;
    if (typeof items === "string") {
      try {
        parsedItems = JSON.parse(items);
      } catch (e) {
        parsedItems = [];
      }
    }

    // Handle image uploads if files are provided
    // Files should be named as: image_0, image_1, etc. matching item indices
    if (req.files && parsedItems && Array.isArray(parsedItems)) {
      // req.files is an object with field names as keys when using uploadFields
      const filesMap = {};
      
      // Handle both array format (upload.array) and object format (upload.fields)
      if (Array.isArray(req.files)) {
        req.files.forEach((file) => {
          filesMap[file.fieldname] = file;
        });
      } else {
        // Object format from uploadFields
        Object.keys(req.files).forEach((fieldName) => {
          if (req.files[fieldName] && req.files[fieldName].length > 0) {
            filesMap[fieldName] = req.files[fieldName][0];
          }
        });
      }

      // Process each item and upload image if provided
      for (let i = 0; i < parsedItems.length; i++) {
        const imageField = `image_${i}`;
        if (filesMap[imageField]) {
          const imageUrl = await uploadToCloudinary(filesMap[imageField].buffer, "hixa/projects");
          
          // Delete old image if exists
          if (parsedItems[i].image && parsedItems[i].image.includes("cloudinary.com")) {
            await deleteFromCloudinary(parsedItems[i].image);
          }
          
          parsedItems[i].image = imageUrl;
        }
      }
    }

    const updateFields = {
      "projects.title_en": title_en,
      "projects.title_ar": title_ar,
      "projects.subtitle_en": subtitle_en,
      "projects.subtitle_ar": subtitle_ar,
      "projects.items": parsedItems || [],
    };

    const updated = await Content.findOneAndUpdate(
      {},
      { $set: updateFields },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      message: "تم تحديث projects بنجاح",
      data: updated.projects,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// UPDATE partners section
exports.updatePartners = async (req, res) => {
  try {
    const { title_en, title_ar, subtitle_en, subtitle_ar } = req.body;

    const updateFields = {
      "partners.title_en": title_en,
      "partners.title_ar": title_ar,
      "partners.subtitle_en": subtitle_en,
      "partners.subtitle_ar": subtitle_ar,
    };

    const updated = await Content.findOneAndUpdate(
      {},
      { $set: updateFields },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      message: "تم تحديث partners بنجاح",
      data: updated.partners,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// ADD new partner item
exports.addPartnerItem = async (req, res) => {
  try {
    const { name_en, name_ar, logo, link, isActive } = req.body;
    let logoUrl = logo;

    if (req.file) {
      logoUrl = await uploadToCloudinary(req.file.buffer, "hixa/partners");
    }

    const newItem = {
      _id: new mongoose.Types.ObjectId(),
      name_en: name_en || "",
      name_ar: name_ar || "",
      logo: logoUrl || "",
      link: link || "",
      isActive: typeof isActive === "boolean" ? isActive : isActive === "true",
    };

    const updated = await Content.findOneAndUpdate(
      {},
      { $push: { "partners.items": newItem } },
      { new: true, upsert: true, runValidators: true }
    );

    const addedItem = updated.partners.items[updated.partners.items.length - 1];
    res.json({
      message: "تم إضافة الشريك بنجاح",
      data: addedItem,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// UPDATE partner item by ID
exports.updatePartnerItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرف الشريك غير صحيح" });
    }

    const { name_en, name_ar, logo, link, isActive } = req.body;

    const content = await Content.findOne();
    if (!content || !content.partners || !content.partners.items) {
      return res.status(404).json({ message: "الشريك غير موجود" });
    }

    const itemIndex = content.partners.items.findIndex(
      (item) => item._id && item._id.toString() === id
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "الشريك غير موجود" });
    }

    const currentItem = content.partners.items[itemIndex];
    let logoUrl = logo || currentItem.logo;

    if (req.file) {
      logoUrl = await uploadToCloudinary(req.file.buffer, "hixa/partners");

      if (currentItem.logo && currentItem.logo.includes("cloudinary.com")) {
        await deleteFromCloudinary(currentItem.logo);
      }
    }

    const updateFields = {};
    if (name_en !== undefined) updateFields[`partners.items.${itemIndex}.name_en`] = name_en;
    if (name_ar !== undefined) updateFields[`partners.items.${itemIndex}.name_ar`] = name_ar;
    if (logoUrl !== undefined) updateFields[`partners.items.${itemIndex}.logo`] = logoUrl;
    if (link !== undefined) updateFields[`partners.items.${itemIndex}.link`] = link;
    if (isActive !== undefined) {
      const activeValue = typeof isActive === "boolean" ? isActive : isActive === "true";
      updateFields[`partners.items.${itemIndex}.isActive`] = activeValue;
    }

    const updated = await Content.findOneAndUpdate(
      {},
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    res.json({
      message: "تم تحديث الشريك بنجاح",
      data: updated.partners.items[itemIndex],
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// DELETE partner item by ID
exports.deletePartnerItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرف الشريك غير صحيح" });
    }

    const content = await Content.findOne();
    if (!content || !content.partners || !content.partners.items) {
      return res.status(404).json({ message: "الشريك غير موجود" });
    }

    const item = content.partners.items.find((partner) => partner._id && partner._id.toString() === id);
    if (!item) {
      return res.status(404).json({ message: "الشريك غير موجود" });
    }

    if (item.logo && item.logo.includes("cloudinary.com")) {
      await deleteFromCloudinary(item.logo);
    }

    const updated = await Content.findOneAndUpdate(
      {},
      { $pull: { "partners.items": { _id: new mongoose.Types.ObjectId(id) } } },
      { new: true }
    );

    res.json({
      message: "تم حذف الشريك بنجاح",
      data: updated.partners.items,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// UPDATE features section
exports.updateFeatures = async (req, res) => {
  try {
    const { title_en, title_ar, subtitle_en, subtitle_ar, items } = req.body;

    const updateFields = {
      "features.title_en": title_en,
      "features.title_ar": title_ar,
      "features.subtitle_en": subtitle_en,
      "features.subtitle_ar": subtitle_ar,
      "features.items": items || [],
    };

    const updated = await Content.findOneAndUpdate(
      {},
      { $set: updateFields },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      message: "تم تحديث features بنجاح",
      data: updated.features,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// UPDATE jobs section
exports.updateJobs = async (req, res) => {
  try {
    const { title_en, title_ar, subtitle_en, subtitle_ar, items } = req.body;

    const normalizedItems = Array.isArray(items)
      ? items.map((item) => ({
          title_en: item.title_en || "",
          title_ar: item.title_ar || "",
          description_en: item.description_en || "",
          description_ar: item.description_ar || "",
          link: item.link || "",
          isActive:
            typeof item.isActive === "boolean"
              ? item.isActive
              : item.isActive === "true" || item.isActive === true,
        }))
      : [];

    const updateFields = {
      "jobs.title_en": title_en,
      "jobs.title_ar": title_ar,
      "jobs.subtitle_en": subtitle_en,
      "jobs.subtitle_ar": subtitle_ar,
      "jobs.items": normalizedItems,
    };

    const updated = await Content.findOneAndUpdate(
      {},
      { $set: updateFields },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      message: "تم تحديث jobs بنجاح",
      data: updated.jobs,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// UPDATE CTA section
exports.updateCTA = async (req, res) => {
  const { title_en, title_ar, subtitle_en, subtitle_ar, buttonText_en, buttonText_ar, buttonLink } = req.body;
  await updateSection("cta", {
    title_en,
    title_ar,
    subtitle_en,
    subtitle_ar,
    buttonText_en,
    buttonText_ar,
    buttonLink,
  }, res);
};

// UPDATE footer section
exports.updateFooter = async (req, res) => {
  try {
    const { description_en, description_ar, copyright_en, copyright_ar, links, social, contact } = req.body;

    const updateFields = {
      "footer.description_en": description_en,
      "footer.description_ar": description_ar,
      "footer.copyright_en": copyright_en,
      "footer.copyright_ar": copyright_ar,
      "footer.links": links || [],
      "footer.social": social || [],
      "footer.contact": contact || {},
    };

    const updated = await Content.findOneAndUpdate(
      {},
      { $set: updateFields },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      message: "تم تحديث footer بنجاح",
      data: updated.footer,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// Upload single image
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "لم يتم رفع أي صورة" });
    }

    const folder = req.body.folder || "hixa";
    const imageUrl = await uploadToCloudinary(req.file.buffer, folder);

    res.json({
      message: "تم رفع الصورة بنجاح",
      url: imageUrl,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في رفع الصورة", error: err.message });
  }
};
