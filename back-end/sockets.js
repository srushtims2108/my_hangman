import crypto from "crypto";
import { Game } from "./models/Game.js";
import {
  createGame,
  addPlayer,
  startGame,
  handleNewRound,
  guess,
  handleLeave,
  setNewGuesser,
  numPlayers
} from "./game.js";

export default function initSocketHandlers(io) {
  let count = 0;

  io.on("connection", (socket) => {
    count++;
    console.log(count, "connected");

    // CHAT - payload: { user, message, effects, roomID }
    socket.on("chat", (info) => {
      const res = [info.user, info.message, info.effects];
      const include = info.user !== "join" && info.user !== "leave";
      socket.to(info.roomID).emit("chat", res);
      if (include) socket.emit("chat", res);
    });

    // Example: broadcast a toast message to all players
    socket.on("notifyAll", (payload) => {
      // payload: { roomID, message }
      io.to(payload.roomID).emit("notification", payload.message);
    });


    // CREATE - payload: params (username, lives, rotation, numRounds, time)
    socket.on("create", async (payload) => {
      // generate 10-char roomID
      let roomID;
      while (true) {
        roomID = crypto.randomBytes(5).toString("hex").substring(0,10).toUpperCase();
        const exists = await Game.findOne({ roomID });
        if (!exists) break;
      }

      socket.join(roomID);
      console.log(`${payload.username} has entered the room: ${roomID}`);

      const defGameState = createGame(payload);
      // save to DB
      await Game.updateOne({ roomID }, { roomID, gameState: defGameState }, { upsert: true });
      socket.emit("link", { gameState: defGameState, roomID });
    });

    // JOIN_NEW - payload: { roomID, params }
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

    // NEW - broadcast new game event
    socket.on("new", (roomID) => {
      io.to(roomID).emit("new");
    });

    // NEW ROUND - payload: { word, roomID, category, user }
    socket.on("newRound", async (payload) => {
      const doc = await Game.findOne({ roomID: payload.roomID });
      if (!doc) return;
      handleNewRound(doc.gameState, payload.category, payload.word, payload.user);
      await Game.updateOne({ roomID: payload.roomID }, { gameState: doc.gameState });
      io.to(payload.roomID).emit("update", doc.gameState);
    });

    // JOIN ROOM - just join the socket room
    socket.on("joinRoom", (roomID) => {
      socket.join(roomID);
    });

    // JOIN - payload: { user, roomID }
    socket.on("join", async (credentials) => {
      const { user, roomID } = credentials;
      const doc = await Game.findOne({ roomID });
      if (!doc) return;
      addPlayer(doc.gameState, user);
      socket.join(roomID);
      await Game.updateOne({ roomID }, { gameState: doc.gameState });
      console.log(`${user} has entered the room: ${roomID}`);
      io.to(roomID).emit("update", doc.gameState);
    });

    // START - payload: roomID
    socket.on("start", async (roomID) => {
      const doc = await Game.findOne({ roomID });
      if (!doc) return;
      startGame(doc.gameState);
      await Game.updateOne({ roomID }, { gameState: doc.gameState });
      io.to(roomID).emit("update", doc.gameState);
    });

socket.on("guess", async (payload) => {
  let { user, roomID, gameState } = payload;

  if (!user) {
    console.warn("Guess received without username");
    return; // don't fallback to "Unknown"
  }

  const result = guess(gameState);

  const statusObj = result.correct
    ? { status: "correct", winner: result.winner || null }
    : { status: "incorrect", winner: null };

  // Build message including actual username
  const message =
    result.correct
      ? `🎉 ${user} guessed it correctly!`
      : `Oops!! ${user} guessed it incorrectly!!`;

  io.to(roomID).emit("status", {
    status: statusObj,
    guess: gameState.curGuess,
    user,
    message,
    fromServerNotify: true,
  });

  await Game.updateOne({ roomID }, { gameState });
  io.to(roomID).emit("update", gameState);
});




    // LEAVE - payload: { user, roomID }
    socket.on("leave", async (payload) => {
      const { user, roomID } = payload;
      console.log(`${user} left ${roomID}`);
      const doc = await Game.findOne({ roomID });
      if (!doc) return;

      if (numPlayers(doc.gameState) === 1) {
        // close room by deleting DB entry
        await Game.deleteOne({ roomID });
        io.to(roomID).emit("leave", null);
      } else {
        handleLeave(doc.gameState, user);
        socket.leave(roomID);
        await Game.updateOne({ roomID }, { gameState: doc.gameState });
        io.to(roomID).emit("leave", doc.gameState);
        // tell room that user left (chat message)
        io.to(roomID).emit("chat", ["leave", `${user} has left`, true]);
      }
    });

    socket.on("disconnect", () => {
      count--;
      console.log(count, "connected");
    });
  });
}