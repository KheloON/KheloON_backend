// auth.service.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const redis = require('../config/redis');

const CACHE_TTL = 3600; // Cache profile data for 1 hour

class AuthService {
  // Register a new athlete
  async register(userData) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error('User already exists');
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // Create new user
      const newUser = new User({
        ...userData,
        password: hashedPassword
      });
      
      await newUser.save();
      
      // Generate JWT token
      const token = this._generateToken(newUser._id);
      
      // Return user data (exclude password) and token
      const { password, ...userWithoutPassword } = newUser.toObject();
      return { user: userWithoutPassword, token };
    } catch (error) {
      throw error;
    }
  }
  
  // Login athlete
  async login(email, password) {
    try {
      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('Invalid credentials');
      }
      
      // Validate password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }
      
      // Generate JWT token
      const token = this._generateToken(user._id);
      
      // Cache basic profile data
      const cacheableData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        profileImage: user.profileImage
      };
      
      await redis.set(`user:${user._id}`, JSON.stringify(cacheableData), 'EX', CACHE_TTL);
      
      // Return user data (exclude password) and token
      const { password: _, ...userWithoutPassword } = user.toObject();
      return { user: userWithoutPassword, token };
    } catch (error) {
      throw error;
    }
  }
  
  // Get athlete profile
  async getProfile(userId) {
    try {
      // Try to get profile from cache first
      const cachedProfile = await redis.get(`user:${userId}`);
      
      if (cachedProfile) {
        return JSON.parse(cachedProfile);
      }
      
      // If not in cache, get from database
      const user = await User.findById(userId).select('-password');
      if (!user) {
        throw new Error('User not found');
      }
      
      // Cache basic profile data
      const cacheableData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        age: user.age,
        profileImage: user.profileImage
      };
      
      await redis.set(`user:${userId}`, JSON.stringify(cacheableData), 'EX', CACHE_TTL);
      
      return user;
    } catch (error) {
      throw error;
    }
  }
  
  // Update athlete profile
  async updateProfile(userId, updateData) {
    try {
      // Find and update user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true }
      ).select('-password');
      
      if (!updatedUser) {
        throw new Error('User not found');
      }
      
      // Update cache
      const cacheableData = {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        age: updatedUser.age,
        profileImage: updatedUser.profileImage
      };
      
      await redis.set(`user:${userId}`, JSON.stringify(cacheableData), 'EX', CACHE_TTL);
      
      return updatedUser;
    } catch (error) {
      throw error;
    }
  }
  
  // Delete athlete profile
  async deleteProfile(userId) {
    try {
      const deletedUser = await User.findByIdAndDelete(userId);
      
      if (!deletedUser) {
        throw new Error('User not found');
      }
      
      // Delete from cache
      await redis.del(`user:${userId}`);
      
      return { message: 'User deleted successfully' };
    } catch (error) {
      throw error;
    }
  }
  
  // Generate JWT token
  _generateToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }
}

module.exports = new AuthService();