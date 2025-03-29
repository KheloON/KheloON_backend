// config/redis.js
const Redis = require('ioredis');
const logger = require('../utils/logger');

// Create Redis client
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '',
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// Redis events
redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('error', (error) => {
  logger.error(`Redis client error: ${error.message}`);
});

redisClient.on('ready', () => {
  logger.info('Redis client ready');
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis client reconnecting');
});

redisClient.on('end', () => {
  logger.warn('Redis client connection closed');
});

// Graceful shutdown
process.on('SIGINT', () => {
  redisClient.quit().then(() => {
    logger.info('Redis client disconnected through app termination');
    process.exit(0);
  });
});

module.exports = redisClient;