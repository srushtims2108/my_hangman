import crypto from "crypto";
import { Game } from "./models/Game.js";
import {
  createGame,
  addPlayer,
  startGame,
  handleNewRound,
  guess,
  handleLeave,
  numPlayers
} from "./game.js";

export default function initSocketHandlers(io) {
  let count = 0;

  io.on("connection", (socket) => {
    count++;
    console.log(count, "connected");

    // CHAT -----------------------------------------
    socket.on("chat", (info) => {
      const res = [info.user, info.message, info.effects];
      const include = info.user !== "join" && info.user !== "leave";
      socket.to(info.roomID).emit("chat", res);
      if (include) socket.emit("chat", res);
    });

    // CREATE ----------------------------------------
    socket.on("create", async (payload) => {
      let roomID;
      while (true) {
        roomID = crypto.randomBytes(5).toString("hex").substring(0, 10).toUpperCase();
        const exists = await Game.findOne({ roomID });
        if (!exists) break;
      }

      socket.join(roomID);
      console.log(`${payload.username} created room: ${roomID}`);

      const defGameState = createGame(payload);

      await Game.updateOne(
        { roomID },
        { $setOnInsert: { roomID, gameState: defGameState } },
        { upsert: true }
      );

      socket.emit("link", { gameState: defGameState, roomID });
    });

    // JOIN_NEW --------------------------------------
    socket.on("join_new", async (payload) => {
      const doc = await Game.findOne({ roomID: payload.roomID });
      if (!doc) return;

      const playerList = doc.gameState.players || [];
      const defGameState = createGame(payload.params);

      for (const p of playerList) {
        if (p !== defGameState.hanger) addPlayer(defGameState, p);
      }

      await Game.updateOne({ roomID: payload.roomID }, { gameState: defGameState });
      io.to(payload.roomID).emit("join_new", defGameState);
    });

    // NEW -------------------------------------------
    socket.on("new", (roomID) => {
      io.to(roomID).emit("new");
    });

    // NEW ROUND -------------------------------------
    socket.on("newRound", async (payload) => {
      const doc = await Game.findOne({ roomID: payload.roomID });
      if (!doc) return;

      handleNewRound(doc.gameState, payload.category, payload.word, payload.user);
      await Game.updateOne({ roomID: payload.roomID }, { gameState: doc.gameState });

      io.to(payload.roomID).emit("update", doc.gameState);
    });

    // JOIN ROOM -------------------------------------
    socket.on("joinRoom", (roomID) => {
      socket.join(roomID);
    });

    // JOIN ------------------------------------------
    socket.on("join", async (credentials) => {
      const { user, roomID } = credentials;
      const doc = await Game.findOne({ roomID });
      if (!doc) return;

      addPlayer(doc.gameState, user);
      socket.join(roomID);

      await Game.updateOne({ roomID }, { gameState: doc.gameState });

      console.log(`${user} joined room: ${roomID}`);
      io.to(roomID).emit("update", doc.gameState);
    });

    // START -----------------------------------------
    socket.on("start", async (roomID) => {
      const doc = await Game.findOne({ roomID });
      if (!doc) return;

      startGame(doc.gameState);
      await Game.updateOne({ roomID }, { gameState: doc.gameState });

      io.to(roomID).emit("update", doc.gameState);
    });

    // GUESS -----------------------------------------
    socket.on("guess", async (payload) => {
      try {
        const { roomID } = payload;
        const status = guess(payload.gameState);

        await Game.updateOne({ roomID }, { gameState: payload.gameState });

        socket.emit("status", {
          status,
          guess: payload.gameState.curGuess,
        });

        io.to(roomID).emit("update", payload.gameState);

        // SCORE EFFECTS ------------------------------
        if (status === "correct") {
          io.to(roomID).emit("scoreEffect", { username: payload.gameState.guesser, delta: 15 });
        } else if (status === "incorrect") {
          io.to(roomID).emit("scoreEffect", { username: payload.gameState.guesser, delta: -5 });
        } else if (status === "win") {
          io.to(roomID).emit("scoreEffect", { username: payload.gameState.guesser, delta: 30 });
        } else if (["timer", "failed", "lose"].includes(status)) {
          io.to(roomID).emit("scoreEffect", { username: payload.gameState.hanger, delta: 30 });
        }

        // ROUND END LOGIC ----------------------------
        let winner = null;
        if (status === "correct" || status === "win") {
          winner = payload.gameState.guesser;
        } else if (["failed", "lose", "timer"].includes(status)) {
          winner = payload.gameState.hanger;
        }

        if (winner) {
          console.log("🔥 ROUND END TRIGGERED:", {
            winner,
            word: payload.gameState.word,
            round: payload.gameState.round,
          });

          // use centralized endRound() from server.js
          if (global.endRound) {
            global.endRound(roomID, winner, payload.gameState.word);
          } else {
            console.error("⚠ global.endRound missing!");
          }
        }
      } catch (err) {
        console.error("guess handler error:", err);
      }
    });

    // LEAVE -----------------------------------------
    socket.on("leave", async (payload) => {
      const { user, roomID } = payload;
      console.log(`${user} left ${roomID}`);

      const doc = await Game.findOne({ roomID });
      if (!doc) return;

      if (numPlayers(doc.gameState) === 1) {
        await Game.deleteOne({ roomID });
        io.to(roomID).emit("leave", null);
      } else {
        handleLeave(doc.gameState, user);
        socket.leave(roomID);

        await Game.updateOne({ roomID }, { gameState: doc.gameState });

        io.to(roomID).emit("leave", doc.gameState);
        io.to(roomID).emit("chat", ["leave", `${user} has left`, true]);
      }
    });

    socket.on("disconnect", () => {
      count--;
      console.log(count, "connected");
    });
  });
}
