const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error("Error:", err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message).join(", ");
    return res.status(400).json({
      message: "خطأ في التحقق من البيانات",
      errors: messages,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      message: `${field} مستخدم بالفعل`,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      message: "رمز الوصول غير صالح",
    });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      message: "انتهت صلاحية رمز الوصول",
    });
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "خطأ في الخادم";

  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;