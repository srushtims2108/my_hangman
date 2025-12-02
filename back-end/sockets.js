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

    // ---------------- CHAT ----------------
    socket.on("chat", (info) => {
      const res = [info.user, info.message, info.effects];
      const include = info.user !== "join" && info.user !== "leave";
      socket.to(info.roomID).emit("chat", res);
      if (include) socket.emit("chat", res);
    });

    // ---------------- CREATE ----------------
    socket.on("create", async (payload) => {
      let roomID;
      while (true) {
        roomID = crypto.randomBytes(5).toString("hex").substring(0,10).toUpperCase();
        const exists = await Game.findOne({ roomID });
        if (!exists) break;
      }

      socket.join(roomID);
      console.log(`${payload.username} has entered the room: ${roomID}`);

      const defGameState = createGame(payload);
      await Game.updateOne({ roomID }, { roomID, gameState: defGameState }, { upsert: true });
      socket.emit("link", { gameState: defGameState, roomID });
    });

    // ---------------- JOIN ----------------
    socket.on("join", async ({ user, roomID }) => {
      const doc = await Game.findOne({ roomID });
      if (!doc) return;

      addPlayer(doc.gameState, user);
      socket.join(roomID);

      await Game.updateOne({ roomID }, { gameState: doc.gameState });
      console.log(`${user} has entered the room: ${roomID}`);
      io.to(roomID).emit("update", doc.gameState);
    });

    // ---------------- START ----------------
    socket.on("start", async (roomID) => {
      const doc = await Game.findOne({ roomID });
      if (!doc) return;

      startGame(doc.gameState);
      await Game.updateOne({ roomID }, { gameState: doc.gameState });
      io.to(roomID).emit("update", doc.gameState);
    });

    // ---------------- NEW ROUND ----------------
    socket.on("newRound", async ({ word, category, roomID, user }) => {
      const doc = await Game.findOne({ roomID });
      if (!doc) return;

      handleNewRound(doc.gameState, category, word, user);
      await Game.updateOne({ roomID }, { gameState: doc.gameState });
      io.to(roomID).emit("update", doc.gameState);
    });

    socket.on("join_new", ({ params, roomID, username }) => {
  const game = games.get(roomID); // however you store your game state

  if (!game) return;

  // Update game state using params
  game.lives = parseInt(params.lives);
  game.numRounds = parseInt(params.numRounds);
  game.rotation = params.rotation;
  game.time = params.time === "inf" ? null : parseInt(params.time);

  // Reset round-related parts for new game
  game.currentRound = 1;
  game.playersGuessed = [];
  game.turn = 0;

  // Broadcast updated state to everyone in room
  io.to(roomID).emit("join_new", game);
});


    // ---------------- GUESS ----------------
socket.on("guess", async ({ user, roomID, gameState }) => {
  if (!user) return;

  const curGuessRaw = gameState.curGuess || "";
  let status = null;
  let winner = null;

  // Trim whitespace
  const curGuess = curGuessRaw.trim();

  // ---------------- HANDLE TIMER ----------------
  if (curGuess === "__TIMER_EXPIRED__") {
    gameState.numIncorrect += 1;
    gameState.misses[gameState.guesser] = (gameState.misses[gameState.guesser] || 0) + 1;
    status = "timer";
  } 
  // ---------------- SINGLE LETTER ----------------
  else if (curGuess.length === 1) {
    const letter = curGuess.toLowerCase();
    if (!gameState.guessedLetters.includes(letter)) gameState.guessedLetters.push(letter);

    let matchCount = 0;
    for (let i = 0; i < gameState.word.length; i++) {
      if (gameState.word[i].toLowerCase() === letter && gameState.guessedWord[i] === "_") {
        gameState.guessedWord =
          gameState.guessedWord.substring(0, i) +
          gameState.word[i] +
          gameState.guessedWord.substring(i + 1);
        matchCount++;
      }
    }

    if (matchCount === 0) {
      gameState.numIncorrect += 1;
      gameState.wrong[gameState.guesser] = (gameState.wrong[gameState.guesser] || 0) + 1;
      status = "incorrect";
    } else {
      gameState.right[gameState.guesser] = (gameState.right[gameState.guesser] || 0) + 1;
      status = "correct";
    }
  } 
  // ---------------- FULL WORD ----------------
  else {
    if (!gameState.guessedWords.includes(curGuess)) gameState.guessedWords.push(curGuess);
    if (curGuess.toLowerCase() === gameState.word.toLowerCase()) {
      // Full word correct
      status = "win";
      gameState.guessedWord = gameState.word; // reveal full word
      gameState.right[gameState.guesser] = (gameState.right[gameState.guesser] || 0) + 1;
    } else {
      gameState.numIncorrect += 1;
      gameState.wrong[gameState.guesser] = (gameState.wrong[gameState.guesser] || 0) + 1;
      status = "incorrect";
    }
  }

  // ---------------- CHECK ROUND END ----------------
  const wordSolved = gameState.guessedWord.toLowerCase() === gameState.word.toLowerCase();
  const failed = gameState.numIncorrect >= gameState.lives;
  const directWin = curGuess.toLowerCase() === gameState.word.toLowerCase();

  if (wordSolved || failed || directWin) {
    if (failed) {
      winner = gameState.hanger;
      gameState.wins[winner] = (gameState.wins[winner] || 0) + 1;
      status = status || "failed";
    } else {
      winner = gameState.guesser;
      gameState.wins[winner] = (gameState.wins[winner] || 0) + 1;
      status = status || "win";
    }

    // Reset round for next
    gameState.category = "";
    gameState.guessedWord = "";
    gameState.guessedLetters = [];
    gameState.guessedWords = [];
  } else {
    setNewGuesser(gameState);
  }

  // ---------------- UPDATE DB ----------------
  await Game.updateOne({ roomID }, { gameState });

  // ---------------- EMIT TO FRONTEND ----------------
  io.to(roomID).emit("status", {
    status,
    winner,
    guess: curGuess === "__TIMER_EXPIRED__" ? "" : curGuess,
    user,
    fromServerNotify: true
  });
  io.to(roomID).emit("update", gameState);
});


    // ---------------- LEAVE ----------------
    socket.on("leave", async ({ user, roomID }) => {
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

    // ---------------- ROOM JOIN ----------------
    socket.on("joinRoom", (roomID) => {
      socket.join(roomID);
    });

    // ---------------- NEW GAME EVENT ----------------
    socket.on("new", (roomID) => {
      io.to(roomID).emit("new");
    });

    // ---------------- CONNECT / DISCONNECT ----------------
    socket.on("disconnect", () => {
      count--;
      console.log(count, "connected");
    });
  });
}
