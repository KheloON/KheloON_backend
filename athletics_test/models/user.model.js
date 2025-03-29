const mongoose = require("mongoose");

// models/user.model.js
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  profileImage: {
    type: String,
    default: null
  },
  age: {
    type: Number,
    default: null
  },
  bio: {
    type: String,
    default: ''
  },
  sport: {
    type: String,
    default: ''
  },
  achievements: [{
    title: String,
    description: String,
    date: Date,
    icon: String
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post"
  }],
  healthStatus: {
    heartRate: {
      type: Number,
      default: null
    },
    recoveryTime: {
      type: Number,
      default: null
    },
    fatigueLevel: {
      type: String,
      enum: ['Low', 'Moderate', 'High'],
      default: 'Moderate'
    }
  },
  socialMedals: [{
    title: String,
    awardedAt: {
      type: Date,
      default: Date.now
    },
    icon: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", userSchema);
