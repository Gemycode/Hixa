const express = require("express");
const router = express.Router();

const {
  createUser,
  getUsers,
  getAdminUserFiltersMeta,
  getUserById,
  updateUser,
  deleteUser,
  getProfile,
  updateProfile,
  bulkDeleteUsers,
  toggleUserActivation,
  changePassword
} = require("../controllers/userController");

const { protect, restrictTo } = require("../middleware/auth");
const {
  validateUserCreate,
  validateUserUpdate,
  validateProfileUpdate,
  validatePasswordChange
} = require("../middleware/validate");
const { uploadSingle } = require("../middleware/upload");

// Current user profile
router.get("/me", protect, getProfile);
router.put("/me", protect, uploadSingle("avatar"), validateProfileUpdate, updateProfile);
router.put("/me/change-password", protect, validatePasswordChange, changePassword);

// Admin routes
router.get("/", protect, restrictTo("admin"), getUsers);
router.post("/", protect, restrictTo("admin"), validateUserCreate, createUser);
// Admin: dropdown metadata for filters (countries + business scopes)
router.get("/filters/meta", protect, restrictTo("admin"), getAdminUserFiltersMeta);
router.get("/:id", protect, restrictTo("admin"), getUserById);
router.put("/:id", protect, restrictTo("admin"), validateUserUpdate, updateUser);
router.delete("/:id", protect, restrictTo("admin"), deleteUser);
router.post("/bulk-delete", protect, restrictTo("admin"), bulkDeleteUsers);
router.patch("/:id/toggle-activation", protect, restrictTo("admin"), toggleUserActivation);

module.exports = router;
