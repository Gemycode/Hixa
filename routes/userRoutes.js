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

// Current user profile routes
router.use(protect);
router.get("/me", getProfile);
router.put("/me", uploadSingle("avatar"), validateProfileUpdate, updateProfile);
router.put("/me/change-password", validatePasswordChange, changePassword);

// Admin routes
router.use(adminOnly);

router.get("/", getUsers);
router.post("/", validateUserCreate, createUser);

router.get("/:id", getUserById);
router.put("/:id", validateUserUpdate, updateUser);
router.delete("/:id", deleteUser);

// New admin routes
router.post("/bulk-delete", bulkDeleteUsers);
router.patch("/:id/toggle-activation", toggleUserActivation);

module.exports = router;