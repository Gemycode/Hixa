const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const protect = async (req, res, next) => {
  // Log for message routes
  if (req.path && req.path.includes('/messages')) {
    console.log('🔐 Protect middleware - Message route:', req.method, req.path, 'Full URL:', req.originalUrl);
  }
  
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    if (req.path && req.path.includes('/messages')) {
      console.log('❌ Protect middleware - No token for message route');
    }
    return res.status(401).json({ message: "غير مصرح لك بالدخول - يرجى تسجيل الدخول" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.sub).select("-password");
    if (!user) return res.status(401).json({ message: "المستخدم غير موجود" });
    if (!user.isActive) return res.status(403).json({ message: "الحساب غير مفعّل" });

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") return res.status(401).json({ message: "انتهت صلاحية الجلسة" });
    return res.status(401).json({ message: "رمز الوصول غير صالح" });
  }
};

const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "لا تملك الصلاحية للوصول" });
  }
  next();
};

module.exports = { protect, restrictTo };
