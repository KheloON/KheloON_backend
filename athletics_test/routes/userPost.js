const express = require("express");
const multer = require("multer");
const Post = require("../models/userPostModel");  // ✅ Correct Import

const router = express.Router();

// 📌 Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// 📌 POST route to upload image + message
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const newPost = new Post({
      image: req.file.path,
      message: req.body.message
    });
    await newPost.save();
    
    res.json({ success: true, post: newPost });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 📌 SINGLE ROUTE TO HANDLE LIKES & SHARES
router.post("/update/:id", async (req, res) => {
    try {
        const { type } = req.body;
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ error: "Post not found" });

        if (type === "like") post.likes += 1;
        else if (type === "share") post.shares += 1;
        else return res.status(400).json({ error: "Invalid update type" });

        await post.save();

        res.json({ 
            success: true, 
            postId: post._id,
            likes: post.likes, 
            shares: post.shares,
            shareableLink: type === "share" ? `http://localhost:5000/api/posts/${post._id}` : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📌 GET route to fetch all posts (Latest First)
router.get("/posts", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
