import React, { useState, useEffect, useRef, useCallback } from "react";
import { socket } from "../modules/socket";
import { Typography, FormControl, InputLabel, Input } from "@mui/material";
import Letters from "./Letters";
import Timer from "./Timer";
import "../css/Game.scss";

const figureMapping = [
  "none.png", "head.png", "body.png",
  "left_leg.png", "right_leg.png", "left_arm.png",
  "right_arm.png", "hair.png", "eyes.png",
  "nose.png", "mouth.png",
];

function Game({ gameState, setGameState, username, roomID, mute }) {
  const [word, setWord] = useState("");
  const [notification, setNotification] = useState("");
  const audioRef = useRef(null);
  const [source, setSource] = useState("");

  /** ---------------- LOCAL NOTIFICATION ---------------- */
const showNotification = useCallback((msg, duration = 4000) => {
  setNotification(msg);
  setTimeout(() => setNotification(""), duration);
}, []);

  /** ---------------- GAME STATE UPDATE ---------------- */
  const gameHandler = useCallback(
    (newState) => {
      const roundEnded = gameState && gameState.category !== "" && newState.category === "";
      if (roundEnded) {
        setTimeout(() => setGameState({ ...newState }), 2000);
      } else {
        setGameState({ ...newState });
      }
    },
    [gameState, setGameState]
  );

  /** ---------------- STATUS HANDLER ---------------- */

const handleStatus = useCallback((info) => {
  // === DEBUG: print full incoming payload for inspection ===
  console.groupCollapsed("handleStatus incoming payload");
  console.log("RAW info:", info);
  try {
    console.log("info (stringified):", JSON.stringify(info));
  } catch (e) {
    console.log("info stringify error:", e);
  }
  console.groupEnd();

  // Prefer server-provided message if present
  let message = info.message || "";

  // Safe derived values
  const player = info.user || gameState.guesser || "Someone";
  const guess = (typeof info.guess !== "undefined" && info.guess !== null && info.guess !== "")
    ? info.guess
    : (gameState.curGuess || "");

  // status may be a string or an object with different property names
  const statusObj = info.status || {};
  const status = (typeof statusObj === "string")
    ? statusObj
    : (statusObj.status || statusObj.result || statusObj.resultType || "");
  const winner = statusObj && statusObj.winner;

  // === DEBUG: show parsed summary ===
  console.debug("handleStatus parsed ->", { player, guess, status, winner, messageFromServer: !!info.message });

  // Build message only if server didn't provide one
  if (!message) {
  switch (status) {
    case "correct":
      if (winner) {
        message = `🎉 Hurrah! ${player} guessed the word "${guess}" correctly — the word is completed!`;
        showNotification(message, 8000); // <- stay longer
        return;
      } else if (guess.length === 1) {
        message = `✅ Hurrah! ${player} guessed "${guess}" correctly`;
      } else {
        message = `🎉 ${player} guessed the word "${guess}" correctly`;
      }
      break;

    case "incorrect":
    case "wrong":
      message = guess
        ? `❌ Oops! ${player} guessed "${guess}" incorrectly`
        : `❌ Oops! ${player} made an incorrect move`;
      break;

    case "timer":
      message = `⏳ Oops! ${player} ran out of time! The word was "${gameState.word}"`;
      break;

    case "win":
      message = `🎊 Congratulations ${player}! You completed the word!`;
      showNotification(message, 8000);
      return;

    case "fail":
      message = `⚠️ Players failed to guess! The word was: "${gameState.word}"`;
      break;

    default:
      message = `${player} made a move`;
  }
}

  // Show toast notification
  showNotification(message);

}, [gameState, showNotification]);



  /** ---------------- SOCKET LISTENERS ---------------- */
  useEffect(() => {
    socket.on("update", gameHandler);
    socket.on("status", handleStatus);

    return () => {
      socket.off("update", gameHandler);
      socket.off("status", handleStatus);
    };
  }, [gameHandler, handleStatus]);

  /** ---------------- GUESS HANDLERS ---------------- */
  const validateGuess = () => {
    const field = document.getElementById("guess");
    if (!field) return;
    if (gameState.guessedWords.includes(field.value))
      field.setCustomValidity(`${field.value} has already been guessed`);
    else if (!/^[^\s]+(\s+[^\s]+)*$/.test(field.value))
      field.setCustomValidity("No leading/trailing spaces");
    else if (!/^[-\sa-zA-Z]+$/.test(field.value))
      field.setCustomValidity("Only letters allowed");
    else if (field.value.length < 2) field.setCustomValidity("At least 2 characters");
    else field.setCustomValidity("");
  };

const makeGuess = (entity) => {
  // compute updatedWord based on current gameState
  const updatedWord = gameState.guessedWord.split("").map((ch, i) =>
    gameState.guessedWord[i] !== "_" ||
    gameState.word[i].toLowerCase() === entity.toLowerCase()
      ? gameState.word[i]
      : "_"
  ).join("");

  const finalUpdated = (entity.length > 1 && entity.toLowerCase() === gameState.word.toLowerCase())
    ? gameState.word
    : updatedWord;

  // immediately update local UI
  setGameState({ ...gameState, guessedWord: finalUpdated, curGuess: entity });

  // IMPORTANT: emit the exact updated state (so server evaluates on correct data)
  socket.emit("guess", {
    roomID,
    user: username || gameState.guesser,
    gameState: { ...gameState, guessedWord: finalUpdated, curGuess: entity }
  });
};


  const onFormSubmit = (e) => {
    e.preventDefault();
    if (word.trim() !== "") {
      makeGuess(word);
      setWord("");
    }
  };

  const onLetterClick = (e) => {
    e.preventDefault();
    makeGuess(e.currentTarget.value);
    setWord("");
  };

  /** ---------------- AUTO-FILL FULL WORD ---------------- */
  useEffect(() => {
    if (gameState.guessedWord.replace(/_/g, "") === gameState.word) {
      setGameState((prev) => ({ ...prev, guessedWord: gameState.word }));
    }
  }, [gameState.guessedWord, gameState.word, setGameState]);

  /** ---------------- PREV GUESSER FOR AUDIO ---------------- */
  let prevGuesser = gameState.players.indexOf(gameState.guesser);
  do {
    prevGuesser = (prevGuesser - 1 + gameState.players.length) % gameState.players.length;
  } while (gameState.players[prevGuesser] === gameState.hanger);

  /** ---------------- RENDER ---------------- */
  return (
    <div className="game-container">
      {notification && (
        <div className="notification-toast">
          <Typography variant="subtitle1" fontWeight="bold">{notification}</Typography>
        </div>
      )}

      {/* AUDIO FX */}
      {username === gameState.players[prevGuesser] && source && (
        <audio autoPlay onEnded={() => setSource("")} muted={mute} ref={audioRef}>
          <source src={source} />
        </audio>
      )}

      {/* TOP ROW: TIME + GUESSES REMAINING */}
      <div className="top-row">
       {username === gameState.guesser && gameState.time && (
<Timer 
  key={notification ? Date.now() : 'timer'} // force remount when toast appears/disappears
  gameState={gameState} 
  makeGuess={makeGuess} 
  paused={!!notification} 
/>
       )}

        <Typography className="guesses-remaining">
          Guesses Remaining: {gameState.lives - gameState.numIncorrect}
        </Typography>
      </div>

      {/* CATEGORY + WORD DISPLAY */}
      <div className="category-word-row">
        <Typography className="category-text">
          Category: <strong>{gameState.category}</strong>
        </Typography>
        <Typography className="guessed-word">{gameState.guessedWord}</Typography>
      </div>

      {/* HANGER FULL WORD */}
      {username === gameState.hanger && (
        <div className="hanger-word-row">
          <Typography className="hanger-word">
            Word: <strong>{gameState.word}</strong>
          </Typography>
        </div>
      )}

      {/* HANGMAN IMAGE */}
      <div className="image-wrapper">
        <img
          className="drawing"
          src={`/images/${figureMapping[gameState.numIncorrect]}`}
          alt="Hangman"
        />
      </div>

      {/* WORD INPUT + LETTERS */}
      {username !== gameState.hanger && (
        <div className="inputs-section">
          <div className="know-word-box">
            <Typography className="know-word-text">Know the complete word??</Typography>
            <form onSubmit={onFormSubmit} className="word-input-form-inline">
              <FormControl>
                <InputLabel htmlFor="guess">Enter Word Guess</InputLabel>
                <Input
                  type="text"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  id="guess"
                  name="guess"
                  inputProps={{ maxLength: 50, minLength: 2 }}
                  onInput={validateGuess}
                  disabled={gameState.guesser !== username}
                  required
                />
              </FormControl>
            </form>
          </div>

          <Letters
            onClick={onLetterClick}
            disabled={gameState.guesser !== username}
            guessedLetters={gameState.guessedLetters}
            rows={3}
          />
        </div>
      )}
    </div>
  );
}

export default Game;
