const Tracking = require("../models/trackingModel");

/**
 * POST /api/track
 * Track an event - fails silently on DB errors, always returns 200
 */
exports.trackEvent = async (req, res) => {
  try {
    const { event, page, userId, sessionId, data } = req.body;

    // Validate required fields
    if (!event || !page || !sessionId) {
      return res.status(200).json({ status: "ok" }); // Fail silently
    }

    // Create tracking record
    const trackingData = {
      event: String(event).trim(),
      page: String(page).trim(),
      sessionId: String(sessionId).trim(),
      userId: userId ? String(userId).trim() : null,
      data: data || {},
      userAgent: req.headers["user-agent"] || "",
      ip: req.ip || req.connection?.remoteAddress || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || "",
    };

    // Save to database - fail silently on error
    await Tracking.create(trackingData).catch(() => {
      // Silently ignore DB errors
    });

    return res.status(200).json({ status: "ok" });
  } catch (error) {
    // Fail silently - always return 200
    return res.status(200).json({ status: "ok" });
  }
};

/**
 * GET /api/admin/analytics/visitors
 * Get total visitors and sessions count
 */
exports.getVisitors = async (req, res, next) => {
  try {
    const result = await Tracking.aggregate([
      {
        $group: {
          _id: "$sessionId",
        },
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
        },
      },
    ]);

    const stats = result[0] || { totalSessions: 0 };
    
    res.json({
      totalVisitors: stats.totalSessions, // Unique sessions = unique visitors
      totalSessions: stats.totalSessions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/analytics/page-views
 * Get page views grouped by page
 */
exports.getPageViews = async (req, res, next) => {
  try {
    const pageViews = await Tracking.aggregate([
      {
        $group: {
          _id: "$page",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $project: {
          _id: 0,
          page: "$_id",
          views: "$count",
        },
      },
    ]);

    res.json({
      data: pageViews,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/analytics/events
 * Get events with filters: event, page, from, to
 * Returns list sorted by createdAt desc
 */
exports.getEvents = async (req, res, next) => {
  try {
    const { event, page, from, to } = req.query;

    // Build filter object
    const filter = {};
    if (event) filter.event = event;
    if (page) filter.page = page;

    // Date range filter
    if (from || to) {
      filter.createdAt = {};
      if (from) {
        filter.createdAt.$gte = new Date(from);
      }
      if (to) {
        filter.createdAt.$lte = new Date(to);
      }
    }

    const events = await Tracking.find(filter)
      .sort({ createdAt: -1 })
      .select("-__v")
      .lean();

    res.json({
      data: events,
      count: events.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/analytics/activity
 * Get last 100 events sorted by createdAt desc
 */
exports.getActivity = async (req, res, next) => {
  try {
    const activities = await Tracking.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .select("-__v")
      .lean();

    res.json({
      data: activities,
      count: activities.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/analytics/daily
 * Group events by date (YYYY-MM-DD) and return count per day
 */
exports.getDailyStats = async (req, res, next) => {
  try {
    const dailyStats = await Tracking.aggregate([
      {
        $project: {
          date: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
        },
      },
      {
        $group: {
          _id: "$date",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: -1 }, // Sort by date descending
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          count: 1,
        },
      },
    ]);

    res.json({
      data: dailyStats,
    });
  } catch (error) {
    next(error);
  }
};
