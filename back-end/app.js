// server.js
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import connectDB from "./db.js";
import routes from "./routes.js";
import initSocketHandlers from "./sockets.js";
import Game from "./models/Game.js";

const PORT = process.env.PORT || 5000;
const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*", credentials: true }));
app.use("/", routes);

connectDB()
  .then(() => {
    const io = new Server(server, { cors: { origin: process.env.CLIENT_ORIGIN || "*" } });

    async function endRound(roomID, winner, word) {
      console.log("🔥 EMIT: round-ended", { roomID, winner, word });

      // emit popup first
      io.to(roomID).emit("round-ended", { winner, word });

      // fetch current game state
      const doc = await Game.findOne({ roomID });
      if (!doc) return;
      const gameState = doc.gameState;

      // reset round-specific fields
      gameState.category = "";
      gameState.word = "";
      gameState.guessedWord = "";
      gameState.guessedLetters = [];
      gameState.guessedWords = [];

      await Game.updateOne({ roomID }, { gameState });

      // delay to allow frontend popup
      setTimeout(() => {
        // optionally start next round if auto-rotation
        if (typeof global.startNextRound === "function") {
          global.startNextRound(roomID);
        }
      }, 3500);
    }

    global.endRound = endRound;

    initSocketHandlers(io);

    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("DB connection failed. Server not started.", err);
    process.exit(1);
  });
