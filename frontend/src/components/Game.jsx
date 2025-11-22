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

function Game({ gameState, setGameState, username, roomID, mute }) {
  const [word, setWord] = useState("");
  const [source, setSource] = useState("");
  const [notification, setNotification] = useState("");
  const [showFinal, setShowFinal] = useState(false);
  const [finalWord, setFinalWord] = useState("");
  const audioRef = useRef(null);

  /** ---------------- GAME STATE UPDATE ---------------- */
  const gameHandler = useCallback(
    (newState) => {
      if (!showFinal) {
        setGameState({ ...newState });
      }
    },
    [setGameState, showFinal]
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
      message = `${username} guessed ${info.guess}`;
    } else if (info.status === "incorrect") {
      newURL = `${process.env.REACT_APP_SERVER}/audio/wrong.mp3`;
      message = `${username} guessed ${info.guess}`;
    } else if (info.status === "win") {
      message = `${username} completed the word!`;
      const finalGuessedWord = info.gameState?.guessedWord || gameState.guessedWord;
      setFinalWord(finalGuessedWord);
      setShowFinal(true);
    }

    updateSong(newURL);

    setNotification(message);
    setTimeout(() => setNotification(""), 2000);

    socket.emit("chat", {
      roomID,
      user: username,
      message,
      effects: true,
    });

    if (info.status === "win") {
      setTimeout(() => {
        setShowFinal(false);
        setGameState((prev) => ({ ...prev, ...(info.gameState || {}) }));
      }, 2000);
    } else {
      setGameState((prev) => ({ ...prev, ...(info.gameState || {}) }));
    }
  },
  [username, roomID, gameState, setGameState]
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

    if (gameState.guessedWords.includes(field.value)) {
      field.setCustomValidity(`${field.value} has already been guessed`);
    } else if (!/^[^\s]+(\s+[^\s]+)*$/.test(field.value)) {
      field.setCustomValidity("Guess cannot have leading or trailing spaces");
    } else if (!/^[-\sa-zA-Z]+$/.test(field.value)) {
      field.setCustomValidity("Only alphabetic characters allowed");
    } else if (field.value.length < 2) {
      field.setCustomValidity("Guess must have at least two characters");
    } else {
      field.setCustomValidity("");
    }
  };

  /** ---------------- GUESS HANDLERS ---------------- */
  const makeGuess = (entity) => {
    const guessState = { ...gameState, curGuess: entity };
    socket.emit("guess", { roomID, gameState: guessState });
  };

  const onFormSubmit = (e) => {
    e.preventDefault();
    makeGuess(word);
    setWord("");
  };

  const onLetterClick = (e) => {
    e.preventDefault();
    setWord("");
    makeGuess(e.currentTarget.value);
  };

  /** ---------------- PREV GUESSER SOUND ---------------- */
  let prevGuesser = gameState.players.indexOf(gameState.guesser);
  do {
    prevGuesser =
      (((prevGuesser - 1) % gameState.players.length) +
        gameState.players.length) %
      gameState.players.length;
  } while (gameState.players[prevGuesser] === gameState.hanger);

  return (
    <div className="game-container">
      {/* ================= AUDIO FX ================= */}
      {username === gameState.players[prevGuesser] && source && (
        <audio autoPlay onEnded={() => setSource("")} muted={mute} ref={audioRef}>
          <source src={source} />
        </audio>
      )}

      {/* ===================== NOTIFICATION TOAST ===================== */}
      {notification && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            padding: "20px 30px",
            backgroundColor: "rgba(0,0,0,0.8)",
            color: "white",
            borderRadius: "10px",
            zIndex: 9999,
            fontSize: "1.3rem",
            textAlign: "center",
          }}
        >
          {notification}
        </div>
      )}

      {/* ===================== TOP BAR ===================== */}
      <div
        className="game-top"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "5px",
        }}
      >
        {gameState.time && username === gameState.guesser && (
          <Timer gameState={gameState} makeGuess={makeGuess} />
        )}
        <Typography variant="h6">
          Guesses Remaining: {gameState.lives - gameState.numIncorrect}
        </Typography>
      </div>

      {/* ===================== CATEGORY + HANGER WORD ===================== */}
      <div className="category-box">
        <Typography variant="h6" className="category-text">
          Category: <strong>{gameState.category}</strong>
        </Typography>

        {username === gameState.hanger && (
          <Typography variant="h6" className="hanger-word">
            Word: <strong>{gameState.word}</strong>
          </Typography>
        )}
      </div>

      {/* ===================== WORD DISPLAY ===================== */}
      <Typography variant="h3" className="guessed-word">
        {showFinal ? finalWord : gameState.guessedWord}
      </Typography>

      {/* ===================== HANGMAN IMAGE ===================== */}
      <div className="image-wrapper">
        <img
          className="drawing"
          src={`/images/${figureMapping[gameState.numIncorrect]}`}
          alt="Hangman"
        />
      </div>

      {/* ===================== GUESS SECTION ===================== */}
      {username !== gameState.hanger && (
        <div className="inputs-section">
          <form onSubmit={onFormSubmit} className="word-input-form">
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

          <Letters
            onClick={onLetterClick}
            disabled={gameState.guesser !== username}
            guessedLetters={gameState.guessedLetters}
          />
        </div>
      )}
    </div>
  );
}

export default Game;
