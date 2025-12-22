const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

// Helper function to generate JWT token
const generateToken = (userId, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET غير مُعد في البيئة");
  }
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
};

// Register new user
const register = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      name: name || email.split("@")[0],
      role: role && role.toLowerCase() !== "admin" ? role.toLowerCase() : "customer",
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Return user data (without password)
    res.status(201).json({
      message: "تم التسجيل بنجاح",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ message: "الحساب غير مفعّل" });
    }

    // Compare password
    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Return user data (without password)
    res.json({
      message: "تم تسجيل الدخول بنجاح",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

module.exports = { register, login };
