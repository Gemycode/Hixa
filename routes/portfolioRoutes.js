const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middleware/auth");
const { validateWork, validateWorkUpdate } = require("../middleware/validate");
const { uploadFields } = require("../middleware/upload");
const {
  createWork,
  getWorks,
  getWorksByUser,
  getWorksByCategory,
  getWorkById,
  updateWork,
  deleteWork,
} = require("../controllers/portfolioController");

// حماية لمسارات المهندسين والإدمن
const engineerOrAdmin = [protect, restrictTo("engineer", "admin")];

// إنشاء عمل جديد
router.post(
  "/",
  ...engineerOrAdmin,
  uploadFields([
    { name: "image", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  validateWork,
  createWork
);

// الحصول على كل الأعمال
router.get("/", protect, getWorks);

// الأعمال حسب القسم (Public)
router.get("/category/:category", getWorksByCategory);

// الأعمال حسب المستخدم (Public)
router.get("/user/:userId", getWorksByUser);

// الحصول على عمل معين
router.get("/:id", protect, getWorkById);

// تعديل عمل موجود
router.put(
  "/:id",
  ...engineerOrAdmin,
  uploadFields([
    { name: "image", maxCount: 1 },
    { name: "gallery", maxCount: 10 },
  ]),
  validateWorkUpdate,
  updateWork
);

// حذف عمل
router.delete("/:id", ...engineerOrAdmin, deleteWork);

module.exports = router;
