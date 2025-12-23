const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const { RateLimitExceededError } = require('../utils/errors');

// Rate limiting for API routes (100 requests per 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة بعد 15 دقيقة',
  handler: (req, res, next, options) => {
    throw new RateLimitExceededError(options.message);
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Rate limiting for authentication routes (5 requests per minute)
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per minute
  message: 'عدد محاولات تسجيل الدخول كثير جداً. يرجى المحاولة بعد دقيقة',
  handler: (req, res, next, options) => {
    throw new RateLimitExceededError(options.message);
  },
});

// Security headers middleware
const securityHeaders = [
  // Set security HTTP headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.cloudinary.com'],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Required for some CDNs
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    noSniff: true,
    xssFilter: true,
  }),
  
  // Prevent parameter pollution
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
  
  // Data sanitization against NoSQL query injection
  mongoSanitize(),
  
  // Data sanitization against XSS
  xss(),
];

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Access-Token',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
};

// Prevent CORS preflight issues
const handlePreflight = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
};

// Add security headers to response
const addSecurityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Force HTTPS
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Prevent content type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Disable caching for authenticated routes
  if (req.headers.authorization) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  
  next();
};

module.exports = {
  apiLimiter,
  authLimiter,
  securityHeaders,
  corsOptions,
  handlePreflight,
  addSecurityHeaders,
};
