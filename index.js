const crypto = require("crypto");
const randomID = () => crypto.randomBytes(8).toString("hex");
const express = require("express");
const app = express();
const port = 3001;
const { UserStore } = require("./user-store");
const userStore = new UserStore();

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
  });

  socket.emit("users", userStore.findAllUser());

  socket.broadcast.emit("user connected", {
    userID: socket.userID,
    userName: socket.userName,
  });

  socket.on("send public message", message => {
    io.of("/web-chat").emit("send public message", {
      content: message,
      from: socket.userName,
    });
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("user disconnected", {
      userID: socket.userID,
      userName: socket.userName,
    });
    userStore.removeUser(socket.userID);
  });
});
