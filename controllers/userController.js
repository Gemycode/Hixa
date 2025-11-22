const User = require("../models/userModel");

const sanitizeUser = (user) => ({
  id: user._id,
  email: user.email,
  name: user.name,
  role: user.role,
  isActive: user.isActive,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// Create new user (admin action)
const createUser = async (req, res, next) => {
  try {
    const { email, password, name, role, isActive } = req.body;

    const user = await User.create({
      email,
      password,
      name: name || email.split("@")[0],
      role: role || "customer",
      ...(typeof isActive !== "undefined" && { isActive }),
    });

    res.status(201).json({
      message: "تم إنشاء المستخدم بنجاح",
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// List users with filters & pagination
const getUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const { role, search, isActive } = req.query;
    const filters = {};

    if (role) {
      filters.role = role;
    }

    if (typeof isActive !== "undefined") {
      filters.isActive = isActive === "true" || isActive === true;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      filters.$or = [{ email: regex }, { name: regex }];
    }

    const [users, total] = await Promise.all([
      User.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filters),
    ]);

    res.json({
      data: users.map(sanitizeUser),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single user
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    res.json({ data: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

// Update user
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = {};

    ["email", "name", "role", "isActive"].forEach((field) => {
      if (typeof req.body[field] !== "undefined") {
        updates[field] = req.body[field];
      }
    });

    if (req.body.password) {
      updates.password = req.body.password;
    }

    const user = await User.findById(id).select("+password");

    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    Object.assign(user, updates);
    await user.save();

    res.json({
      message: "تم تحديث بيانات المستخدم بنجاح",
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// Delete user
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    res.json({ message: "تم حذف المستخدم بنجاح" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
};

