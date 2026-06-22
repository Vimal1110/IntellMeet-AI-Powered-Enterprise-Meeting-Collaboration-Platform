import dotenv from "dotenv";

dotenv.config();

import app from "./app.js";
import connectDB from "./config/db.js";

import http from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT || 5000;

// Soft cap on participants per room. Mesh WebRTC (everyone connects to
// everyone) scales quadratically — each peer opens N-1 connections, so
// bandwidth/CPU cost grows fast. 6 is a reasonable ceiling for mesh;
// beyond this, the architecture should move to an SFU (mediasoup/LiveKit)
// instead of raising this number.
const MAX_PARTICIPANTS_PER_ROOM = 6;

connectDB();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Helper: get the list of other socket IDs currently in a room.
function getOtherSocketIds(roomId, excludeSocketId) {
  const room = io.sockets.adapter.rooms.get(roomId);
  if (!room) return [];
  return [...room].filter((id) => id !== excludeSocketId);
}

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  // ---- Join room ----
  // Multi-party model: when a new socket joins, the SERVER tells the new
  // joiner exactly which peers already exist in the room (via
  // "existingParticipants"), and tells each existing peer that a new
  // participant has joined (via "newParticipant"). The actual offer/answer
  // negotiation is then driven peer-to-peer (new joiner creates an offer
  // to each existing peer), routed by the server using targetSocketId.
  //
  // This replaces the old "room size === 2 -> emit ready to first user"
  // logic, which only ever worked for exactly 2 participants.
  socket.on("joinRoom", (roomId, userInfo) => {
    const existing = getOtherSocketIds(roomId, socket.id);

    if (existing.length >= MAX_PARTICIPANTS_PER_ROOM) {
      socket.emit("roomFull", { roomId, max: MAX_PARTICIPANTS_PER_ROOM });
      return;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userInfo = userInfo || null;

    console.log(`${socket.id} joined ${roomId} (${existing.length} existing)`);

    // Tell the new joiner who is already in the room, so it can create
    // an offer to each of them.
    socket.emit(
      "existingParticipants",
      existing.map((id) => ({
        socketId: id,
        userInfo: io.sockets.sockets.get(id)?.data?.userInfo || null,
      })),
    );

    // Tell everyone already in the room that a new participant arrived,
    // so they know to expect an incoming offer from this socket (and can
    // render a placeholder tile immediately).
    socket.to(roomId).emit("newParticipant", {
      socketId: socket.id,
      userInfo: userInfo || null,
    });
  });

  // ---- Chat ----
  socket.on("sendMessage", (data) => {
    io.to(data.roomId).emit("receiveMessage", data);
  });

  // ---- WebRTC Offer ----
  // Routed point-to-point: data must include { roomId, targetSocketId, offer }.
  // Using io.to(targetSocketId) (not the room) ensures only the intended
  // peer receives it, which matters once 3+ peers share a room.
  socket.on("offer", (data) => {
    console.log(`OFFER ${socket.id} -> ${data.targetSocketId}`);
    io.to(data.targetSocketId).emit("offer", {
      ...data,
      fromSocketId: socket.id,
    });
  });

  // ---- WebRTC Answer ----
  socket.on("answer", (data) => {
    console.log(`ANSWER ${socket.id} -> ${data.targetSocketId}`);
    io.to(data.targetSocketId).emit("answer", {
      ...data,
      fromSocketId: socket.id,
    });
  });

  // ---- ICE Candidate ----
  socket.on("iceCandidate", (data) => {
    io.to(data.targetSocketId).emit("iceCandidate", {
      ...data,
      fromSocketId: socket.id,
    });
  });

  // ---- Disconnect ----
  socket.on("disconnect", () => {
    console.log("User Disconnected:", socket.id);

    if (socket.data.roomId) {
      // Tell everyone else in the room this peer is gone, so each of
      // them can close their specific RTCPeerConnection for this
      // socketId and remove its video tile.
      socket.to(socket.data.roomId).emit("peerLeft", {
        socketId: socket.id,
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
