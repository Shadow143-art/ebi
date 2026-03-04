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

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true
  })
);
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
initSocket(httpServer, process.env.CLIENT_URL);

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
