const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const generateToken = (userId, role) => {
  return jwt.sign(
    { sub: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d", issuer: "hixa-api" }
  );
};

// General register (backward compatibility)
const register = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    if (await User.findOne({ email })) {
      return res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }

    const user = await User.create({
      email,
      password,
      name: name || email.split("@")[0],
      role: role && role !== "admin" ? role : "customer"
    });

    const token = generateToken(user._id, user.role);
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({ message: "تم التسجيل بنجاح", token, user });
  } catch (e) {
    res.status(500).json({ message: "خطأ في الخادم", error: e.message });
  }
};

// Register Company
const registerCompany = async (req, res) => {
  try {
    const { companyName, contactPersonName, email, password } = req.body;

    if (await User.findOne({ email })) {
      return res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }

    const user = await User.create({
      email,
      password,
      name: companyName, // استخدام companyName كاسم الشركة
      role: "company", // الشركات لها role منفصل
      phone: "", // يمكن إضافته لاحقاً
    });

    // يمكن حفظ contactPersonName في bio أو حقل آخر
    if (contactPersonName) {
      user.bio = `Contact Person: ${contactPersonName}`;
      await user.save();
    }

    const token = generateToken(user._id, user.role);
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({ 
      message: "تم تسجيل الشركة بنجاح", 
      token, 
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }
    res.status(500).json({ message: "خطأ في الخادم", error: e.message });
  }
};

// Register Engineer
const registerEngineer = async (req, res) => {
  try {
    const { fullName, specialization, licenseNumber, email, password } = req.body;

    if (await User.findOne({ email })) {
      return res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }

    // التحقق من أن licenseNumber فريد
    if (licenseNumber && await User.findOne({ nationalId: licenseNumber })) {
      return res.status(409).json({ message: "رقم الترخيص مستخدم بالفعل" });
    }

    const user = await User.create({
      email,
      password,
      name: fullName,
      role: "engineer",
      nationalId: licenseNumber || undefined, // استخدام nationalId لحفظ licenseNumber
      specializations: specialization ? [specialization] : [], // حفظ specialization
    });

    const token = generateToken(user._id, user.role);
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({ 
      message: "تم تسجيل المهندس بنجاح", 
      token, 
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        specializations: user.specializations,
        nationalId: user.nationalId,
      }
    });
  } catch (e) {
    if (e.code === 11000) {
      const field = e.keyPattern?.email ? "البريد الإلكتروني" : "رقم الترخيص";
      return res.status(409).json({ message: `${field} مستخدم بالفعل` });
    }
    res.status(500).json({ message: "خطأ في الخادم", error: e.message });
  }
};

// Register Client
const registerClient = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (await User.findOne({ email })) {
      return res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }

    const user = await User.create({
      email,
      password,
      name: fullName,
      role: "client",
    });

    const token = generateToken(user._id, user.role);
    user.lastLogin = new Date();
    await user.save();

    res.status(201).json({ 
      message: "تم تسجيل العميل بنجاح", 
      token, 
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
    }
    res.status(500).json({ message: "خطأ في الخادم", error: e.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    if (!user.isActive) return res.status(403).json({ message: "الحساب غير مفعّل" });

    // تحديد مدة صلاحية الـ token بناءً على rememberMe
    const expiresIn = rememberMe ? process.env.JWT_EXPIRES_IN_LONG || "30d" : process.env.JWT_EXPIRES_IN || "1d";
    const token = jwt.sign(
      { sub: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn, issuer: "hixa-api" }
    );
    
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    res.json({ message: "تم تسجيل الدخول بنجاح", token, user });
  } catch (e) {
    res.status(500).json({ message: "خطأ في الخادم", error: e.message });
  }
};

module.exports = { 
  register, 
  registerCompany,
  registerEngineer,
  registerClient,
  login 
};
