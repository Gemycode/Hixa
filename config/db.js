const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI is not defined in environment variables");
      process.exit(1);
    }
    console.log("🔄 Attempting to connect to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("❌ Full error:", err);
    // Don't exit in development - allow server to start but operations will fail
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn("⚠️ Continuing without MongoDB connection (development mode)");
    }
  }
};

module.exports = { connectDB };
