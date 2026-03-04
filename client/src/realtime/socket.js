import { io } from "socket.io-client";

let socketInstance = null;
let currentToken = "";

const resolveSocketUrl = () => {
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  return apiBase.replace(/\/api\/?$/, "");
};

export const connectSocket = (token) => {
  if (!token) return null;

  if (socketInstance && currentToken === token) {
    return socketInstance;
  }

  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  currentToken = token;
  socketInstance = io(resolveSocketUrl(), {
    auth: { token },
    withCredentials: true,
    transports: ["websocket", "polling"]
  });

  return socketInstance;
};

export const getSocket = () => socketInstance;

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
  }
  socketInstance = null;
  currentToken = "";
};
