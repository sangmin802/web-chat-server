const crypto = require("crypto");
const randomID = () => crypto.randomBytes(8).toString("hex");
const express = require("express");
const app = express();
const port = 3001;
const { UserStore } = require("./user-store");
const userStore = new UserStore();
const { RoomStore } = require("./room-store");
const roomStore = new RoomStore();

const server = app.listen(port, () => {
  console.log(`server is connected on ${port}`);
});
const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

const webChat = io.of("/web-chat");

webChat.use((socket, next) => {
  const userName = socket.handshake.auth.userName;
  if (!userName) return next(new Error("invalid userName"));
  socket.userID = randomID();
  socket.userName = userName;
  next();
});

webChat.on("connection", socket => {
  userStore.saveUser(socket.userID, {
    userID: socket.userID,
    userName: socket.userName,
    self: false,
    messages: {
      size: 0,
      recent: null,
    },
  });

  socket.emit("session", socket.userID);

  socket.emit("users", userStore.findAllUser());
  socket.emit("rooms", roomStore.findAllRoom());

  socket.broadcast.emit("user connected", {
    userID: socket.userID,
    userName: socket.userName,
    self: false,
    messages: {
      size: 0,
      recent: null,
    },
  });

  socket.on("public message", content => {
    io.of("/web-chat").emit("public message", {
      content,
      from: {
        userName: socket.userName,
        userID: socket.userID,
      },
    });
  });

  socket.join(socket.userID);

  socket.on("private message", ({ content, to }) => {
    io.of("/web-chat")
      .to(socket.userID)
      .to(to.userID)
      .emit("private message", {
        content,
        from: {
          userName: socket.userName,
          userID: socket.userID,
        },
        to,
      });
  });

  socket.on("create room", () => {
    const roomID = randomID();
    const room = {
      creater: socket.userID,
      isJoined: false,
      roomID,
      roomName: roomID,
      users: [],
      messages: [],
      hasNewMessages: 0,
    };
    roomStore.saveRoom(roomID, room);
    io.of("/web-chat").emit("room created", room);
  });
  socket.on("join room", roomID => {
    const room = roomStore.findRoom(roomID);
    const user = { userName: socket.userName, userID: socket.userID };
    socket.join(roomID);
    room.users.push(user);
    roomStore.saveRoom(roomID, room);
    io.of("/web-chat").emit("join room", { user, roomID });
    io.of("/web-chat")
      .to(roomID)
      .emit("room message", {
        message: {
          content: `${socket.userName}님이 입장하셨습니다.`,
        },
        roomID,
      });
  socket.on("disconnect", () => {
    socket.broadcast.emit("user disconnected", {
      userID: socket.userID,
      userName: socket.userName,
    });
    userStore.removeUser(socket.userID);
  });
});
