const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.ObjectId,
    required: true,
    ref: "Room",
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Chat", chatSchema);
