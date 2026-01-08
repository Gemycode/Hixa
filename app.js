require('module-alias/register');
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');
const NodeCache = require('node-cache');
const helmet = require('helmet');
const hpp = require('hpp');

dotenv.config({ path: path.join(__dirname, '.env') });

const config = require('./config/config');
const errorHandler = require('@middleware/errorHandler');
const { apiLimiter, authLimiter } = require('@middleware/security');

const contentRoutes = require('@routes/contentRoutes');
const authRoutes = require('@routes/authRoutes');
const userRoutes = require('@routes/userRoutes');
const adminRoutes = require('@routes/adminRoutes');
const subscriberRoutes = require('@routes/subscriberRoutes');
const projectRoutes = require('@routes/projectRoutes');
const portfolioRoutes = require('@routes/portfolioRoutes');
const serviceOrderRoutes = require('@routes/serviceOrderRoutes');
const proposalRoutes = require('@routes/proposalRoutes');
const projectRoomRoutes = require('@routes/projectRoomRoutes');
const chatRoomRoutes = require('@routes/chatRoomRoutes');
const messageRoutes = require('@routes/messageRoutes');
const notificationRoutes = require('@routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io for real-time communication
const { initSocket } = require('./socket');
const io = initSocket(server);

const cache = new NodeCache({ stdTTL: 600 });
app.set('cache', cache);
app.set('io', io);

app.set('trust proxy', 1);

app.use(helmet());


// ================== FIXED CORS ==================
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log("🌐 CORS: Request with no origin, allowing");
      return callback(null, true);
    }

    const allowedOrigins = [
      "https://hixa.com.sa",
      "https://www.hixa.com.sa",
      "http://localhost:3000",
      "http://localhost:5173", // Vite dev server
      "http://localhost:5174",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
    ];

    console.log("🌐 CORS: Checking origin:", origin);
    
    if (allowedOrigins.includes(origin)) {
      console.log("✅ CORS: Origin allowed:", origin);
      return callback(null, true);
    }

    // Log blocked origin for debugging
    console.warn("🚫 CORS: Origin not allowed:", origin);
    console.warn("🚫 CORS: Allowed origins:", allowedOrigins);
    
    // In development, allow all origins for easier debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn("⚠️ CORS: Development mode - allowing origin anyway");
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
// =================================================


app.use(express.json({ limit: config.fileUpload?.maxFileUpload || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to API routes, but skip for certain endpoints
app.use("/api", (req, res, next) => {
  // Skip rate limiting for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }
  // Skip rate limiting for health check
  if (req.path === '/' || req.path === '/health') {
    return next();
  }
  // Apply rate limiter for all other requests
  apiLimiter(req, res, next);
});
app.use(hpp());

/* ===== Deep NoSQL Sanitizer ===== */
const deepSanitize = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  const clean = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    if (!key.startsWith('$') && key !== '__proto__') {
      clean[key] = deepSanitize(obj[key]);
    }
  }
  return clean;
};

app.use((req, res, next) => {
  if (req.body) req.body = deepSanitize(req.body);
  if (req.query) req.query = deepSanitize(req.query);
  next();
});
/* =============================== */

app.use(compression());

if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

const API_PREFIX = '/api/';

// Logging (unchanged)
app.use(`${API_PREFIX}project-rooms`, (req, res, next) => {
  console.log('🌐 ProjectRoom API Request:', req.method, req.originalUrl, 'Path:', req.path, 'Params:', req.params);
  next();
});

if (process.env.NODE_ENV === 'development') {
  app.use(`${API_PREFIX}*`, (req, res, next) => {
    if (req.path.includes('/messages')) {
      console.log('🌐 API Request:', req.method, req.originalUrl, 'Path:', req.path);
    }
    next();
  });
}

// Routes
app.use(`${API_PREFIX}auth`, authRoutes);
app.use(`${API_PREFIX}content`, contentRoutes);
app.use(`${API_PREFIX}users`, userRoutes);
app.use(`${API_PREFIX}admin`, adminRoutes);
app.use(`${API_PREFIX}subscribers`, subscriberRoutes);
app.use(`${API_PREFIX}projects`, projectRoutes);
app.use(`${API_PREFIX}portfolio`, portfolioRoutes);
app.use(`${API_PREFIX}service-orders`, serviceOrderRoutes);
app.use(`${API_PREFIX}proposals`, proposalRoutes);
app.use(`${API_PREFIX}project-rooms`, projectRoomRoutes);
app.use(`${API_PREFIX}chat-rooms`, chatRoomRoutes);
app.use(`${API_PREFIX}messages`, messageRoutes);
app.use(`${API_PREFIX}notifications`, notificationRoutes);

// Root
app.get("/", (req, res) => res.send("HIXA API is running"));

app.use(errorHandler);

module.exports = { app, server };
