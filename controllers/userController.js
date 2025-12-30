const User = require("../models/userModel");

const sanitizeUser = (user) => ({
  id: user._id,
  email: user.email,
  name: user.name,
  role: user.role,
  phone: user.phone,
  nationalId: user.nationalId,
  country: user.country,
  city: user.city,
  location: user.location, // Keep for backward compatibility
  bio: user.bio,
  specializations: user.specializations || [],
  certifications: user.certifications || [],
  averageRating: user.averageRating,
  reviewsCount: user.reviewsCount,
  avatar: user.avatar,
  isActive: user.isActive,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// Get current user's profile
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    res.json({ data: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

// Update current user's profile
const { uploadToCloudinary } = require("../middleware/upload");

const updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone, countryCode, country, city, location, bio, specializations, certifications } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    if (typeof name !== "undefined") user.name = name;
    if (typeof email !== "undefined") user.email = email;
    if (typeof phone !== "undefined") user.phone = phone;
    if (typeof countryCode !== "undefined") user.countryCode = countryCode;
    if (typeof country !== "undefined") user.country = country;
    if (typeof city !== "undefined") user.city = city;
    if (typeof location !== "undefined") user.location = location;
    // Auto-generate location if country/city changed
    if ((country !== undefined || city !== undefined) && !location) {
      const newCountry = country !== undefined ? country : user.country;
      const newCity = city !== undefined ? city : user.city;
      if (newCountry && newCity) {
        user.location = `${newCity}, ${newCountry}`;
      }
    }
    if (typeof bio !== "undefined") user.bio = bio;

    // Helper parsers
    const parseStringArray = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        } catch (_e) {
          // fallback: comma or newline separated
          return val
            .split(/[,\\n]/)
            .map((v) => v.trim())
            .filter(Boolean);
        }
      }
      return [];
    };

    const parseCertifications = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        } catch (_e) {
          return [];
        }
      }
      return [];
    };

    if (typeof specializations !== "undefined") {
      user.specializations = parseStringArray(specializations);
    }

    if (typeof certifications !== "undefined") {
      user.certifications = parseCertifications(certifications);
    }

    if (req.file) {
      const url = await uploadToCloudinary(req.file.buffer, `hixa/users/${user._id}/avatar`);
      user.avatar = { url, uploadedAt: new Date() };
    }

    await user.save();

    res.json({
      message: "تم تحديث الملف الشخصي بنجاح",
      data: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// Create new user (admin action)
const createUser = async (req, res, next) => {
  try {
    const { email, password, name, phone, nationalId, role, isActive } = req.body;

    const user = await User.create({
      email,
      password,
      name: name || email.split("@")[0],
      phone: phone || "",
      nationalId: nationalId || "",
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

    ["email", "name", "phone", "nationalId", "country", "city", "location", "role", "isActive"].forEach((field) => {
      if (typeof req.body[field] !== "undefined") {
        updates[field] = req.body[field];
      }
    });

    // Auto-generate location if country/city changed
    if ((req.body.country !== undefined || req.body.city !== undefined) && !req.body.location) {
      const user = await User.findById(id);
      const newCountry = req.body.country !== undefined ? req.body.country : user.country;
      const newCity = req.body.city !== undefined ? req.body.city : user.city;
      if (newCountry && newCity) {
        updates.location = `${newCity}, ${newCountry}`;
      }
    }

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
    const { id } = req.params;
    
    // Prevent users from deleting themselves
    if (req.user.id === id) {
      return res.status(400).json({ message: "لا يمكنك حذف حسابك الخاص" });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    
    res.json({ message: "تم حذف المستخدم بنجاح" });
  } catch (error) {
    next(error);
  }
};

// Bulk delete users (admin only)
const bulkDeleteUsers = async (req, res, next) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "يجب تقديم مصفوفة من معرفات المستخدمين" });
    }
    
    // Prevent deleting oneself
    if (ids.includes(req.user.id)) {
      return res.status(400).json({ message: "لا يمكنك حذف حسابك الخاص" });
    }
    
    const result = await User.deleteMany({ _id: { $in: ids } });
    
    res.json({ 
      message: `تم حذف ${result.deletedCount} مستخدم بنجاح`,
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    next(error);
  }
};

// Toggle user activation status (admin only)
const toggleUserActivation = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Prevent users from toggling their own activation
    if (req.user.id === id) {
      return res.status(400).json({ message: "لا يمكنك تغيير حالة تفعيل حسابك الخاص" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    
    user.isActive = !user.isActive;
    await user.save();
    
    res.json({
      message: user.isActive 
        ? "تم تفعيل المستخدم بنجاح" 
        : "تم إلغاء تفعيل المستخدم بنجاح",
      user: sanitizeUser(user)
    });
  } catch (error) {
    next(error);
  }
};

// Change password for current user
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ 
        message: "جميع الحقول مطلوبة: كلمة المرور الحالية، كلمة المرور الجديدة، وتأكيد كلمة المرور الجديدة" 
      });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ 
        message: "كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقين" 
      });
    }

    // Get user with password
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "كلمة المرور الحالية غير صحيحة" });
    }

    // Check if new password is different from current password
    const isNewDifferent = !(await user.comparePassword(newPassword));
    if (!isNewDifferent) {
      return res.status(400).json({ 
        message: "كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية" 
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getProfile,
  updateProfile,
  bulkDeleteUsers,
  toggleUserActivation,
  changePassword
};

