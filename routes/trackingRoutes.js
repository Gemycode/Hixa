const express = require("express");
const router = express.Router();

const {
  trackEvent,
  getVisitors,
  getPageViews,
  getEvents,
  getActivity,
  getDailyStats,
} = require("../controllers/trackingController");

const { protect, restrictTo } = require("../middleware/auth");
const { trackLimiter } = require("../middleware/security");

/**
 * POST /api/track
 * Public endpoint to track events
 * - Rate limited: 1 request per second per IP or session
 * - Fails silently on errors (always returns 200)
 */
router.post("/track", trackLimiter, trackEvent);

/**
 * Admin Analytics Endpoints
 * All require authentication and admin role
 */
router.get("/admin/analytics/visitors", protect, restrictTo("admin"), getVisitors);
router.get("/admin/analytics/page-views", protect, restrictTo("admin"), getPageViews);
router.get("/admin/analytics/events", protect, restrictTo("admin"), getEvents);
router.get("/admin/analytics/activity", protect, restrictTo("admin"), getActivity);
router.get("/admin/analytics/daily", protect, restrictTo("admin"), getDailyStats);

module.exports = router;
