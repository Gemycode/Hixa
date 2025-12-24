const express = require("express");
const router = express.Router();

const {
  createServiceOrder,
  getServiceOrders,
  getServiceOrderById,
  updateServiceOrder,
  deleteServiceOrder,
} = require("../controllers/serviceOrderController");

const { protect, restrictTo } = require("../middleware/auth");
const { validateServiceOrderCreate, validateServiceOrderUpdate } = require("../middleware/validate");

// Public submit
router.post("/", validateServiceOrderCreate, createServiceOrder);

// Admin management
router.use(protect, restrictTo("admin"));
router.get("/", getServiceOrders);
router.get("/:id", getServiceOrderById);
router.put("/:id", validateServiceOrderUpdate, updateServiceOrder);
router.delete("/:id", deleteServiceOrder);

module.exports = router;
