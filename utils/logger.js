const winston = require('winston');
const { createLogger, format, transports } = winston;
const path = require('path');
const fs = require('fs');
const { combine, timestamp, printf, colorize, json } = format;

// Create logs directory if it doesn't exist
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
  
  // Add stack trace if it exists
  if (stack) {
    log += `\n${stack}`;
  }
  
  // Add additional metadata if it exists
  const metaData = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
  if (metaData) {
    log += `\n${metaData}`;
  }
  
  return log;
});

// Log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Development logger format
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  logFormat
);

// Production logger format
const prodFormat = combine(
  timestamp(),
  format.errors({ stack: true }),
  json()
);

// Create logger instance
const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug', 
  levels,
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    // Console transport
    new transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    }),
    
    // Error logs file
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    
    // Combined logs file
    new transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
  exitOnError: false, // Don't exit on handled exceptions
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1); // Exit with failure
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optionally exit the process with a failure code
  // process.exit(1);
});

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Skip logging for health checks and static files in production
  if (
    process.env.NODE_ENV === 'production' && 
    (req.path === '/health' || req.path.startsWith('/static/'))
  ) {
    return next();
  }
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      user: req.user ? req.user._id : 'anonymous',
      userAgent: req.get('user-agent'),
    });
  });
  
  next();
};

// Error logging middleware
const errorLogger = (error, req, res, next) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user ? req.user._id : 'anonymous',
  });
  
  next(error);
};

module.exports = {
  logger,
  requestLogger,
  errorLogger,
};
