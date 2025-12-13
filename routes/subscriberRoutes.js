const express = require("express");
const router = express.Router();

const {
  subscribe,
  unsubscribe,
  getSubscribers,
  getSubscriberById,
  updateSubscriber,
  deleteSubscriber,
  getStatistics,
  exportSubscribers,
} = require("../controllers/subscriberController");
const { protect, adminOnly } = require("../middleware/auth");
const { validateSubscribe, validateSubscriberUpdate } = require("../middleware/validate");

// Public routes
router.post("/subscribe", validateSubscribe, subscribe);
router.post("/unsubscribe", unsubscribe);

// Admin routes
router.get("/", protect, adminOnly, getSubscribers);
router.get("/statistics", protect, adminOnly, getStatistics);
router.get("/export", protect, adminOnly, exportSubscribers);
router.get("/:id", protect, adminOnly, getSubscriberById);
router.put("/:id", protect, adminOnly, validateSubscriberUpdate, updateSubscriber);
router.delete("/:id", protect, adminOnly, deleteSubscriber);

module.exports = router;




























