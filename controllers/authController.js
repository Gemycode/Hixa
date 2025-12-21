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
      role: role || "client",
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

    // Build user response based on role
    const userResponse = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    // Add role-specific fields
    if (user.role === "company") {
      userResponse.companyName = user.companyName;
      userResponse.contactPersonName = user.contactPersonName;
    } else if (user.role === "engineer") {
      userResponse.licenseNumber = user.licenseNumber;
      userResponse.specializations = user.specializations;
    }

    // Return user data (without password)
    res.json({
      message: "تم تسجيل الدخول بنجاح",
      token,
      user: userResponse,
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Register Company
const registerCompany = async (req, res) => {
  try {
    const { companyName, contactPersonName, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }

    // Create new company user
    const user = await User.create({
      email,
      password,
      name: contactPersonName,
      role: "company",
      companyName,
      contactPersonName,
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Return user data (without password)
    res.status(201).json({
      message: "تم تسجيل الشركة بنجاح",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        companyName: user.companyName,
        contactPersonName: user.contactPersonName,
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

// Register Engineer
const registerEngineer = async (req, res) => {
  try {
    const { fullName, specialization, licenseNumber, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }

    // Check if license number already exists
    const existingLicense = await User.findOne({ licenseNumber });
    if (existingLicense) {
      return res.status(409).json({ message: "رقم الرخصة المهنية مستخدم بالفعل" });
    }

    // Parse specializations (can be comma-separated string or array)
    let specializationsArray = [];
    if (specialization) {
      if (typeof specialization === "string") {
        specializationsArray = specialization
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
      } else if (Array.isArray(specialization)) {
        specializationsArray = specialization;
      }
    }

    // Create new engineer user
    const user = await User.create({
      email,
      password,
      name: fullName,
      role: "engineer",
      licenseNumber,
      specializations: specializationsArray,
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Return user data (without password)
    res.status(201).json({
      message: "تم تسجيل المهندس بنجاح",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        licenseNumber: user.licenseNumber,
        specializations: user.specializations,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.email) {
        return res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
      }
      if (error.keyPattern?.licenseNumber) {
        return res.status(409).json({ message: "رقم الرخصة المهنية مستخدم بالفعل" });
      }
    }
    res.status(500).json({ message: "خطأ في الخادم", error: error.message });
  }
};

// Register Client
const registerClient = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }

    // Create new client user
    const user = await User.create({
      email,
      password,
      name: fullName,
      role: "client",
    });

    // Generate token
    const token = generateToken(user._id, user.role);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Return user data (without password)
    res.status(201).json({
      message: "تم تسجيل العميل بنجاح",
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

module.exports = { register, login, registerCompany, registerEngineer, registerClient };
