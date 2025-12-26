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
app.set('io', io); // Store io instance for use in controllers

app.set('trust proxy', 1);

app.use(helmet());

// CORS Configuration - Allow any localhost port in development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // In production, use FRONTEND_URL if set
    if (process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL) {
      const allowedOrigins = process.env.FRONTEND_URL.split(',').map(url => url.trim());
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    }
    
    // In development, allow any localhost origin (any port)
    if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
      return callback(null, true);
    }
    
    // Allow specific FRONTEND_URL if set in development
    if (process.env.FRONTEND_URL) {
      const allowedOrigins = process.env.FRONTEND_URL.split(',').map(url => url.trim());
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
    }
    
    // Default: allow in development, deny in production
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
};

app.use(cors(corsOptions));

app.use(express.json({ limit: config.fileUpload?.maxFileUpload || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use("/api", apiLimiter);
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

// Log all API requests in development
if (process.env.NODE_ENV === 'development') {
  app.use(`${API_PREFIX}*`, (req, res, next) => {
    if (req.path.includes('/messages')) {
      console.log('🌐 API Request:', req.method, req.originalUrl, 'Path:', req.path);
    }
    next();
  });
}

app.use(`${API_PREFIX}auth`, authRoutes);
app.use(`${API_PREFIX}content`, contentRoutes);
app.use(`${API_PREFIX}users`, userRoutes);
app.use(`${API_PREFIX}subscribers`, subscriberRoutes);
app.use(`${API_PREFIX}projects`, projectRoutes);
app.use(`${API_PREFIX}portfolio`, portfolioRoutes);
app.use(`${API_PREFIX}service-orders`, serviceOrderRoutes);
app.use(`${API_PREFIX}proposals`, proposalRoutes);
app.use(`${API_PREFIX}project-rooms`, projectRoomRoutes);
app.use(`${API_PREFIX}chat-rooms`, chatRoomRoutes);
app.use(`${API_PREFIX}messages`, messageRoutes);
app.use(`${API_PREFIX}notifications`, notificationRoutes);

// Log all registered routes for debugging
if (process.env.NODE_ENV === 'development' || process.env.LOG_ROUTES === 'true') {
  console.log('📋 Registered API Routes:');
  console.log(`  - ${API_PREFIX}project-rooms/:roomId/chat-rooms (GET)`);
  console.log(`  - ${API_PREFIX}chat-rooms/:roomId/read (PUT)`);
  console.log(`  - ${API_PREFIX}messages/room/:roomId (GET)`);
}

app.get("/", (req, res) => res.send("HIXA API is running"));

app.use(errorHandler);

module.exports = { app, server };
