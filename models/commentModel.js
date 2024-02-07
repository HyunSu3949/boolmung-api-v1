const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, "댓글 내용을 입력하세요"],
  },
  post: {
    type: mongoose.Schema.ObjectId,
    ref: "Post",
    required: [true, "댓글이 속한 게시물을 지정하세요"],
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: [true, "댓글 작성자를 입력하세요"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Comment", commentSchema);
