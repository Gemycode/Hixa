const Work = require("../models/workModel");
const { uploadToCloudinary, deleteFromCloudinary } = require("../middleware/upload");
const mongoose = require("mongoose");
const WORK_STATUSES = ["Pending Review", "In Progress", "Completed"];

const parseArrayField = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (_e) {
      // ignore JSON parse error, fall through
    }
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const sanitizeWork = (work) => {
  const w = work.toObject ? work.toObject() : work;
  return {
    id: w._id,
    title: w.title,
    category: w.category,
    date: w.date,
    description: w.description,
    location: w.location,
    client: w.client,
    status: w.status,
    mainImage: w.mainImage,
    gallery: w.gallery || [],
    keyFeatures: w.keyFeatures || [],
    createdBy: w.createdBy,
    isActive: w.isActive,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  };
};

// CREATE work (Engineer/Admin)
exports.createWork = async (req, res, next) => {
  try {
    // Debug: Log received data
    console.log("🔍 createWork - req.body:", req.body);
    console.log("🔍 createWork - category:", req.body?.category);
    console.log("🔍 createWork - category type:", typeof req.body?.category);
    console.log("🔍 createWork - category length:", req.body?.category?.length);
    console.log("🔍 createWork - category char codes:", req.body?.category?.split('').map(c => c.charCodeAt(0)));
    
    const { title, category, date, description, location, client, status, keyFeatures } = req.body;
    const mainImageFile = req.files?.image?.[0];
    const galleryFiles = req.files?.gallery || [];

    if (!mainImageFile) {
      return res.status(400).json({ message: "الصورة الرئيسية مطلوبة" });
    }

    const mainImageUrl = await uploadToCloudinary(mainImageFile.buffer, "hixa/portfolio/main");
    const gallery = [];

    for (const file of galleryFiles) {
      const url = await uploadToCloudinary(file.buffer, "hixa/portfolio/gallery");
      gallery.push({ url });
    }

    const work = await Work.create({
      title,
      category,
      date: date ? new Date(date) : undefined,
      description,
      location,
      client,
      status: status && WORK_STATUSES.includes(status) ? status : undefined,
      keyFeatures: parseArrayField(keyFeatures),
      mainImage: { url: mainImageUrl },
      gallery,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: "تم إنشاء العمل بنجاح",
      data: sanitizeWork(work),
    });
  } catch (error) {
    next(error);
  }
};

// GET all works (public, with filters + pagination)
exports.getWorks = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 9, 1), 100);
    const skip = (page - 1) * limit;

    const { category, status, search } = req.query;

    const filters = { isActive: true };
    if (category) filters.category = category;
    if (status && WORK_STATUSES.includes(status)) filters.status = status;
    if (search) {
      const regex = new RegExp(search, "i");
      filters.$or = [{ title: regex }, { description: regex }, { category: regex }];
    }

    const [works, total] = await Promise.all([
      Work.find(filters)
        .populate("createdBy", "name email role")
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Work.countDocuments(filters),
    ]);

    res.json({
      data: works.map(sanitizeWork),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET works by category (public)
exports.getWorksByCategory = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 9, 1), 100);
    const skip = (page - 1) * limit;
    const { category } = req.params;

    const filters = { isActive: true, category };

    const [works, total] = await Promise.all([
      Work.find(filters).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit),
      Work.countDocuments(filters),
    ]);

    res.json({
      data: works.map(sanitizeWork),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET works by user ID (public)
exports.getWorksByUser = async (req, res, next) => {
  try {
    const userId = String(req.params.userId || '');
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || '9'), 10) || 9, 1), 100);
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false,
        message: "معرف المستخدم غير صالح" 
      });
    }

    const filters = { 
      isActive: true, 
      createdBy: new mongoose.Types.ObjectId(userId)
    };

    const [works, total] = await Promise.all([
      Work.find(filters)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Work.countDocuments(filters),
    ]);

    const sanitizedWorks = works.map(work => {
      const sanitized = sanitizeWork(work);
      delete sanitized.__v;
      return sanitized;
    });

    res.json({
      success: true,
      count: sanitizedWorks.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: sanitizedWorks,
    });
  } catch (error) {
    console.error('Error in getWorksByUser:', error);
    next({
      status: 500,
      message: 'حدث خطأ أثناء جلب أعمال المستخدم',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// GET single work
exports.getWorkById = async (req, res, next) => {
  try {
    const work = await Work.findOne({ _id: req.params.id, isActive: true }).populate(
      "createdBy",
      "name email role"
    );

    if (!work) {
      return res.status(404).json({ message: "العمل غير موجود" });
    }

    res.json({ data: sanitizeWork(work) });
  } catch (error) {
    next(error);
  }
};

// UPDATE work (Engineer owner or Admin)
exports.updateWork = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, category, date, description, location, client, status, keyFeatures } = req.body;
    const mainImageFile = req.files?.image?.[0];
    const galleryFiles = req.files?.gallery || [];

    const work = await Work.findById(id);
    if (!work || !work.isActive) {
      return res.status(404).json({ message: "العمل غير موجود" });
    }

    const isOwner = req.user && work.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "غير مصرح لك بتعديل هذا العمل" });
    }

    if (title !== undefined) work.title = title;
    if (category !== undefined) work.category = category;
    if (date !== undefined) work.date = date ? new Date(date) : undefined;
    if (description !== undefined) work.description = description;
    if (location !== undefined) work.location = location;
    if (client !== undefined) work.client = client;
    if (status !== undefined && WORK_STATUSES.includes(status)) work.status = status;
    if (keyFeatures !== undefined) work.keyFeatures = parseArrayField(keyFeatures);

    if (mainImageFile) {
      const newUrl = await uploadToCloudinary(mainImageFile.buffer, "hixa/portfolio/main");
      if (work.mainImage?.url && work.mainImage.url.includes("cloudinary.com")) {
        await deleteFromCloudinary(work.mainImage.url);
      }
      work.mainImage = { url: newUrl };
    }

    if (galleryFiles.length > 0) {
      for (const img of work.gallery || []) {
        if (img.url && img.url.includes("cloudinary.com")) {
          await deleteFromCloudinary(img.url);
        }
      }
      const newGallery = [];
      for (const file of galleryFiles) {
        const url = await uploadToCloudinary(file.buffer, "hixa/portfolio/gallery");
        newGallery.push({ url });
      }
      work.gallery = newGallery;
    }

    await work.save();

    res.json({
      message: "تم تحديث العمل بنجاح",
      data: sanitizeWork(work),
    });
  } catch (error) {
    next(error);
  }
};

// DELETE work (soft delete)
exports.deleteWork = async (req, res, next) => {
  try {
    const { id } = req.params;
    const work = await Work.findById(id);

    if (!work || !work.isActive) {
      return res.status(404).json({ message: "العمل غير موجود" });
    }

    const isOwner = req.user && work.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user && req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "غير مصرح لك بحذف هذا العمل" });
    }

    work.isActive = false;
    await work.save();

    res.json({ message: "تم حذف العمل بنجاح" });
  } catch (error) {
    next(error);
  }
};