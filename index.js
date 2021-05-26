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
  const userID = randomID();
  socket.id = userID;
  socket.userID = userID;
  socket.userName = userName;
  next();
});

webChat.on("connection", socket => {
  userStore.saveUser(socket.userID, {
    userID: socket.userID,
    userName: socket.userName,
    self: false,
    messages: {
      hasNewMessages: 0,
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
      hasNewMessages: 0,
      recent: null,
    },
  });

  socket.on("go loby", () => {
    const newUsers = userStore.findAllUser();
    const newRooms = roomStore.findAllRoom();
    webChat.emit("go loby", { newUsers, newRooms });
  });

  socket.on("public message", content => {
    webChat.emit("public message", {
      content,
      from: {
        userName: socket.userName,
        userID: socket.userID,
      },
    });
  });

  socket.join(socket.userID);

  socket.on("private message", ({ content, to }) => {
    webChat
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
      hasNewMessages: 0,
    };
    roomStore.saveRoom(roomID, room);
    webChat.emit("room created", room);
  });

  socket.on("join room", async roomID => {
    socket.join(roomID);
    const usersID = [...(await webChat.in(roomID).allSockets())];
    const users = await usersID.map(id => {
      const { userName, userID } = userStore.findUser(id);
      return { userName, userID };
    });

    webChat.emit("join room", { users, userID: socket.userID, roomID });
    webChat.to(roomID).emit("room message", {
      message: {
        content: `${socket.userName}님이 입장하셨습니다.`,
      },
      roomID,
    });
  });

  socket.on("leave room", async roomID => {
    await leaveRoom(roomID);
  });

  socket.on("delete room", roomID => {
    deleteRoom(roomID);
  });

  socket.on("room message", ({ message, roomID }) => {
    webChat.to(roomID).emit("room message", {
      message: {
        content: message,
        from: {
          userName: socket.userName,
          userID: socket.userID,
        },
      },
      roomID,
    });
  });

  socket.on("disconnecting", reason => {
    const joinedRooms = [...socket.rooms];
    joinedRooms.forEach(roomID => {
      if (socket.userID === roomID) return;
      leaveRoom(roomID);
    });
    socket.broadcast.emit("user disconnected", {
      userID: socket.userID,
      userName: socket.userName,
    });
    userStore.removeUser(socket.userID);
  });

  async function leaveRoom(roomID) {
    socket.leave(roomID);
    const usersID = [...(await webChat.in(roomID).allSockets())];
    if (usersID.length === 0) return deleteRoom(roomID);
    const users = await usersID.map(id => {
      const { userName, userID } = userStore.findUser(id);
      return { userName, userID };
    });
    webChat.emit("leave room", { users, userID: socket.userID, roomID });
    webChat.to(roomID).emit("room message", {
      message: {
        content: `${socket.userName}님이 퇴장하셨습니다.`,
      },
      roomID,
    });
  }

  function deleteRoom(roomID) {
    roomStore.removeRoom(roomID);
    webChat.emit("delete room", roomID);
  }
});
