import { io } from "socket.io-client";

const socket = io(process.env.REACT_APP_SERVER || "http://localhost:5000", {
  transports: ["websocket"],
});

export { socket };
