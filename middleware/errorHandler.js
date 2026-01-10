const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error("❌ Error Handler - Error occurred:", err);
  console.error("❌ Error Handler - Error name:", err.name);
  console.error("❌ Error Handler - Error message:", err.message);
  console.error("❌ Error Handler - Error stack:", err.stack);
  console.error("❌ Error Handler - Request path:", req.path);
  console.error("❌ Error Handler - Request method:", req.method);

  // Multer errors (file upload)
  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "حجم الملف كبير جداً. الحد الأقصى المسموح به هو 50MB",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        message: "عدد الملفات كبير جداً",
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        message: "حقل ملف غير متوقع",
      });
    }
    return res.status(400).json({
      message: err.message || "خطأ في رفع الملف",
    });
  }

  // File filter errors (from multer)
  if (err.message && err.message.includes("نوع الملف غير مدعوم")) {
    return res.status(400).json({
      message: err.message,
    });
  }

  // Cloudinary errors
  if (err.message && err.message.includes("فشل رفع")) {
    return res.status(500).json({
      message: err.message || "فشل رفع الملف إلى السحابة",
    });
  }

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

  // Mongoose CastError (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      message: "معرف غير صحيح",
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