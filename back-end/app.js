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
    const io = new Server(server, {
      cors: { origin: process.env.CLIENT_ORIGIN || "*" },
    });

    /** ---------------- SAFE END-ROUND ---------------- */
    async function endRound(roomID, winner, word) {
      console.log("🔥 EMIT: round-ended", { roomID, winner, word });

      try {
        // 1️⃣ Emit popup to all clients first
        io.to(roomID).emit("round-ended", { winner, word });

        // 2️⃣ Fetch current game state
        const doc = await Game.findOne({ roomID }).lean();
        if (!doc) return;

        // 3️⃣ Prepare reset state without mutating the doc
        const resetGameState = {
          ...doc.gameState,
          category: "",
          word: "",
          guessedWord: "",
          guessedLetters: [],
          guessedWords: [],
        };

        // 4️⃣ Update database immediately (doesn't affect popup)
        await Game.updateOne({ roomID }, { gameState: resetGameState });

        // 5️⃣ Delay optional next round to match frontend toast (3.5s)
        setTimeout(() => {
          if (typeof global.startNextRound === "function") {
            global.startNextRound(roomID);
          }
        }, 3500); // matches your frontend toast duration + buffer
      } catch (err) {
        console.error("endRound error:", err);
      }
    }

    global.endRound = endRound;

    // Initialize socket event handlers
    initSocketHandlers(io);

    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("DB connection failed. Server not started.", err);
    process.exit(1);
  });
