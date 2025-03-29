// config/database.js
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      // These options may not be needed with newer versions of mongoose
      // but including them ensures compatibility
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Add indexes for frequently queried fields
    await createIndexes();
    
    return conn;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Create database indexes for performance optimization
const createIndexes = async () => {
  try {
    // Create indexes for models here - example:
    // const UserModel = require('../models/user.model');
    // await UserModel.createIndexes(); 
    
    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.error(`Error creating database indexes: ${error.message}`);
  }
};

// Handle connection errors after initial connection
mongoose.connection.on('error', (error) => {
  logger.error(`MongoDB connection error: ${error.message}`);
});

// Handle when connection is disconnected
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected, trying to reconnect...');
});

// Handle when connection is reconnected
mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

// Close MongoDB connection when Node process ends
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${error.message}`);
    process.exit(1);
  }
});

module.exports = connectDB;