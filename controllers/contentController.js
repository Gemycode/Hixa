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
    const { title_en, title_ar, subtitle_en, subtitle_ar, items, details } = req.body;

    const parseArray = (val) => {
      if (val === undefined || val === null) return undefined;
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          return undefined;
        }
      }
      return undefined;
    };

    // Only include fields that are actually provided (not undefined)
    const updateFields = {};
    if (title_en !== undefined) updateFields["services.title_en"] = title_en;
    if (title_ar !== undefined) updateFields["services.title_ar"] = title_ar;
    if (subtitle_en !== undefined) updateFields["services.subtitle_en"] = subtitle_en;
    if (subtitle_ar !== undefined) updateFields["services.subtitle_ar"] = subtitle_ar;
    
    const parsedItems = parseArray(items);
    if (parsedItems !== undefined) {
      // Ensure all items have _id - preserve existing IDs or create new ones
      const itemsWithIds = parsedItems.map((item) => {
        if (!item._id) {
          // If no _id provided, create a new one
          item._id = new mongoose.Types.ObjectId();
        } else if (typeof item._id === 'string') {
          // Convert string _id to ObjectId if needed
          item._id = new mongoose.Types.ObjectId(item._id);
        }
        return item;
      });
      updateFields["services.items"] = itemsWithIds;
    }
    
    const parsedDetails = parseArray(details);
    if (parsedDetails !== undefined) {
      // Ensure all details have _id - preserve existing IDs or create new ones
      const detailsWithIds = parsedDetails.map((detail) => {
        if (!detail._id) {
          detail._id = new mongoose.Types.ObjectId();
        } else if (typeof detail._id === 'string') {
          detail._id = new mongoose.Types.ObjectId(detail._id);
        }
        // Handle serviceItemId conversion
        if (detail.serviceItemId && typeof detail.serviceItemId === 'string') {
          detail.serviceItemId = new mongoose.Types.ObjectId(detail.serviceItemId);
        }
        return detail;
      });
      updateFields["services.details"] = detailsWithIds;
    }

    // Only update if there are fields to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "لم يتم إرسال أي بيانات للتحديث" });
    }

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

