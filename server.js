const { app, server } = require("./app");
const { connectDB } = require("./config/db");

// Connect to MongoDB
const { MONGO_URI, NODE_ENV, PORT = 5000 } = process.env;

if (!MONGO_URI) {
  console.error("❌ Missing MONGO_URI in environment variables");
  process.exit(1);
}

// Connect to database
connectDB()
  .then(() => {
    console.log('✅ Connected to MongoDB');
    
    // Start server
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running in ${NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`🔌 Socket.io server is running`);
    });
  })
  .catch(error => {
    console.error('❌ Failed to connect to MongoDB', error);
    // In development, start server anyway but warn about DB issues
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ Starting server without MongoDB connection (development mode)');
      server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running in ${NODE_ENV || 'development'} mode on port ${PORT}`);
        console.log(`🔌 Socket.io server is running`);
        console.warn('⚠️ MongoDB is not connected - API calls will fail');
      });
    } else {
    process.exit(1);
    }
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});
