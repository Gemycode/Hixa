const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const morgan = require("morgan");
const errorHandler = require("./middleware/errorHandler");
const { connectDB } = require("./config/db");

// تحميل env
dotenv.config();

const contentRoutes = require("./routes/contentRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const subscriberRoutes = require("./routes/subscriberRoutes");
const projectRoutes = require("./routes/projectRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const serviceOrderRoutes = require("./routes/serviceOrderRoutes");

const app = express();

// Middlewares
// JSON parser with better error handling
app.use(
  express.json({
    limit: "20kb",
    strict: true,
  })
);

// URL encoded parser for form data
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Handle JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      message: "خطأ في تنسيق JSON - يرجى التحقق من صحة البيانات المرسلة",
      error: "JSON syntax error",
      hint: "تأكد من عدم وجود فاصلة زائدة في نهاية البيانات (trailing comma)",
    });
  }
  next(err);
});

// Handle Multer errors (file upload errors)
app.use((err, req, res, next) => {
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
  next(err);
});

app.use(cors());
app.use(helmet());
app.use((req, res, next) => {
  req.body = mongoSanitize.sanitize(req.body);
  req.query = mongoSanitize.sanitize(req.query);
  req.params = mongoSanitize.sanitize(req.params);
  next();
});
app.use(compression());
app.use(morgan("dev"));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});
app.use("/api", limiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/subscribers", subscriberRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/service-orders", serviceOrderRoutes);

// 404 handler (route not found)
app.use((req, res) => {
  res.status(404).json({
    message: "المسار غير موجود",
    path: req.originalUrl,
  });
});

// Error handler
app.use(errorHandler);

// Connect to MongoDB
const { MONGO_URI } = process.env;

if (!MONGO_URI) {
  console.error("❌ Missing MONGO_URI in environment variables");
  process.exit(1);
}

connectDB();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
