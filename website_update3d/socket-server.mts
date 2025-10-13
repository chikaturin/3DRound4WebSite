import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Store connected clients
const clients = new Map();

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Handle client type registration
  socket.on("register", (clientType) => {
    clients.set(socket.id, { type: clientType, socket });
    console.log(`Client ${socket.id} registered as: ${clientType}`);

    // Notify other clients about new connection
    socket.broadcast.emit("client-connected", {
      id: socket.id,
      type: clientType,
    });
  });

  // Handle joystick movement from control device
  socket.on("joystick:move", (data) => {
    // Broadcast to all viewers (main display devices)
    socket.broadcast.emit("joystick:move", data);
  });

  // Handle joystick end from control device
  socket.on("joystick:end", (data) => {
    socket.broadcast.emit("joystick:end", data);
  });

  // Handle zoom changes from control device
  socket.on("zoom:set", (data) => {
    socket.broadcast.emit("zoom:set", data);
  });

  // Handle camera position updates from viewer
  socket.on("camera:position", (data) => {
    socket.broadcast.emit("camera:position", data);
  });

  socket.on("disconnect", () => {
    clients.delete(socket.id);
    socket.broadcast.emit("client-disconnected", { id: socket.id });
  });
});

const PORT = parseInt(process.env.NEXT_PUBLIC_PORT ?? "3001", 10);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Socket server running on port ${PORT}`);
  console.log(`Access the app at: http://localhost:${PORT}`);
});
