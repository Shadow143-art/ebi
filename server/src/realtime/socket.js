import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

let ioInstance = null;
const userSockets = new Map();

const addSocket = (userId, socketId) => {
  const key = String(userId);
  const set = userSockets.get(key) || new Set();
  set.add(socketId);
  userSockets.set(key, set);
};

const removeSocket = (userId, socketId) => {
  const key = String(userId);
  const set = userSockets.get(key);
  if (!set) return;
  set.delete(socketId);
  if (!set.size) {
    userSockets.delete(key);
  } else {
    userSockets.set(key, set);
  }
};

const onlineUsers = () => Array.from(userSockets.keys());

export const emitOnlineUsers = () => {
  if (!ioInstance) return;
  ioInstance.emit("online:users", { users: onlineUsers() });
};

export const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${String(userId)}`).emit(event, payload);
};

export const initSocket = (server, allowedOrigins = []) => {
  if (ioInstance) return ioInstance;

  ioInstance = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (!allowedOrigins.length) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} not allowed by Socket.IO CORS`));
      },
      credentials: true
    }
  });

  ioInstance.use(async (socket, next) => {
    try {
      const raw =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization || "").replace("Bearer ", "");

      if (!raw) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(raw, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("_id role");
      if (!user) {
        return next(new Error("Unauthorized"));
      }

      socket.user = {
        id: String(user._id),
        role: user.role
      };

      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  ioInstance.on("connection", (socket) => {
    const userId = socket.user.id;
    addSocket(userId, socket.id);
    socket.join(`user:${userId}`);
    emitOnlineUsers();

    socket.on("typing:start", ({ to }) => {
      if (!to) return;
      emitToUser(to, "typing:start", { from: userId });
    });

    socket.on("typing:stop", ({ to }) => {
      if (!to) return;
      emitToUser(to, "typing:stop", { from: userId });
    });

    socket.on("disconnect", () => {
      removeSocket(userId, socket.id);
      emitOnlineUsers();
    });
  });

  return ioInstance;
};
