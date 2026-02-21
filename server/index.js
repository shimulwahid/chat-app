const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build", "index.html"));
  });
}

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "https://hilarious-valkyrie-0ee234.netlify.app", // Replace with your Netlify URL
      "http://localhost:3000", // For local testing
      "http://192.168.0.105:3000"
    ],
    methods: ["GET", "POST"],
  },
});

// Store users per room
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // JOIN ROOM
  socket.on("join room", ({ room, username }) => {
    socket.join(room);
    socket.data.username = username;
    socket.data.room = room;

    if (!rooms[room]) rooms[room] = [];

    // remove duplicate usernames
    rooms[room] = rooms[room].filter((u) => u.username !== username);

    rooms[room].push({ username, socketId: socket.id });

    // send updated users list
    io.to(room).emit("room users", rooms[room]);

    // system message
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    socket.to(room).emit("chat message", {
      user: "System",
      text: `${username} joined the room`,
      time,
    });
  });

  // ROOM MESSAGE
  socket.on("chat message", (text) => {
    const { username, room } = socket.data;
    if (!room) return;

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    io.to(room).emit("chat message", { user: username, text, time });
  });

  // PRIVATE MESSAGE
  socket.on("private message", ({ toSocketId, message }) => {
    const { username } = socket.data;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    io.to(toSocketId).emit("private message", { user: username, text: message, time });
  });

  // TYPING
  socket.on("typing", () => {
    const { username, room } = socket.data;
    if (room) socket.to(room).emit("typing", username);
  });

  socket.on("stop typing", () => {
    const { room } = socket.data;
    if (room) socket.to(room).emit("stop typing");
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    const { username, room } = socket.data || {};
    if (username && room && rooms[room]) {
      rooms[room] = rooms[room].filter((u) => u.username !== username);
      io.to(room).emit("room users", rooms[room]);

      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      io.to(room).emit("chat message", { user: "System", text: `${username} left the room`, time });
    }
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));