// ADD new service item
exports.addServiceItem = async (req, res) => {
  try {
    const { title_en, title_ar, description_en, description_ar, icon } = req.body;

    const newItem = {
      _id: new mongoose.Types.ObjectId(),
      title_en: title_en || "",
      title_ar: title_ar || "",
      description_en: description_en || "",
      description_ar: description_ar || "",
      icon: icon || "",
    };

    const updated = await Content.findOneAndUpdate(
      {},
      { $push: { "services.items": newItem } },
      { new: true, upsert: true, runValidators: true }
    );

    const addedItem = updated.services.items[updated.services.items.length - 1];
    res.json({
      message: "تم إضافة الخدمة بنجاح",
      data: addedItem,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// UPDATE service item by ID
exports.updateServiceItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرف الخدمة غير صحيح" });
    }

    const { title_en, title_ar, description_en, description_ar, icon } = req.body;

    const content = await Content.findOne();
    if (!content) {
      return res.status(404).json({ message: "المحتوى غير موجود" });
    }

    if (!content.services) {
      return res.status(404).json({ message: "قسم الخدمات غير موجود" });
    }

    if (!content.services.items || !Array.isArray(content.services.items) || content.services.items.length === 0) {
      return res.status(404).json({ message: "لا توجد خدمات في القائمة" });
    }

    // Try to find item by ID - handle both ObjectId and string formats
    let itemIndex = -1;
    const searchId = id.toString();

    for (let i = 0; i < content.services.items.length; i++) {
      const item = content.services.items[i];
      if (item._id) {
        // Handle both ObjectId and string
        const itemId = item._id.toString ? item._id.toString() : String(item._id);
        if (itemId === searchId) {
          itemIndex = i;
          break;
        }
      }
    }

    if (itemIndex === -1) {
      return res.status(404).json({ 
        message: "الخدمة غير موجودة",
        debug: {
          requestedId: id,
          availableIds: content.services.items.map((item, idx) => ({
            index: idx,
            id: item._id ? (item._id.toString ? item._id.toString() : String(item._id)) : "no-id",
            title: item.title_en || item.title_ar || "no-title"
          }))
        }
      });
    }

    const updateFields = {};
    if (title_en !== undefined) updateFields[`services.items.${itemIndex}.title_en`] = title_en;
    if (title_ar !== undefined) updateFields[`services.items.${itemIndex}.title_ar`] = title_ar;
    if (description_en !== undefined) updateFields[`services.items.${itemIndex}.description_en`] = description_en;
    if (description_ar !== undefined) updateFields[`services.items.${itemIndex}.description_ar`] = description_ar;
    if (icon !== undefined) updateFields[`services.items.${itemIndex}.icon`] = icon;

    const updated = await Content.findOneAndUpdate(
      {},
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    res.json({
      message: "تم تحديث الخدمة بنجاح",
      data: updated.services.items[itemIndex],
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// DELETE service item by ID
exports.deleteServiceItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرف الخدمة غير صحيح" });
    }

    const content = await Content.findOne();
    if (!content) {
      return res.status(404).json({ message: "المحتوى غير موجود" });
    }

    if (!content.services) {
      return res.status(404).json({ message: "قسم الخدمات غير موجود" });
    }

    if (!content.services.items || !Array.isArray(content.services.items) || content.services.items.length === 0) {
      return res.status(404).json({ message: "لا توجد خدمات في القائمة" });
    }

    // Try to find item by ID - handle both ObjectId and string formats
    const searchId = id.toString();
    let item = null;
    let itemIndex = -1;

    for (let i = 0; i < content.services.items.length; i++) {
      const currentItem = content.services.items[i];
      if (currentItem._id) {
        // Handle both ObjectId and string
        const itemId = currentItem._id.toString ? currentItem._id.toString() : String(currentItem._id);
        if (itemId === searchId) {
          item = currentItem;
          itemIndex = i;
          break;
        }
      }
    }

    if (!item) {
      return res.status(404).json({ 
        message: "الخدمة غير موجودة",
        debug: {
          requestedId: id,
          availableIds: content.services.items.map((item, idx) => ({
            index: idx,
            id: item._id ? (item._id.toString ? item._id.toString() : String(item._id)) : "no-id",
            title: item.title_en || item.title_ar || "no-title"
          }))
        }
      });
    }

    // Find and delete all related details (if serviceItemId exists) or by sectionKey/categoryKey
    // First, try to find details by serviceItemId
    let detailsToDelete = [];
    if (content.services.details) {
      detailsToDelete = content.services.details.filter(
        (detail) => detail.serviceItemId && detail.serviceItemId.toString() === id
      );
    }

    // Delete images from Cloudinary for related details
    for (const detail of detailsToDelete) {
      if (detail.image && detail.image.includes("cloudinary.com")) {
        try {
          await deleteFromCloudinary(detail.image);
        } catch (err) {
          console.error("Error deleting image from Cloudinary:", err);
        }
      }
    }

    // Delete the service item and all related details
    const updateOperations = {
      $pull: { 
        "services.items": { _id: new mongoose.Types.ObjectId(id) }
      }
    };

    // If there are details with serviceItemId, delete them too
    if (detailsToDelete.length > 0) {
      updateOperations.$pull["services.details"] = { serviceItemId: new mongoose.Types.ObjectId(id) };
    }

    const updated = await Content.findOneAndUpdate(
      {},
      updateOperations,
      { new: true }
    );

    res.json({
      message: `تم حذف الخدمة بنجاح${detailsToDelete.length > 0 ? ` وتم حذف ${detailsToDelete.length} من التفاصيل المرتبطة` : ""}`,
      data: updated.services.items,
      deletedDetailsCount: detailsToDelete.length,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// ADD new service detail
exports.addServiceDetail = async (req, res) => {
  try {
    const { serviceId } = req.params; // Get serviceId from URL
    const { title_en, title_ar, details_en, details_ar, image, sectionKey, categoryKey } = req.body;
    let imageUrl = image;

    // Validate that serviceId is provided and not empty
    if (!serviceId || serviceId.trim() === "") {
      return res.status(400).json({ message: "معرف الخدمة مطلوب" });
    }

    // Validate serviceId from URL
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ message: "معرف الخدمة غير صحيح" });
    }

    // Verify service item exists
    const content = await Content.findOne();
    if (!content || !content.services || !content.services.items) {
      return res.status(404).json({ message: "الخدمة غير موجودة" });
    }

    const searchServiceId = serviceId.toString();
    const serviceItem = content.services.items.find((item) => {
      if (item._id) {
        const itemId = item._id.toString ? item._id.toString() : String(item._id);
        return itemId === searchServiceId;
      }
      return false;
    });

    if (!serviceItem) {
      return res.status(404).json({ message: "الخدمة غير موجودة" });
    }

    // Handle file upload if image file is provided
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, "hixa/services");
    }

    const newDetail = {
      _id: new mongoose.Types.ObjectId(),
      title_en: title_en || "",
      title_ar: title_ar || "",
      details_en: details_en || "",
      details_ar: details_ar || "",
      image: imageUrl || "",
      sectionKey: sectionKey || "",
      categoryKey: categoryKey || "",
      serviceItemId: new mongoose.Types.ObjectId(serviceId), // Use serviceId from URL
    };

    const updated = await Content.findOneAndUpdate(
      {},
      { $push: { "services.details": newDetail } },
      { new: true, upsert: true, runValidators: true }
    );

    const addedDetail = updated.services.details[updated.services.details.length - 1];
    res.json({
      message: "تم إضافة تفاصيل الخدمة بنجاح",
      data: addedDetail,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// UPDATE service detail by ID
exports.updateServiceDetail = async (req, res) => {
  try {
    const { serviceId, id } = req.params; // Get both serviceId and detail id from URL

    // Validate that serviceId is provided and not empty
    if (!serviceId || serviceId.trim() === "") {
      return res.status(400).json({ message: "معرف الخدمة مطلوب" });
    }

    // Validate that detail id is provided and not empty
    if (!id || id.trim() === "") {
      return res.status(400).json({ message: "معرف تفاصيل الخدمة مطلوب" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرف تفاصيل الخدمة غير صحيح" });
    }

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ message: "معرف الخدمة غير صحيح" });
    }

    const { title_en, title_ar, details_en, details_ar, image, sectionKey, categoryKey } = req.body;

    const content = await Content.findOne();
    if (!content || !content.services) {
      return res.status(404).json({ message: "المحتوى غير موجود" });
    }

    // Verify service exists
    if (!content.services.items || !Array.isArray(content.services.items)) {
      return res.status(404).json({ message: "الخدمة غير موجودة" });
    }

    const searchServiceId = serviceId.toString();
    const serviceExists = content.services.items.some((item) => {
      if (item._id) {
        const itemId = item._id.toString ? item._id.toString() : String(item._id);
        return itemId === searchServiceId;
      }
      return false;
    });

    if (!serviceExists) {
      return res.status(404).json({ message: "الخدمة غير موجودة" });
    }

    // Find the detail
    if (!content.services.details || !Array.isArray(content.services.details)) {
      return res.status(404).json({ message: "تفاصيل الخدمة غير موجودة" });
    }

    const searchDetailId = id.toString();
    let detailIndex = -1;

    for (let i = 0; i < content.services.details.length; i++) {
      const detail = content.services.details[i];
      if (detail._id) {
        const detailId = detail._id.toString ? detail._id.toString() : String(detail._id);
        if (detailId === searchDetailId) {
          // Also verify this detail belongs to the service (if serviceItemId exists)
          if (detail.serviceItemId) {
            const detailServiceId = detail.serviceItemId.toString 
              ? detail.serviceItemId.toString() 
              : String(detail.serviceItemId);
            if (detailServiceId !== searchServiceId) {
              return res.status(400).json({ message: "هذه التفاصيل لا تنتمي للخدمة المحددة" });
            }
          }
          detailIndex = i;
          break;
        }
      }
    }

    if (detailIndex === -1) {
      return res.status(404).json({ message: "تفاصيل الخدمة غير موجودة" });
    }

    const currentDetail = content.services.details[detailIndex];
    let imageUrl = currentDetail.image; // Keep current image by default

    // Handle file upload if image file is provided
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, "hixa/services");
      
      // Delete old image if exists
      if (currentDetail.image && currentDetail.image.includes("cloudinary.com")) {
        try {
          await deleteFromCloudinary(currentDetail.image);
        } catch (err) {
          console.error("Error deleting image from Cloudinary:", err);
        }
      }
    } else if (image !== undefined) {
      // If image URL is provided in body (not file upload)
      imageUrl = image;
    }

    // Build update fields - only include fields that are provided
    const updateFields = {};
    if (title_en !== undefined) updateFields[`services.details.${detailIndex}.title_en`] = title_en;
    if (title_ar !== undefined) updateFields[`services.details.${detailIndex}.title_ar`] = title_ar;
    if (details_en !== undefined) updateFields[`services.details.${detailIndex}.details_en`] = details_en;
    if (details_ar !== undefined) updateFields[`services.details.${detailIndex}.details_ar`] = details_ar;
    if (imageUrl !== undefined && imageUrl !== null) updateFields[`services.details.${detailIndex}.image`] = imageUrl;
    if (sectionKey !== undefined) updateFields[`services.details.${detailIndex}.sectionKey`] = sectionKey;
    if (categoryKey !== undefined) updateFields[`services.details.${detailIndex}.categoryKey`] = categoryKey;
    
    // Update serviceItemId if it's null/undefined (for old details)
    if (!currentDetail.serviceItemId) {
      updateFields[`services.details.${detailIndex}.serviceItemId`] = new mongoose.Types.ObjectId(serviceId);
    }

    // Check if there are any fields to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "لم يتم إرسال أي بيانات للتحديث" });
    }

    const updated = await Content.findOneAndUpdate(
      {},
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    // Find the updated detail again (in case index changed, though it shouldn't)
    const updatedDetail = updated.services.details.find((detail) => {
      if (detail._id) {
        const detailId = detail._id.toString ? detail._id.toString() : String(detail._id);
        return detailId === searchDetailId;
      }
      return false;
    });

    if (!updatedDetail) {
      return res.status(500).json({ message: "حدث خطأ أثناء التحديث" });
    }

    res.json({
      message: "تم تحديث تفاصيل الخدمة بنجاح",
      data: updatedDetail,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// DELETE service detail by ID
exports.deleteServiceDetail = async (req, res) => {
  try {
    const { serviceId, id } = req.params; // Get both serviceId and detail id from URL

    // Validate that serviceId is provided and not empty
    if (!serviceId || serviceId.trim() === "") {
      return res.status(400).json({ message: "معرف الخدمة مطلوب" });
    }

    // Validate that detail id is provided and not empty
    if (!id || id.trim() === "") {
      return res.status(400).json({ message: "معرف تفاصيل الخدمة مطلوب" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرف تفاصيل الخدمة غير صحيح" });
    }

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ message: "معرف الخدمة غير صحيح" });
    }

    const content = await Content.findOne();
    if (!content || !content.services) {
      return res.status(404).json({ message: "المحتوى غير موجود" });
    }

    // Verify service exists
    if (!content.services.items || !Array.isArray(content.services.items)) {
      return res.status(404).json({ message: "الخدمة غير موجودة" });
    }

    const searchServiceId = serviceId.toString();
    const serviceExists = content.services.items.some((item) => {
      if (item._id) {
        const itemId = item._id.toString ? item._id.toString() : String(item._id);
        return itemId === searchServiceId;
      }
      return false;
    });

    if (!serviceExists) {
      return res.status(404).json({ message: "الخدمة غير موجودة" });
    }

    // Find the detail
    if (!content.services.details || !Array.isArray(content.services.details)) {
      return res.status(404).json({ message: "تفاصيل الخدمة غير موجودة" });
    }

    const searchDetailId = id.toString();
    let detail = null;

    for (const currentDetail of content.services.details) {
      if (currentDetail._id) {
        const detailId = currentDetail._id.toString ? currentDetail._id.toString() : String(currentDetail._id);
        if (detailId === searchDetailId) {
          // Verify this detail belongs to the service
          if (currentDetail.serviceItemId) {
            const detailServiceId = currentDetail.serviceItemId.toString 
              ? currentDetail.serviceItemId.toString() 
              : String(currentDetail.serviceItemId);
            if (detailServiceId !== searchServiceId) {
              return res.status(400).json({ message: "هذه التفاصيل لا تنتمي للخدمة المحددة" });
            }
          }
          detail = currentDetail;
          break;
        }
      }
    }

    if (!detail) {
      return res.status(404).json({ message: "تفاصيل الخدمة غير موجودة" });
    }

    // Delete image from Cloudinary if exists
    if (detail.image && detail.image.includes("cloudinary.com")) {
      await deleteFromCloudinary(detail.image);
    }

    const updated = await Content.findOneAndUpdate(
      {},
      { $pull: { "services.details": { _id: new mongoose.Types.ObjectId(id) } } },
      { new: true }
    );

    res.json({
      message: "تم حذف تفاصيل الخدمة بنجاح",
      data: updated.services.details,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// DELETE all service details with null serviceItemId (orphaned details)
exports.deleteOrphanedServiceDetails = async (req, res) => {
  try {
    const content = await Content.findOne();
    if (!content || !content.services) {
      return res.status(404).json({ message: "المحتوى غير موجود" });
    }

    if (!content.services.details || !Array.isArray(content.services.details)) {
      return res.status(200).json({ 
        message: "لا توجد تفاصيل للخدمات",
        deletedCount: 0 
      });
    }

    // Find orphaned details (those without serviceItemId or with null serviceItemId)
    const orphanedDetails = content.services.details.filter((detail) => {
      return !detail.serviceItemId || detail.serviceItemId === null || detail.serviceItemId === undefined;
    });

    if (orphanedDetails.length === 0) {
      return res.status(200).json({ 
        message: "لا توجد تفاصيل غير مرتبطة بخدمات",
        deletedCount: 0 
      });
    }

    // Delete images from Cloudinary for orphaned details
    for (const detail of orphanedDetails) {
      if (detail.image && detail.image.includes("cloudinary.com")) {
        try {
          await deleteFromCloudinary(detail.image);
        } catch (err) {
          console.error("Error deleting image from Cloudinary:", err);
        }
      }
    }

    // Remove orphaned details using $pull with $or condition
    const orphanedIds = orphanedDetails
      .map((detail) => detail._id)
      .filter((id) => id);

    if (orphanedIds.length === 0) {
      return res.status(200).json({ 
        message: "لا توجد تفاصيل للحذف",
        deletedCount: 0 
      });
    }

    // Use $pull to remove all orphaned details
    const updated = await Content.findOneAndUpdate(
      {},
      { 
        $pull: { 
          "services.details": { 
            $or: [
              { serviceItemId: null },
              { serviceItemId: { $exists: false } },
              { _id: { $in: orphanedIds } }
            ]
          } 
        } 
      },
      { new: true }
    );

    res.json({
      message: `تم حذف ${orphanedDetails.length} من التفاصيل غير المرتبطة بخدمات بنجاح`,
      deletedCount: orphanedDetails.length,
      remainingDetails: updated.services.details.length,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// GET service item by ID with its details
exports.getServiceItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرف الخدمة غير صحيح" });
    }

    const content = await Content.findOne();
    if (!content || !content.services) {
      return res.status(404).json({ message: "قسم الخدمات غير موجود" });
    }

    if (!content.services.items || !Array.isArray(content.services.items)) {
      return res.status(404).json({ message: "الخدمة غير موجودة" });
    }

    // Find service item
    const searchId = id.toString();
    let serviceItem = null;

    for (const item of content.services.items) {
      if (item._id) {
        const itemId = item._id.toString ? item._id.toString() : String(item._id);
        if (itemId === searchId) {
          serviceItem = item;
          break;
        }
      }
    }

    if (!serviceItem) {
      return res.status(404).json({ message: "الخدمة غير موجودة" });
    }

    // Find related details
    let relatedDetails = [];
    if (content.services.details && Array.isArray(content.services.details)) {
      relatedDetails = content.services.details.filter((detail) => {
        if (detail.serviceItemId) {
          const detailServiceId = detail.serviceItemId.toString 
            ? detail.serviceItemId.toString() 
            : String(detail.serviceItemId);
          return detailServiceId === searchId;
        }
        return false;
      });
    }

    res.json({
      message: "تم جلب الخدمة بنجاح",
      data: {
        service: serviceItem,
        details: relatedDetails,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// GET service details by service ID
exports.getServiceDetails = async (req, res) => {
  try {
    const { serviceId } = req.params; // Get serviceId from URL parameter

    // Validate that serviceId is provided and not empty
    if (!serviceId || serviceId.trim() === "") {
      return res.status(400).json({ message: "معرف الخدمة مطلوب" });
    }

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ message: "معرف الخدمة غير صحيح" });
    }

    const content = await Content.findOne();
    if (!content || !content.services) {
      return res.status(404).json({ message: "قسم الخدمات غير موجود" });
    }

    // Verify service exists
    if (!content.services.items || !Array.isArray(content.services.items)) {
      return res.status(404).json({ message: "الخدمة غير موجودة" });
    }

    const searchId = serviceId.toString();
    const serviceExists = content.services.items.some((item) => {
      if (item._id) {
        const itemId = item._id.toString ? item._id.toString() : String(item._id);
        return itemId === searchId;
      }
      return false;
    });

    if (!serviceExists) {
      return res.status(404).json({ message: "الخدمة غير موجودة" });
    }

    // Get all details for this service
    let details = [];
    if (content.services.details && Array.isArray(content.services.details)) {
      details = content.services.details.filter((detail) => {
        if (detail.serviceItemId) {
          const detailServiceId = detail.serviceItemId.toString 
            ? detail.serviceItemId.toString() 
            : String(detail.serviceItemId);
          return detailServiceId === searchId;
        }
        return false;
      });
    }

    res.json({
      message: "تم جلب تفاصيل الخدمة بنجاح",
      data: details,
      count: details.length,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// GET single service detail by ID
exports.getServiceDetailById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرف تفاصيل الخدمة غير صحيح" });
    }

    const content = await Content.findOne();
    if (!content || !content.services) {
      return res.status(404).json({ message: "قسم الخدمات غير موجود" });
    }

    if (!content.services.details || !Array.isArray(content.services.details)) {
      return res.status(404).json({ message: "تفاصيل الخدمة غير موجودة" });
    }

    const searchId = id.toString();
    let detail = null;

    for (const currentDetail of content.services.details) {
      if (currentDetail._id) {
        const detailId = currentDetail._id.toString ? currentDetail._id.toString() : String(currentDetail._id);
        if (detailId === searchId) {
          detail = currentDetail;
          break;
        }
      }
    }

    if (!detail) {
      return res.status(404).json({ message: "تفاصيل الخدمة غير موجودة" });
    }

    // If detail has serviceItemId, get the service info too
    let service = null;
    if (detail.serviceItemId && content.services.items) {
      const serviceId = detail.serviceItemId.toString ? detail.serviceItemId.toString() : String(detail.serviceItemId);
      service = content.services.items.find((item) => {
        if (item._id) {
          const itemId = item._id.toString ? item._id.toString() : String(item._id);
          return itemId === serviceId;
        }
        return false;
      });
    }

    res.json({
      message: "تم جلب تفاصيل الخدمة بنجاح",
      data: {
        detail: detail,
        service: service || null,
      },
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
    let parsedItems = items;
    if (typeof parsedItems === "string") {
      try {
        parsedItems = JSON.parse(parsedItems);
      } catch (error) {
        parsedItems = [];
      }
    }

    const normalizedItems = Array.isArray(parsedItems)
      ? parsedItems.map((item) => ({
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

// ADD job item
exports.addJobItem = async (req, res) => {
  try {
    const { title_en, title_ar, description_en, description_ar, link, isActive } = req.body;

    const newItem = {
      _id: new mongoose.Types.ObjectId(),
      title_en: title_en || "",
      title_ar: title_ar || "",
      description_en: description_en || "",
      description_ar: description_ar || "",
      link: link || "",
      isActive:
        isActive === undefined ? true : typeof isActive === "boolean" ? isActive : isActive === "true",
    };

    const updated = await Content.findOneAndUpdate(
      {},
      { $push: { "jobs.items": newItem } },
      { new: true, upsert: true, runValidators: true }
    );

    const addedItem = updated.jobs.items[updated.jobs.items.length - 1];
    res.json({
      message: "تم إضافة الوظيفة بنجاح",
      data: addedItem,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// UPDATE job item by ID
exports.updateJobItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرف الوظيفة غير صحيح" });
    }

    const { title_en, title_ar, description_en, description_ar, link, isActive } = req.body;

    const content = await Content.findOne();
    if (!content || !content.jobs || !content.jobs.items) {
      return res.status(404).json({ message: "الوظيفة غير موجودة" });
    }

    const itemIndex = content.jobs.items.findIndex((item) => item._id && item._id.toString() === id);
    if (itemIndex === -1) {
      return res.status(404).json({ message: "الوظيفة غير موجودة" });
    }

    const updateFields = {};
    if (title_en !== undefined) updateFields[`jobs.items.${itemIndex}.title_en`] = title_en;
    if (title_ar !== undefined) updateFields[`jobs.items.${itemIndex}.title_ar`] = title_ar;
    if (description_en !== undefined) updateFields[`jobs.items.${itemIndex}.description_en`] = description_en;
    if (description_ar !== undefined) updateFields[`jobs.items.${itemIndex}.description_ar`] = description_ar;
    if (link !== undefined) updateFields[`jobs.items.${itemIndex}.link`] = link;
    if (isActive !== undefined) {
      updateFields[`jobs.items.${itemIndex}.isActive`] =
        typeof isActive === "boolean" ? isActive : isActive === "true";
    }

    const updated = await Content.findOneAndUpdate(
      {},
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    res.json({
      message: "تم تحديث الوظيفة بنجاح",
      data: updated.jobs.items[itemIndex],
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// DELETE job item by ID
exports.deleteJobItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرف الوظيفة غير صحيح" });
    }

    const updated = await Content.findOneAndUpdate(
      {},
      { $pull: { "jobs.items": { _id: new mongoose.Types.ObjectId(id) } } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "الوظيفة غير موجودة" });
    }

    res.json({
      message: "تم حذف الوظيفة بنجاح",
      data: updated.jobs.items,
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

// ADD job item
exports.addJobItem = async (req, res) => {
  try {
    const { title_en, title_ar, description_en, description_ar, link, isActive } = req.body;

    const newItem = {
      _id: new mongoose.Types.ObjectId(),
      title_en: title_en || "",
      title_ar: title_ar || "",
      description_en: description_en || "",
      description_ar: description_ar || "",
      link: link || "",
      isActive: typeof isActive === "boolean" ? isActive : isActive === "true",
    };

    const updated = await Content.findOneAndUpdate(
      {},
      { $push: { "jobs.items": newItem } },
      { new: true, upsert: true, runValidators: true }
    );

    const addedItem = updated.jobs.items[updated.jobs.items.length - 1];
    res.json({
      message: "تم إضافة الوظيفة بنجاح",
      data: addedItem,
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// UPDATE job item by ID
exports.updateJobItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرف الوظيفة غير صحيح" });
    }

    const { title_en, title_ar, description_en, description_ar, link, isActive } = req.body;

    const content = await Content.findOne();
    if (!content || !content.jobs || !content.jobs.items) {
      return res.status(404).json({ message: "الوظيفة غير موجودة" });
    }

    const itemIndex = content.jobs.items.findIndex((item) => item._id && item._id.toString() === id);
    if (itemIndex === -1) {
      return res.status(404).json({ message: "الوظيفة غير موجودة" });
    }

    const updateFields = {};
    if (title_en !== undefined) updateFields[`jobs.items.${itemIndex}.title_en`] = title_en;
    if (title_ar !== undefined) updateFields[`jobs.items.${itemIndex}.title_ar`] = title_ar;
    if (description_en !== undefined) updateFields[`jobs.items.${itemIndex}.description_en`] = description_en;
    if (description_ar !== undefined) updateFields[`jobs.items.${itemIndex}.description_ar`] = description_ar;
    if (link !== undefined) updateFields[`jobs.items.${itemIndex}.link`] = link;
    if (isActive !== undefined) {
      updateFields[`jobs.items.${itemIndex}.isActive`] =
        typeof isActive === "boolean" ? isActive : isActive === "true";
    }

    const updated = await Content.findOneAndUpdate(
      {},
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    res.json({
      message: "تم تحديث الوظيفة بنجاح",
      data: updated.jobs.items[itemIndex],
    });
  } catch (err) {
    res.status(500).json({ message: "خطأ في الخادم", error: err.message });
  }
};

// DELETE job item by ID
exports.deleteJobItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "معرف الوظيفة غير صحيح" });
    }

    const updated = await Content.findOneAndUpdate(
      {},
      { $pull: { "jobs.items": { _id: new mongoose.Types.ObjectId(id) } } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "الوظيفة غير موجودة" });
    }

    res.json({
      message: "تم حذف الوظيفة بنجاح",
      data: updated.jobs.items,
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

