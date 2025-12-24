const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const generateToken = (userId, role) => {
  return jwt.sign(
    { sub: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d", issuer: "hixa-api" }
  );
};

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

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    }

    if (!user.isActive) return res.status(403).json({ message: "الحساب غير مفعّل" });

    const token = generateToken(user._id, user.role);
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    res.json({ message: "تم تسجيل الدخول بنجاح", token, user });
  } catch (e) {
    res.status(500).json({ message: "خطأ في الخادم", error: e.message });
  }
};

module.exports = { register, login };
