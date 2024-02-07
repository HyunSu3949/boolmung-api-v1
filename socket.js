const SocketIO = require("socket.io");
const Room = require("./models/roomModel");

const socketUserMap = {};
const actionState = {};

module.exports = (server, app) => {
  const io = SocketIO(server, {
    path: "/socket.io",
    cors: {
      origin: "*", //프론트 개발 도메인
      methods: ["GET", "POST"],
    },
  });

  app.set("io", io);
  const chat = io.of("/chat");

  chat.on("connection", (socket) => {
    console.log("chat 네임스페이스에 접속");

    socket.on("join", (data) => {
      console.log("join 이벤트 발생");
      const { roomId, _id, name } = data;
      socket.join(roomId);
      console.log("join id: ", socket.id);

      socketUserMap[socket.id] = {
        _id,
        roomId,
        name,
      };

      chat.to(roomId).emit("chat", {
        type: "system",
        message: `${name} 님이 입장하셨습니다.`,
      });
    });

    socket.on("chat", (data) => {
      console.log("chat 이벤트 발생");
      console.log(data);
      const { _id, roomId, name, message } = data;
      chat.to(roomId).emit("chat", {
        type: "user",
        _id,
        name,
        message,
      });
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
      console.log("chat 네임스페이스 접속 해제");

      if (!socketUserMap[socket.id]) return;

      const { _id, roomId, name } = socketUserMap[socket.id];
      console.log("id: ", socket.id);

      delete socketUserMap[socket.id];
      delete actionState[socket.id];

      chat.to(roomId).emit("move", actionState);

      const room = await Room.findByIdAndUpdate(
        roomId,
        {
          $pull: {
            participants: { user: _id },
          },
        },
        { new: true }
      );

      if (room.participants.length === 0) {
        await Room.findByIdAndDelete(roomId);
        io.of("/room").emit("roomDeleted", roomId);
      } else {
        chat.to(roomId).emit("chat", {
          type: "system",
          message: `${name}님이 퇴장하셨습니다.`,
        });
      }
    });
  });
};
