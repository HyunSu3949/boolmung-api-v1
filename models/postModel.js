const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "작성자를 입력하세요"],
  },
  content: {
    type: String
  },
  image: {
    type: String
  }
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model("Post", postSchema);
