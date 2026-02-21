const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://chat-app.onrender.com"
    ],
    methods: ["GET", "POST"],
  },
});

// Store users per room
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected");

  // JOIN ROOM
  socket.on("join room", ({ room, username }) => {
    socket.join(room);

    socket.data.username = username;
    socket.data.room = room;

    if (!rooms[room]) rooms[room] = [];

    // remove duplicate username
    rooms[room] = rooms[room].filter((u) => u.username !== username);

    rooms[room].push({
      username: username,
      socketId: socket.id,
    });

    io.to(room).emit("room users", rooms[room]);

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    socket.to(room).emit("chat message", {
      user: "System",
      text: `${username} joined the room`,
      time,
    });
  });

  // ✅ ROOM MESSAGE
  socket.on("chat message", (text) => {
    const { username, room } = socket.data || {};
    if (!room) return;

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    io.to(room).emit("chat message", {
      user: username,
      text,
      time,
    });
  });

  // ✅ PRIVATE MESSAGE (moved here)
  socket.on("private message", ({ toSocketId, message }) => {
    const { username } = socket.data || {};

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    io.to(toSocketId).emit("private message", {
      user: username,
      text: message,
      time,
    });
  });

  // ✅ TYPING
  socket.on("typing", () => {
    const { username, room } = socket.data || {};
    if (room) socket.to(room).emit("typing", username);
  });

  socket.on("stop typing", () => {
    const { room } = socket.data || {};
    if (room) socket.to(room).emit("stop typing");
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    const { username, room } = socket.data || {};

    if (username && room && rooms[room]) {
      rooms[room] = rooms[room].filter((u) => u.username !== username);

      io.to(room).emit("room users", rooms[room]);

      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      io.to(room).emit("chat message", {
        user: "System",
        text: `${username} left the room`,
        time,
      });
    }

    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

