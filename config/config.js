require('dotenv').config();

const config = {
  // Server Configuration
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
    expiresIn: process.env.JWT_EXPIRE || '30d',
    cookieExpire: parseInt(process.env.JWT_COOKIE_EXPIRE, 10) || 30, // days
  },
  
  // Database
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/hixa',
  
  // File Uploads
  fileUpload: {
    maxFileUpload: parseInt(process.env.MAX_FILE_UPLOAD, 10) || 5 * 1024 * 1024, // 5MB
    uploadPath: process.env.FILE_UPLOAD_PATH || './public/uploads',
    allowedFileTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ],
  },
  
  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: 'hixa/attachments',
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // limit each IP to 100 requests per windowMs
  },
  
  // CORS
  cors: {
    enabled: process.env.CORS_ENABLED !== 'false',
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  
  // Security Headers
  security: {
    helmet: process.env.HELMET_ENABLED !== 'false',
    rateLimit: process.env.RATE_LIMIT_ENABLED !== 'false',
    mongoSanitize: true,
    xssProtection: true,
  },
  
  // WebSocket
  webSocket: {
    path: process.env.WEBSOCKET_PATH || '/ws',
  },
  
  // API Documentation
  apiDocs: {
    enabled: process.env.NODE_ENV !== 'production',
    path: process.env.SWAGGER_URL || '/api-docs',
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
  
  // Feature Flags
  features: {
    chat: process.env.FEATURE_CHAT !== 'false',
    uploads: process.env.FEATURE_UPLOADS !== 'false',
    emailVerification: process.env.FEATURE_EMAIL_VERIFICATION === 'true',
  },
};

// Validate required configuration
const requiredConfig = ['MONGO_URI', 'JWT_SECRET'];
requiredConfig.forEach((key) => {
  if (!process.env[key] && !config[key]) {
    console.error(`FATAL ERROR: ${key} is not defined`);
    process.exit(1);
  }
});

module.exports = config;
