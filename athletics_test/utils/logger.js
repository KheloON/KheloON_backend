// utils/logger.js
const winston = require('winston');
const { format, createLogger, transports } = winston;
const path = require('path');

// Define log format
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json(),
  format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add stack trace for errors
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    
    return logMessage;
  })
);

// Create console transport
const consoleTransport = new transports.Console({
  format: format.combine(
    format.colorize(),
    logFormat
  )
});

// Create file transports
const errorFileTransport = new transports.File({
  filename: path.join('logs', 'error.log'),
  level: 'error',
  maxsize: 10485760, // 10MB
  maxFiles: 10
});

const combinedFileTransport = new transports.File({
  filename: path.join('logs', 'combined.log'),
  maxsize: 10485760, // 10MB
  maxFiles: 10
});

// Configure log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production' ? 'info' : 'debug';
};

// Create logger instance
const logger = createLogger({
  level: level(),
  levels,
  format: logFormat,
  transports: [
    consoleTransport,
    errorFileTransport,
    combinedFileTransport
  ],
  exitOnError: false // Do not exit on handled exceptions
});

// Create a Morgan stream function for HTTP request logging
logger.stream = {
  write: (message) => logger.http(message.trim())
};

module.exports = logger;