const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "제목을 입력하세요"],
  },
  max: {
    type: Number,
    required: [true, "최대 인원을 입력하세요"],
    default: 10,
    min: 2,
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "오너를 입력하세요"],
  },
  password: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  participants: [
    {
      user: { type: mongoose.Schema.ObjectId, ref: "User" },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

module.exports = mongoose.model("Room", roomSchema);
