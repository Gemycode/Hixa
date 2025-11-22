const express = require("express");
const router = express.Router();

const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/userController");
const { protect, adminOnly } = require("../middleware/auth");
const { validateUserCreate, validateUserUpdate } = require("../middleware/validate");

router.use(protect, adminOnly);

router.get("/", getUsers);
router.post("/", validateUserCreate, createUser);

router.get("/:id", getUserById);
router.put("/:id", validateUserUpdate, updateUser);
router.delete("/:id", deleteUser);

module.exports = router;

