const Subscriber = require("../models/subscriberModel");

// Subscribe to newsletter (Public)
exports.subscribe = async (req, res) => {
  try {
    const { email, phone, name } = req.body;

    // Validation: At least email or phone required
    if (!email && !phone) {
      return res.status(400).json({
        message: "يجب توفير البريد الإلكتروني أو رقم الهاتف",
      });
    }

    // Check if subscriber already exists
    const existingSubscriber = await Subscriber.findOne({
      $or: [{ email: email || null }, { phone: phone || null }],
    });

    if (existingSubscriber) {
      // If exists but unsubscribed, reactivate
      if (!existingSubscriber.isActive) {
        existingSubscriber.isActive = true;
        existingSubscriber.subscribedAt = new Date();
        existingSubscriber.unsubscribedAt = undefined;
        if (name) existingSubscriber.name = name;
        await existingSubscriber.save();

        return res.json({
          message: "تم إعادة الاشتراك بنجاح",
          subscriber: {
            id: existingSubscriber._id,
            email: existingSubscriber.email,
            phone: existingSubscriber.phone,
          },
        });
      }

      return res.status(409).json({
        message: "أنت مشترك بالفعل في النشرة الإخبارية",
      });
    }

    // Create new subscriber
    const subscriber = await Subscriber.create({
      email: email || undefined,
      phone: phone || undefined,
      name: name || "",
      source: "newsletter",
    });

    res.status(201).json({
      message: "تم الاشتراك بنجاح في النشرة الإخبارية",
      subscriber: {
        id: subscriber._id,
        email: subscriber.email,
        phone: subscriber.phone,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "أنت مشترك بالفعل في النشرة الإخبارية",
      });
    }
    res.status(500).json({
      message: "خطأ في الخادم",
      error: error.message,
    });
  }
};

// Unsubscribe (Public)
exports.unsubscribe = async (req, res) => {
  try {
    const { email, phone, id } = req.body;

    let subscriber;

    if (id) {
      subscriber = await Subscriber.findById(id);
    } else if (email) {
      subscriber = await Subscriber.findOne({ email });
    } else if (phone) {
      subscriber = await Subscriber.findOne({ phone });
    } else {
      return res.status(400).json({
        message: "يجب توفير معرف المشترك أو البريد الإلكتروني أو رقم الهاتف",
      });
    }

    if (!subscriber) {
      return res.status(404).json({
        message: "المشترك غير موجود",
      });
    }

    subscriber.isActive = false;
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    res.json({
      message: "تم إلغاء الاشتراك بنجاح",
    });
  } catch (error) {
    res.status(500).json({
      message: "خطأ في الخادم",
      error: error.message,
    });
  }
};

// Get all subscribers (Admin)
exports.getSubscribers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const { search, isActive, source, startDate, endDate } = req.query;

    const filters = {};

    if (typeof isActive !== "undefined") {
      filters.isActive = isActive === "true" || isActive === true;
    }

    if (source) {
      filters.source = source;
    }

    if (startDate || endDate) {
      filters.subscribedAt = {};
      if (startDate) filters.subscribedAt.$gte = new Date(startDate);
      if (endDate) filters.subscribedAt.$lte = new Date(endDate);
    }

    if (search) {
      const regex = new RegExp(search, "i");
      filters.$or = [
        { email: regex },
        { phone: regex },
        { name: regex },
      ];
    }

    const [subscribers, total] = await Promise.all([
      Subscriber.find(filters)
        .sort({ subscribedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-__v"),
      Subscriber.countDocuments(filters),
    ]);

    res.json({
      data: subscribers,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
        active: await Subscriber.countDocuments({ ...filters, isActive: true }),
        inactive: await Subscriber.countDocuments({ ...filters, isActive: false }),
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "خطأ في الخادم",
      error: error.message,
    });
  }
};

