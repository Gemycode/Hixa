const Content = require("../models/contentModel");
const { uploadToCloudinary, deleteFromCloudinary } = require("../middleware/upload");

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
    const { title_en, title_ar, description_en, description_ar, image, values } = req.body;
    let imageUrl = image;

    // Handle file upload if image file is provided
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, "hixa/about");
      
      // Delete old image if exists
      if (image && image.includes("cloudinary.com")) {
        await deleteFromCloudinary(image);
      }
    }

    const updateFields = {
      "about.title_en": title_en,
      "about.title_ar": title_ar,
      "about.description_en": description_en,
      "about.description_ar": description_ar,
      "about.image": imageUrl,
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
