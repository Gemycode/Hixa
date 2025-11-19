const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

// Protect route - requires authentication
const protect = async (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "غير مصرح لك بالدخول - يرجى تسجيل الدخول" });
  }

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "خطأ في إعدادات الخادم" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "المستخدم غير موجود" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "الحساب غير مفعّل" });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "انتهت صلاحية رمز الوصول" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "رمز الوصول غير صالح" });
    }
    return res.status(401).json({ message: "فشل التحقق من الهوية" });
  }
};

// Admin only - requires admin role
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "غير مصرح لك بالدخول" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "غير مسموح - هذه الصفحة للمسؤولين فقط" });
  }
  next();
};

// Engineer or Admin - allows engineer and admin roles
const engineerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "غير مصرح لك بالدخول" });
  }
  if (req.user.role !== "admin" && req.user.role !== "engineer") {
    return res.status(403).json({ message: "غير مسموح - هذه الصفحة للمهندسين والمسؤولين فقط" });
  }
  next();
};

// Role-based access control - accepts array of allowed roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "غير مصرح لك بالدخول" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "غير مسموح - لا تملك الصلاحية للوصول" });
    }
    next();
  };
};

module.exports = { protect, adminOnly, engineerOrAdmin, restrictTo };
