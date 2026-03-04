import { io } from "socket.io-client";

let socketInstance = null;
let currentToken = "";

const resolveApiBase = () => {
  const envApiBase = String(import.meta.env.VITE_API_URL || "").trim();
  const isLocalApi = /localhost|127\.0\.0\.1/i.test(envApiBase);

  // Safety: never bake localhost API into production builds.
  if (!import.meta.env.DEV && isLocalApi) {
    return "/api";
  }

  return envApiBase || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api");
};

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
