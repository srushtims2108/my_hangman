import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import connectDB from "./db.js";
import routes from "./routes.js";
import initSocketHandlers from "./sockets.js";

const PORT = process.env.PORT || 5000;
const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "*",
    credentials: true
  })
);

// Routes
app.use("/", routes);

// Start DB then server
connectDB()
  .then(() => {
    const io = new Server(server, {
      cors: { origin: process.env.CLIENT_ORIGIN || "*" }
    });

    // 👇 Move this INSIDE so io is available
    function endRound(roomID, winner, word) {
      console.log("🔥 EMIT: round-ended", { roomID, winner, word });

      io.to(roomID).emit("round-ended", {
        winner,
        word
      });

      // Delay for popup
      setTimeout(() => {
        startNextRound(roomID);
      }, 3500);
    }

    // Export so sockets.js can call endRound()
    global.endRound = endRound;

    // initialize socket handlers (pass io instance)
    initSocketHandlers(io);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB connection failed. Server not started.", err);
    process.exit(1);
  });