// Get subscriber by ID (Admin)
exports.getSubscriberById = async (req, res) => {
  try {
    const subscriber = await Subscriber.findById(req.params.id).select("-__v");

    if (!subscriber) {
      return res.status(404).json({
        message: "المشترك غير موجود",
      });
    }

    res.json({
      data: subscriber,
    });
  } catch (error) {
    res.status(500).json({
      message: "خطأ في الخادم",
      error: error.message,
    });
  }
};

// Update subscriber (Admin)
exports.updateSubscriber = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone, name, isActive, tags, notes, source } = req.body;

    const subscriber = await Subscriber.findById(id);

    if (!subscriber) {
      return res.status(404).json({
        message: "المشترك غير موجود",
      });
    }

    if (email !== undefined) subscriber.email = email;
    if (phone !== undefined) subscriber.phone = phone;
    if (name !== undefined) subscriber.name = name;
    if (isActive !== undefined) {
      subscriber.isActive = isActive;
      if (!isActive && !subscriber.unsubscribedAt) {
        subscriber.unsubscribedAt = new Date();
      } else if (isActive && subscriber.unsubscribedAt) {
        subscriber.unsubscribedAt = undefined;
        subscriber.subscribedAt = new Date();
      }
    }
    if (tags !== undefined) subscriber.tags = tags;
    if (notes !== undefined) subscriber.notes = notes;
    if (source !== undefined) subscriber.source = source;

    await subscriber.save();

    res.json({
      message: "تم تحديث بيانات المشترك بنجاح",
      data: subscriber,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "البريد الإلكتروني أو رقم الهاتف مستخدم بالفعل",
      });
    }
    res.status(500).json({
      message: "خطأ في الخادم",
      error: error.message,
    });
  }
};

// Delete subscriber (Admin)
exports.deleteSubscriber = async (req, res) => {
  try {
    const subscriber = await Subscriber.findByIdAndDelete(req.params.id);

    if (!subscriber) {
      return res.status(404).json({
        message: "المشترك غير موجود",
      });
    }

    res.json({
      message: "تم حذف المشترك بنجاح",
    });
  } catch (error) {
    res.status(500).json({
      message: "خطأ في الخادم",
      error: error.message,
    });
  }
};

// Get statistics (Admin)
exports.getStatistics = async (req, res) => {
  try {
    const total = await Subscriber.countDocuments();
    const active = await Subscriber.countDocuments({ isActive: true });
    const inactive = await Subscriber.countDocuments({ isActive: false });

    // Subscribers by source
    const bySource = await Subscriber.aggregate([
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
        },
      },
    ]);

    // Subscribers by month (last 12 months)
    const byMonth = await Subscriber.aggregate([
      {
        $match: {
          subscribedAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$subscribedAt" },
            month: { $month: "$subscribedAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    res.json({
      total,
      active,
      inactive,
      bySource: bySource.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byMonth,
    });
  } catch (error) {
    res.status(500).json({
      message: "خطأ في الخادم",
      error: error.message,
    });
  }
};

// Export subscribers to CSV (Admin)
exports.exportSubscribers = async (req, res) => {
  try {
    const { isActive, source } = req.query;

    const filters = {};
    if (typeof isActive !== "undefined") {
      filters.isActive = isActive === "true" || isActive === true;
    }
    if (source) {
      filters.source = source;
    }

    const subscribers = await Subscriber.find(filters)
      .sort({ subscribedAt: -1 })
      .select("email phone name isActive source subscribedAt tags");

    // Convert to CSV
    const headers = ["Email", "Phone", "Name", "Active", "Source", "Subscribed At", "Tags"];
    const rows = subscribers.map((sub) => [
      sub.email || "",
      sub.phone || "",
      sub.name || "",
      sub.isActive ? "Yes" : "No",
      sub.source || "",
      sub.subscribedAt.toISOString().split("T")[0],
      sub.tags.join(", "),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=subscribers-${new Date().toISOString().split("T")[0]}.csv`);
    res.send("\ufeff" + csv); // BOM for Excel UTF-8 support
  } catch (error) {
    res.status(500).json({
      message: "خطأ في الخادم",
      error: error.message,
    });
  }
};














