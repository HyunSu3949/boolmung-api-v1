const SocketIO = require("socket.io");
const Room = require("./models/roomModel");
const Chat = require("./models/chatModel");

const eventName = {
  CONNECT: "socket/connect",
  DISCONNECT: "socket/disconnect",
  CHAT: "socket/sendMessage",
  JOIN: "socket/join",
  MOVE: "socket/move",
  FULL: "socket/full",
  NOTFOUND: "socket/notfound",
  GET_ROOM_INFO: "socket/getRoomInfo",
  LEAVE: "socket/leave",
};

const actionState = {};

module.exports = (server, app) => {
  const io = SocketIO(server, {
    path: "/socket.io",
    cors: {
      origin: [
        "http://localhost:5500",
        "https://d221beexgvmcjq.cloudfront.net",
        "*",
      ],
      methods: ["GET", "POST"],
    },
  });

  app.set("io", io);

  const chat = io.of("/chat");

  chat.on("connection", (socket) => {
    console.log("chat 네임스페이스에 접속");

    socket.on(eventName.JOIN, async (data) => {
      console.log("join 이벤트 발생");
      const { roomId, _id, name, image } = data;

      socket.user = {
        _id,
        roomId,
        name,
        image,
      };

      try {
        const room = await Room.findByIdAndUpdate(
          roomId,
          { $push: { participants: { user: _id } } },
          { new: true }
        );

        if (!room) {
          socket.emit(eventName.NOTFOUND, { message: "이미 삭제된 방입니다" });
          return;
        }

        if (room.participants.length > room.max) {
          socket.emit(eventName.FULL, { message: "방이 가득 찼습니다" });
          return;
        }
        socket.emit(eventName.GET_ROOM_INFO, room);
        socket.join(roomId);

        chat.to(roomId).emit(eventName.CHAT, {
          type: "system",
          message: `${name} 님이 입장하셨습니다.`,
        });

        chat.to(roomId).emit(eventName.JOIN, { _id, name, image });
      } catch (error) {
        console.error("방 참여 처리 중 오류 발생:", error);
        socket.emit("error-unknown", "방 참여 처리 중 오류가 발생했습니다.");
      }
    });

    socket.on(eventName.CHAT, async (data) => {
      console.log("chat 이벤트 발생");
      const { _id, roomId, name, message } = data;

      chat.to(roomId).emit(eventName.CHAT, {
        type: _id == socket.user._id ? "mine" : "other",
        _id,
        name,
        message,
      });

      const newChat = new Chat({
        room: roomId,
        user: _id,
        message: message,
      });

      newChat.save();
    });

    socket.on(eventName.MOVE, (data) => {
      const { roomId, _id, input, position, cameraCharacterAngleY, image } =
        data;

      chat.to(roomId).emit(eventName.MOVE, {
        _id,
        input,
        position,
        cameraCharacterAngleY,
        image,
      });
    });

    socket.on(eventName.LEAVE, async () => {
      if (!socket.user) return;

      const { _id, roomId, name } = socket.user;
      try {
        const room = await Room.findByIdAndUpdate(
          roomId,
          { $pull: { participants: { user: _id } } },
          { new: true }
        );

        chat.to(roomId).emit(eventName.CHAT, {
          type: "system",
          message: `${name}님이 퇴장하셨습니다.`,
        });

        if (room.participants.length === 0) {
          setTimeout(async () => {
            const checkRoom = await Room.findById(roomId);
            if (checkRoom && checkRoom.participants.length === 0) {
              await Room.deleteOne({ _id: roomId });
            }
          }, 3000);
        }
      } catch (error) {
        console.log(error);
      }
    });

    socket.on("disconnect", async () => {
      if (!socket.user) return;

      const { _id, roomId, name } = socket.user;
      try {
        const room = await Room.findByIdAndUpdate(
          roomId,
          { $pull: { participants: { user: _id } } },
          { new: true }
        );

        if (room.participants.length !== room.max) {
          chat.to(roomId).emit(eventName.CHAT, {
            type: "system",
            message: `${name}님이 퇴장하셨습니다.`,
          });
        }

        if (room.participants.length === 0) {
          setTimeout(async () => {
            const checkRoom = await Room.findById(roomId);
            if (checkRoom && checkRoom.participants.length === 0) {
              await Room.deleteOne({ _id: roomId });
            }
          }, 3000);
        }
      } catch (error) {
        console.log(error);
      }
    });

    //
  });
};
