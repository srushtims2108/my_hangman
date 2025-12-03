import { io } from "socket.io-client";

const socket = io(process.env.REACT_APP_SERVER || "https://hangman-backend-wsbz.onrender.com", {
  transports: ["websocket"],
});

export { socket };
