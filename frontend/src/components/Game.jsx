import React, { useState, useEffect, useRef, useCallback } from "react";
import { FormControl, Input, InputLabel, Typography } from "@mui/material";
import Letters from "./Letters";
import Timer from "./Timer";
import "../css/Game.scss";
import { socket } from "../modules/socket";


const figureMapping = [
  "none.png",
  "head.png",
  "body.png",
  "left_leg.png",
  "right_leg.png",
  "left_arm.png",
  "right_arm.png",
  "hair.png",
  "eyes.png",
  "nose.png",
  "mouth.png",
];

function Game({ gameState, setGameState, username, roomID, mute, showNotification }) {
  const [word, setWord] = useState("");
  const [source, setSource] = useState("");
  const audioRef = useRef(null);

  /** ---------------- GAME STATE UPDATE ---------------- */
  const gameHandler = useCallback(
    (newState) => {
      const roundEnded = gameState && gameState.category !== "" && newState.category === "";

      if (roundEnded) {
        // Delay state update for round-end
        setTimeout(() => setGameState({ ...newState }), 2000);
      } else {
        setGameState({ ...newState });
      }
    },
    [gameState, setGameState]
  );

  /** ---------------- SOUND FX ---------------- */
  const updateSong = (src) => {
    setSource(src);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
      audioRef.current.play().catch(() => {});
    }
  };

  /** ---------------- STATUS HANDLER ---------------- */
  const handleStatus = useCallback(
    (info) => {
      let newURL = "";
      let message = "";

      if (info.status === "timer") {
        newURL = `${process.env.REACT_APP_SERVER}/audio/timer.mp3`;
        message = `${username} ran out of time`;
      } else if (info.status === "correct") {
        newURL = `${process.env.REACT_APP_SERVER}/audio/correct.mp3`;
        message = `Hurrah! ${username} guessed letter "${info.guess}" correctly`;
      } else if (info.status === "incorrect") {
        newURL = `${process.env.REACT_APP_SERVER}/audio/wrong.mp3`;
        message = `Oops! ${username} guessed letter "${info.guess}" incorrectly`;
      } else if (info.status === "win") {
        message = `Congratulations ${username}! You completed the word!`;
      } else if (info.status === "fail") {
        newURL = `${process.env.REACT_APP_SERVER}/audio/wrong.mp3`;
        message = `Players failed to guess! The word was: "${gameState.word}"`;
      }

      if (newURL) updateSong(newURL);

      // Show notification toast in Room
      if (showNotification) showNotification(message);

      // Emit chat message but hide from chat section
      socket.emit("chat", {
        roomID,
        user: info.status,
        message,
        effects: true,
        hide: true,
      });
    },
    [username, roomID, showNotification, gameState.word]
  );

  /** ---------------- SOCKET LISTENERS ---------------- */
  useEffect(() => {
    socket.on("update", gameHandler);
    socket.on("status", handleStatus);
    return () => {
      socket.off("update", gameHandler);
      socket.off("status", handleStatus);
    };
  }, [gameHandler, handleStatus]);

  /** ---------------- INPUT VALIDATION ---------------- */
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

  /** ---------------- GUESS HANDLERS ---------------- */
/** ---------------- GUESS HANDLERS ---------------- */
const makeGuess = (entity) => {
  // Update dashed word immediately for single letters or full word guess
  let updatedWord = gameState.guessedWord.split("").map((ch, i) =>
    gameState.guessedWord[i] !== "_" ||
    gameState.word[i].toLowerCase() === entity.toLowerCase()
      ? gameState.word[i]
      : "_"
  ).join("");

  // If user guessed the full word correctly, replace completely
  if (entity.length > 1 && entity.toLowerCase() === gameState.word.toLowerCase()) {
    updatedWord = gameState.word;
  }

  setGameState({ ...gameState, guessedWord: updatedWord, curGuess: entity });

  socket.emit("guess", { roomID, gameState: { ...gameState, curGuess: entity } });
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


  /** ---------------- AUTO-FILL FULL WORD IF COMPLETELY GUESSED ---------------- */
  useEffect(() => {
  if (gameState.guessedWord.replace(/_/g, "") === gameState.word) {
    setGameState((prev) => ({ ...prev, guessedWord: gameState.word }));
  }
}, [gameState.guessedWord, gameState.word, setGameState]);


  /** ---------------- AUDIO ELIGIBILITY ---------------- */
  let prevGuesser = gameState.players.indexOf(gameState.guesser);
  do {
    prevGuesser = (prevGuesser - 1 + gameState.players.length) % gameState.players.length;
  } while (gameState.players[prevGuesser] === gameState.hanger);

  return (
    <div className="game-container">
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
