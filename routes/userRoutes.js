const express = require("express");
const router = express.Router();

const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getProfile,
  updateProfile,
  bulkDeleteUsers,
  toggleUserActivation,
  changePassword
} = require("../controllers/userController");
const { protect, adminOnly } = require("../middleware/auth");
const { validateUserCreate, validateUserUpdate, validateProfileUpdate, validatePasswordChange } = require("../middleware/validate");
const { uploadSingle } = require("../middleware/upload");

// Current user profile routes (available to all authenticated users)
router.get("/me", protect, getProfile);
router.put("/me", protect, uploadSingle("avatar"), validateProfileUpdate, updateProfile);
router.put("/me/change-password", protect, validatePasswordChange, changePassword);

// Admin routes
router.get("/", protect, adminOnly, getUsers);
router.post("/", protect, adminOnly, validateUserCreate, createUser);

router.get("/:id", protect, adminOnly, getUserById);
router.put("/:id", protect, adminOnly, validateUserUpdate, updateUser);
router.delete("/:id", protect, adminOnly, deleteUser);

// New admin routes
router.post("/bulk-delete", protect, adminOnly, bulkDeleteUsers);
router.patch("/:id/toggle-activation", protect, adminOnly, toggleUserActivation);

module.exports = router;