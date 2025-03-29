const mongoose = require("mongoose");

// 📌 MongoDB Schema for Posts
const PostSchema = new mongoose.Schema({
  image: String, 
  message: String,
  likes: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// ✅ Directly export the model (No need to redefine it later)
module.exports = mongoose.model("Post", PostSchema);
