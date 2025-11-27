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
  const showNotification = useCallback((msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 4000);
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
  const player = info.user || gameState.guesser || "Someone"; // always a name
  const guess = info.guess || "";
  const statusObj = info.status || {};
  const status = statusObj.status || statusObj;
  const winner = statusObj.winner;

  let message = "";

  switch(status) {
    case "correct":
      message = `Hurrah! ${player} guessed "${guess}" correctly`;
      if (winner) message += ` — the word is completed!`;
      break;
    case "wrong":
    case "incorrect":
      message = `Oops! ${player} guessed "${guess}" incorrectly`;
      break;
    case "timer":
      message = `${player} ran out of time`;
      break;
    case "win":
      message = `Congratulations ${player}! You completed the word!`;
      break;
    case "fail":
      message = `Players failed to guess! The word was: "${gameState.word}"`;
      break;
    default:
      message = `${player} made a move`;
  }

  showNotification(message);
}, [gameState.word, gameState.guesser, showNotification]);



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
  let updatedWord = gameState.guessedWord.split("").map((ch, i) =>
    gameState.guessedWord[i] !== "_" ||
    gameState.word[i].toLowerCase() === entity.toLowerCase()
      ? gameState.word[i]
      : "_"
  ).join("");

  if (entity.length > 1 && entity.toLowerCase() === gameState.word.toLowerCase()) {
    updatedWord = gameState.word;
  }

  setGameState({ ...gameState, guessedWord: updatedWord, curGuess: entity });

  // emit the guess with explicit user name from state
  socket.emit("guess", { 
    roomID, 
    gameState: { ...gameState, curGuess: entity },
    user: username || gameState.guesser // fallback to current guesser
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
          <Timer gameState={gameState} makeGuess={makeGuess} />
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
