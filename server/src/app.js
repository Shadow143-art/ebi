import "dotenv/config";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { createServer } from "http";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import staffContactRoutes from "./routes/staffContactRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { initSocket } from "./realtime/socket.js";

const app = express();

connectDB();

const normalizeOrigin = (origin = "") => origin.trim().replace(/\/+$/, "");

const parseAllowedOrigins = () => {
  const defaultOrigins = [
    "http://localhost:5173",
    "https://shadow143-art.github.io"
  ];

  const envOrigins = [process.env.CLIENT_URL, process.env.CLIENT_URLS]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

  return Array.from(new Set([...defaultOrigins, ...envOrigins]));
};

const allowedOrigins = parseAllowedOrigins();
const corsOptions = {
  origin(origin, callback) {
    // Allow tools/non-browser clients with no Origin header.
    if (!origin) return callback(null, true);

    const incomingOrigin = normalizeOrigin(origin);
    if (allowedOrigins.includes(incomingOrigin)) return callback(null, true);

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Tracker API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/staff-contact", staffContactRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
initSocket(httpServer, allowedOrigins);

const server = httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the other process or change PORT in server/.env.`);
    process.exit(1);
  }
  console.error("Server startup failed:", error.message);
  process.exit(1);
});
