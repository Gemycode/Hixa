const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const { RateLimitExceededError } = require('../utils/errors');

// Security best practices constants
const SELF = "'self'";
const UNSAFE_INLINE = "'unsafe-inline'";
const UNSAFE_EVAL = "'unsafe-eval'";
const DATA = 'data:';
const BLOB = 'blob:';

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Access-Token'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600, // 10 minutes
};

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
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: [SELF],
      scriptSrc: [SELF, UNSAFE_INLINE, UNSAFE_EVAL],
      scriptSrcAttr: [SELF, UNSAFE_INLINE],
      styleSrc: [SELF, UNSAFE_INLINE, 'https://fonts.googleapis.com'],
      imgSrc: [SELF, DATA, BLOB, 'https://res.cloudinary.com'],
      connectSrc: [SELF, 'https://api.cloudinary.com', 'ws://localhost:*', 'wss://*'],
      fontSrc: [SELF, 'https://fonts.gstatic.com', DATA],
      mediaSrc: [SELF, DATA, BLOB],
      objectSrc: ["'none'"],
      frameSrc: [SELF, 'https://www.youtube.com', 'https://www.google.com'],
      workerSrc: [SELF, BLOB],
      childSrc: [SELF, BLOB],
      formAction: [SELF],
      frameAncestors: [SELF],
      upgradeInsecureRequests: [],
    },
  }),
  // Security headers
  helmet.crossOriginEmbedderPolicy({ policy: 'credentialless' }),
  helmet.crossOriginOpenerPolicy({ policy: 'same-origin' }),
  helmet.crossOriginResourcePolicy({ policy: 'same-site' }),
  helmet.dnsPrefetchControl({ allow: false }),
  helmet.frameguard({ action: 'deny' }),
  helmet.hidePoweredBy(),
  helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }),
  helmet.ieNoOpen(),
  helmet.noSniff(),
  helmet.permittedCrossDomainPolicies({ permittedPolicies: 'none' }),
  helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }),
  helmet.xssFilter(),
  
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
// This is used by app.js to configure CORS

// Preflight handler is now handled by the cors middleware
const handlePreflight = (req, res, next) => next();

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
