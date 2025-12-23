require('module-alias/register');
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');
const NodeCache = require('node-cache');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Import config
const config = require('./config/config');

// Import middlewares
const { errorHandler } = require('@middleware/errorHandler');
const { securityHeaders, apiLimiter, authLimiter, handlePreflight } = require('@middleware/security');
const { requestLogger, errorLogger } = require('@utils/logger');

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

// Enable CORS pre-flight
app.options('*', cors(config.corsOptions));

// Security headers
app.use(securityHeaders);

// Handle preflight requests
app.use(handlePreflight);

// Enable CORS
app.use(cors(config.corsOptions));

// Compress responses
app.use(compression());

// Parse JSON request body
app.use(express.json({ limit: config.fileUpload.maxFileUpload }));

// Parse URL-encoded request body
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger);
  
  // Log HTTP requests in development
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }
}

// Rate limiting for auth routes
app.use('/api/v1/auth', authLimiter);

// Apply API rate limiting to all routes
app.use(apiLimiter);

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
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // Handle SPA
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

// 404 handler
app.all('*', (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `لا يمكن العثور على ${req.originalUrl} على هذا الخادم!`,
  });
});

// Error logging middleware
app.use(errorLogger);

// Global error handler
app.use(errorHandler);

module.exports = { app, server };



