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
// Custom sanitization middleware will be used instead of express-mongo-sanitize
const hpp = require('hpp');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Import config
const config = require('./config/config');

// Import middlewares
const { errorHandler } = require('@middleware/errorHandler');
const { apiLimiter, authLimiter } = require('@middleware/security');

// Import routes
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

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
const WebSocketServer = require('@websocket/websocket');
const wss = new WebSocketServer(server);

// Initialize cache with 10 minutes TTL
const cache = new NodeCache({ stdTTL: 600 });

// Make cache and WebSocket server available in app
app.set('cache', cache);
app.set('wss', wss);

// Trust proxy
app.set('trust proxy', 1);

// Enable CORS with specific configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Access-Token']
};

// Apply security middleware first
app.use(helmet());

// Apply CORS with proper configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Access-Token'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // 10 minutes
}));

// Apply rate limiting to API routes
app.use("/api", apiLimiter);

// Custom NoSQL injection protection
app.use((req, res, next) => {
  try {
    // Skip WebSocket upgrade requests
    if (req.headers.upgrade === 'websocket') {
      return next();
    }

    // Sanitize query parameters
    if (req.query) {
      const sanitizedQuery = {};
      for (const [key, value] of Object.entries(req.query)) {
        // Ignore any key that starts with $
        if (!key.startsWith('$')) {
          sanitizedQuery[key] = value;
        }
      }
      // Replace the query object with our sanitized version
      req.query = sanitizedQuery;
    }

    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      const sanitizedBody = {};
      for (const [key, value] of Object.entries(req.body)) {
        // Ignore any key that starts with $
        if (!key.startsWith('$')) {
          sanitizedBody[key] = value;
        }
      }
      // Replace the body with our sanitized version
      req.body = sanitizedBody;
    }

    next();
  } catch (error) {
    console.error('Error in custom sanitization middleware:', error);
    next();
  }
});

// Prevent parameter pollution
app.use(hpp({
  whitelist: [
    'duration',
    'ratingsQuantity',
    'ratingsAverage',
    'maxGroupSize',
    'difficulty',
    'price'
  ]
}));

// Compress responses
app.use(compression());

// Parse JSON request body
app.use(express.json({ limit: config.fileUpload?.maxFileUpload || '10mb' }));

// Parse URL-encoded request body
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  // Log HTTP requests in development
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }
}

// Rate limiting for auth routes
app.use('/api/v1/auth', authLimiter);

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

// Data sanitization middleware
app.use((req, res, next) => {
  if (req.body) req.body = mongoSanitize.sanitize(req.body);
  if (req.query) req.query = mongoSanitize.sanitize(req.query);
  if (req.params) req.params = mongoSanitize.sanitize(req.params);
  next();
});

// HTTP request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Apply rate limiting to API routes
app.use("/api", apiLimiter);

// Root API check
app.get("/", (req, res) => {
  res.send("HIXA API is running");
});

// API Routes
const API_PREFIX = '/api/v1';

// Public routes
app.use(`${API_PREFIX}/health`, (req, res) => res.status(200).json({ status: 'ok' }));

// API routes with versioning
app.use(`${API_PREFIX}/content`, contentRoutes);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/subscribers`, subscriberRoutes);
app.use(`${API_PREFIX}/projects`, projectRoutes);
app.use(`${API_PREFIX}/portfolio`, portfolioRoutes);
app.use(`${API_PREFIX}/service-orders`, serviceOrderRoutes);
app.use(`${API_PREFIX}/proposals`, proposalRoutes);

// Chat system routes
app.use(`${API_PREFIX}/project-rooms`, projectRoomRoutes);
app.use(`${API_PREFIX}/chat-rooms`, chatRoomRoutes);
app.use(`${API_PREFIX}/messages`, messageRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  const staticPath = path.join(__dirname, 'client/build');
  
  // Serve static files
  app.use(express.static(staticPath));
  
  // Handle SPA - serve index.html for any non-API routes
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
} else {
  // 404 handler for API routes in development
  app.all('/api/:any*', (req, res) => {
    res.status(404).json({
      success: false,
      message: `API endpoint not found: ${req.originalUrl}`,
    });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'حدث خطأ في الخادم',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

module.exports = { app, server };
