const express = require("express");
const router = express.Router();

const {
  createServiceOrder,
  getServiceOrders,
  getServiceOrderById,
  updateServiceOrder,
  deleteServiceOrder,
} = require("../controllers/serviceOrderController");
const { protect, adminOnly } = require("../middleware/auth");
const { validateServiceOrderCreate, validateServiceOrderUpdate } = require("../middleware/validate");
const { uploadSingle } = require("../middleware/upload");

// Public submit (landing modal)
router.post("/", uploadSingle("image"), validateServiceOrderCreate, createServiceOrder);

// Admin management
router.use(protect, adminOnly);
router.get("/", getServiceOrders);
router.get("/:id", getServiceOrderById);
router.put("/:id", uploadSingle("image"), validateServiceOrderUpdate, updateServiceOrder);
router.delete("/:id", deleteServiceOrder);

module.exports = router;




