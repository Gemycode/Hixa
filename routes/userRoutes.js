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
} = require("../controllers/userController");
const { protect, adminOnly } = require("../middleware/auth");
const { validateUserCreate, validateUserUpdate, validateProfileUpdate } = require("../middleware/validate");
const { uploadSingle } = require("../middleware/upload");

// Current user profile routes
router.use(protect);
router.get("/me", getProfile);
router.put("/me", uploadSingle("avatar"), validateProfileUpdate, updateProfile);

// Admin routes
router.use(adminOnly);

router.get("/", getUsers);
router.post("/", validateUserCreate, createUser);

router.get("/:id", getUserById);
router.put("/:id", validateUserUpdate, updateUser);
router.delete("/:id", deleteUser);

module.exports = router;

