const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const morgan = require("morgan");

// تحميل env
dotenv.config();

const contentRoutes = require("./routes/contentRoutes");

const app = express();

// Middlewares
app.use(express.json({ limit: "20kb" }));
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
app.use("/api/content", contentRoutes);

// Connect to MongoDB
const { MONGO_URI } = process.env;

if (!MONGO_URI) {
  console.error("❌ Missing MONGO_URI in environment variables");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ DB Error:", err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
