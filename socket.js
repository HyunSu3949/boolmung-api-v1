const SocketIO = require("socket.io");
const Room = require("./models/roomModel");

const eventName = {
  SOCKET_CONNECT: "socket/connect",
  SOCKET_DISCONNECT: "socket/disconnect",
  SOCKET_CHAT: "socket/sendMessage",
  SOCKET_JOIN: "socket/join",
  SOCKET_RECIEVE_DISCONNECT: "socket/disconnect",
  SOCKET_RECIEVE_CHAT: "socket/chat",
  SOCKET_RECIEVE_JOIN: "socket/join",
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

    socket.on(eventName.SOCKET_JOIN, async (data) => {
      console.log("join 이벤트 발생");
      const { roomId, _id, name } = data;

      socket.user = {
        _id,
        roomId,
        name,
      };

      try {
        const room = await Room.findByIdAndUpdate(
          roomId,
          { $push: { participants: { user: _id } } },
          { new: true }
        );

        if (!room) {
          socket.emit("error-notFound", "방을 찾을 수 없습니다.");
          return;
        }

        if (room.participants.length > room.max) {
          socket.emit("error-full", "방이 가득 찼습니다.");
          return;
        }

        socket.join(roomId);

        chat.to(roomId).emit(eventName.SOCKET_CHAT, {
          type: "system",
          message: `${name} 님이 입장하셨습니다.`,
        });
      } catch (error) {
        console.error("방 참여 처리 중 오류 발생:", error);
        socket.emit("error-unknown", "방 참여 처리 중 오류가 발생했습니다.");
      }
    });

    socket.on(eventName.SOCKET_CHAT, async (data) => {
      console.log("chat 이벤트 발생");
      const { _id, roomId, name, message } = data;

      chat.to(roomId).emit(eventName.SOCKET_CHAT, {
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

    socket.on("move", (data) => {
      const { roomId, _id, input, position, cameraCharacterAngleY } = data;
      actionState[socket.id] = {
        _id,
        input,
        position,
        cameraCharacterAngleY,
      };
      chat.to(roomId).emit("move", actionState);
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

        chat.to(roomId).emit(eventName.SOCKET_CHAT, {
          type: "system",
          message: `${name}님이 퇴장하셨습니다.`,
        });
      } catch (error) {
        console.log(error);
      }
    });

    //
  });
};
