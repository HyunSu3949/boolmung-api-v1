const Room = require("../models/roomModel");
const Chat = require("../models/chatModel");
const User = require("../models/userModel");

const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");

exports.createRoom = catchAsync(async (req, res, next) => {
  const newRoom = await Room.create({
    title: req.body.title,
    max: req.body.max,
    owner: req.user.id,
    participants: [],
  });

  res.status(201).json({
    status: "success",
    data: newRoom,
  });
});

exports.getAllRoom = catchAsync(async (req, res, next) => {
  let { page, sortby } = req.query;
  page = page * 1 || 1; // 기본 페이지는 1
  limit = 8; // 페이지당 항목 수, 기본값 8
  const skip = (page - 1) * limit; // 건너뛸 항목 수
  const total = await Room.countDocuments();
  const Rooms = await Room.find().skip(skip).limit(limit);
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;

  res.status(200).json({
    status: "sucees",
    length: Rooms.length,
    total,
    currentPage: page,
    totalPages,
    hasNextPage,
    nextPage: hasNextPage ? page + 1 : null,
    data: Rooms,
  });
});

exports.enterRoom = catchAsync(async (req, res, next) => {
  const room = await Room.findById(req.params.id);
  if (!room) {
    return next(new AppError("채팅방이 존재하지 않습니다.", 404));
  }

  if (room.password && room.password !== req.query.password) {
    return next(new AppError("비밀번호가 일지하지 않습니다.", 404));
  }

  const chat = req.app.get("io").of("/chat");
  const { rooms } = chat.adapter;

  if (room.max < rooms.get(req.params.id).size) {
    return next(new AppError("허용 인원을 초과하였습니다.", 404));
  }

  if (!room.participants.includes(req.user.id)) {
    // 새로운 참가자 추가
    room.participants.push({ user: req.user.id, joinedAt: Date.now() });
    await room.save();
  }

  res.status(200).json({
    status: "success",
    data: {
      room,
    },
  });
});

exports.exitRoom = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const roomId = req.params.id;

  const room = await Room.findByIdAndDelete(
    roomId,
    {
      $pull: {
        participants: { user: userId },
      },
    },
    { new: true }
  );

  res.status(200).json({
    status: "success",
    data: {
      room,
    },
  });
});

exports.removeRoom = catchAsync(async (req, res, next) => {
  const room = await Room.findByIdAndDelete(req.params.id);
  const chat = await Chat.deleteMany({ room: req.params.id });

  if (!room) {
    return next(new AppError("채팅방이 존재하지 않습니다.", 404));
  }

  req.app
    .get("io")
    .of("/chat")
    .to(req.params.id)
    .emit("roomDeleted", { message: "채팅방이 삭제되었습니다." });

  res.status(204).json({
    status: "success",
    data: "채팅방이 삭제되었습니다.",
  });
});

exports.sendChat = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const chat = await Chat.create({
    room: req.params.id,
    user: req.user.id,
    message: req.body.message,
  });

  res.send("ok");
});

exports.getChat = catchAsync(async (req, res, next) => {
  const room = await Room.findById(req.params.id);

  if (!room) {
    return next(new AppError("채팅방이 존재하지 않습니다.", 404));
  }

  const participant = room.participants.find((p) => p.user.equals(req.user.id));
  const joinedAt = participant.joinedAt;

  const chats = await Chat.find({
    room: req.params.id,
    createdAt: { $gt: joinedAt },
  }).populate("user");

  res.status(200).json({
    status: "success",
    data: {
      chats,
    },
  });
});
