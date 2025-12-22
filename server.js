const app = require("./app");
const { connectDB } = require("./config/db");

// Connect to MongoDB
const { MONGO_URI } = process.env;

if (!MONGO_URI) {
  console.error("❌ Missing MONGO_URI in environment variables");
  process.exit(1);
}

connectDB();

const http = require("http");
const { initSocket } = require("./socket");

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
