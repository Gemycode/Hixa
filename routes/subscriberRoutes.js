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

const { protect, restrictTo } = require("../middleware/auth");
const { validateSubscribe, validateSubscriberUpdate } = require("../middleware/validate");

// Public
router.post("/subscribe", validateSubscribe, subscribe);
router.post("/unsubscribe", unsubscribe);

// Admin
router.get("/", protect, restrictTo("admin"), getSubscribers);
router.get("/statistics", protect, restrictTo("admin"), getStatistics);
router.get("/export", protect, restrictTo("admin"), exportSubscribers);
router.get("/:id", protect, restrictTo("admin"), getSubscriberById);
router.put("/:id", protect, restrictTo("admin"), validateSubscriberUpdate, updateSubscriber);
router.delete("/:id", protect, restrictTo("admin"), deleteSubscriber);

module.exports = router;
