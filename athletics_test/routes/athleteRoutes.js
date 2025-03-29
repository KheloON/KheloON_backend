const express = require("express");
const Athlete = require("../models/Athlete");
const multer = require("multer");


const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Ensure the 'uploads' folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });


// ✅ Athlete Signup API
router.post("/signup", async (req, res) => {
  try {
    const athlete = new Athlete(req.body);
    await athlete.save();
    res.status(201).json({ message: "Athlete registered successfully", athlete });
  } catch (error) {
    res.status(500).json({ message: "Error registering athlete", error });
  }
});

// update the profile 
router.patch("/update/:id", upload.single("profilePicture"), async (req, res) => {
  try {
    const { username, bio } = req.body;
    const userId = req.params.id;

    const updateData = { username, bio, updatedAt: Date.now() };

    // If a profile picture is uploaded, add it to the update
    if (req.file) {
      updateData.profilePicture = req.file.path;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    res.json({ success: true, user: updatedUser });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ✅ Fetch Athlete Profile
router.get("/:athleteId", async (req, res) => {
  try {
    const athlete = await Athlete.findById(req.params.athleteId);
    if (!athlete) {
      return res.status(404).json({ message: "Athlete not found" });
    }
    res.json(athlete);
  } catch (error) {
    res.status(500).json({ message: "Error fetching athlete data", error });
  }
});

module.exports = router;
