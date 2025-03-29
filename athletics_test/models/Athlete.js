const mongoose = require("mongoose");

const AthleteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  profilePicture: { type: String, default: "" },
  age: { type: Number, required: true },
  email: { type: String, required: true, unique: true },
  profilePicture: { type: String, default: "" },
  participatesInOlympics: { type: Boolean, required: true },
  competitions: { type: [String], default: [] },
  bio: { type: String, default: "" },
  organizationId: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Athlete", AthleteSchema);
