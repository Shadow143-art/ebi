import { io } from "socket.io-client";

let socketInstance = null;
let currentToken = "";

const resolveApiBase = () =>
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");

const resolveSocketUrl = () => resolveApiBase().replace(/\/api\/?$/, "");

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
