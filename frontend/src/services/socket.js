import { io } from "socket.io-client";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

let socket = null;

function createSocket(token) {
  return io(API_BASE_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 8000,
  });
}

export function connectSocket() {
  const token = localStorage.getItem("inThreatToken");
  if (!token) return null;

  if (socket && socket.auth?.token === token) {
    if (!socket.connected) socket.connect();
    return socket;
  }

  disconnectSocket();
  socket = createSocket(token);
  return socket;
}

export function subscribeSocEvents(handlers) {
  const activeSocket = connectSocket();
  if (!activeSocket) return () => {};

  Object.entries(handlers).forEach(([event, handler]) => {
    if (typeof handler === "function") {
      activeSocket.on(event, handler);
    }
  });

  return () => {
    Object.entries(handlers).forEach(([event, handler]) => {
      if (typeof handler === "function") {
        activeSocket.off(event, handler);
      }
    });
  };
}

export function getSocket() {
  return connectSocket();
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
