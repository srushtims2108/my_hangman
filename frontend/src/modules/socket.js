// socket.js
import { io } from "socket.io-client";

const BACKEND = process.env.REACT_APP_SERVER || "http://localhost:5000";

const socket = io(BACKEND, {
  transports: ["websocket", "polling"],
  autoConnect: true,
});

export { socket };
