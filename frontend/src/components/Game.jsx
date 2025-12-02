import React, { useState, useEffect, useCallback, useRef } from "react";
import { socket } from "../modules/socket";
import { Typography, FormControl, InputLabel, Input, Box } from "@mui/material";
import Letters from "./Letters";
import Timer from "./Timer";
import "../css/Game.scss";

const figureMapping = [
  "none.png","head.png","body.png","left_leg.png","right_leg.png",
  "left_arm.png","right_arm.png","hair.png","eyes.png","nose.png","mouth.png"
];

function Game({ gameState, setGameState, username, roomID, mute }) {
  const [word, setWord] = useState("");
  const [notification, setNotification] = useState("");
  const [audioSource, setAudioSource] = useState("");
  const audioRef = useRef(null);

  // refs & state for handling delayed final-state update
  const toastTimeoutRef = useRef(null);         // manages toast hide timeout
  const pendingStateRef = useRef(null);         // holds the latest incoming state while toast is visible
  const applyTimeoutRef = useRef(null);         // manages delay before applying pending state
  const endRoundPendingRef = useRef(false);     // true when a status event indicates end of round

  /** ---------------- NOTIFICATIONS ---------------- */
  const showNotification = useCallback((msg, duration = 3000) => {
    // Clear any previous toast timer so newer toasts get full duration
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }

    setNotification(msg);

    toastTimeoutRef.current = setTimeout(() => {
      setNotification("");
      toastTimeoutRef.current = null;
    }, duration);
  }, []);

  /** ---------------- STATUS EVENT HANDLER ---------------- */
  const handleStatus = useCallback((info) => {
    const status = info.status;
    const player = info.user || "Someone";
    const guess = info.guess || "";

    let msg = "";

    switch(status){
      case "correct":
        msg = guess.length === 1
          ? `✅ ${player} guessed "${guess}" correctly!`
          : `🎉 ${player} guessed the word "${guess}" correctly!`;
        break;
      case "incorrect":
      case "wrong":
        msg = `❌ ${player} guessed "${guess}" incorrectly!`;
        break;
      case "timer":
        msg = `⏳ ${player} ran out of time!`;
        break;
      case "win":
        msg = `🎊 Congratulations ${player}! You completed the word!`;
        break;
      case "failed":
        msg = `⚠️ Round failed! Word was "${gameState.word}"`;
        break;
      default:
        msg = `${player} made a move`;
    }

    // Show toast (always 3s per your requirement)
    const DURATION = 3000;
    showNotification(msg, DURATION);

    // If this status signals end-of-round, mark it so incoming "update" will be delayed
    if (status === "win" || status === "failed" || status === "timer") {
      endRoundPendingRef.current = true;

      // If there is already a pending apply timer, clear it — we'll set it when update arrives
      if (applyTimeoutRef.current) {
        clearTimeout(applyTimeoutRef.current);
        applyTimeoutRef.current = null;
      }
    }

    // Play audio if provided
    if (info.audioSrc) setAudioSource(info.audioSrc);
  }, [gameState.word, showNotification]);

  /** ---------------- SOCKET LISTENERS ---------------- */
  useEffect(() => {
    // Update handler: apply immediately unless end-of-round was signalled
    const handleUpdate = (newState) => {
      // If an end-of-round was signalled by a status event, delay applying the update
      if (endRoundPendingRef.current) {
        // store the most recent update while we wait
        pendingStateRef.current = newState;

        // clear any previously scheduled apply (so only latest state is applied)
        if (applyTimeoutRef.current) {
          clearTimeout(applyTimeoutRef.current);
          applyTimeoutRef.current = null;
        }

        // schedule applying the pending state after the toast duration (3s)
        applyTimeoutRef.current = setTimeout(() => {
          // apply the last pending state
          if (pendingStateRef.current) {
            setGameState(pendingStateRef.current);
            pendingStateRef.current = null;
          }

          // clear end-of-round marker and timer ref
          endRoundPendingRef.current = false;
          applyTimeoutRef.current = null;
        }, 3000); // matches toast duration
      } else {
        // normal (non-final) updates apply immediately
        setGameState(newState);
      }
    };

    socket.on("update", handleUpdate);
    socket.on("status", handleStatus);

    return () => {
      socket.off("update", handleUpdate);
      socket.off("status", handleStatus);

      // cleanup timeouts if component unmounts
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
      if (applyTimeoutRef.current) {
        clearTimeout(applyTimeoutRef.current);
        applyTimeoutRef.current = null;
      }
    };
  }, [handleStatus, setGameState]);

  /** ---------------- GUESS HANDLER ---------------- */
  const makeGuess = (entity) => {
    if (!entity) return;
    socket.emit("guess", {
      roomID,
      user: username,
      gameState: { ...gameState, curGuess: entity }
    });
    setWord("");
  };

  const onFormSubmit = (e) => {
    e.preventDefault();
    if (word.trim() !== "") makeGuess(word);
  };

  const onLetterClick = (e) => {
    makeGuess(e.currentTarget.value);
  };

  return (
    <div className="game-container">
      {notification && (
        <div className="notification-toast">
          <Typography variant="subtitle1" fontWeight="bold">{notification}</Typography>
        </div>
      )}

      {audioSource && (
        <audio autoPlay muted={mute} ref={audioRef} onEnded={() => setAudioSource("")}>
          <source src={audioSource}/>
        </audio>
      )}

      <div className="top-row">
        {username === gameState.guesser && gameState.time && (
          <Timer key={Date.now()} gameState={gameState} makeGuess={makeGuess} paused={!!notification} />
        )}
        <Typography className="guesses-remaining">
          Guesses Remaining: {gameState.lives - gameState.numIncorrect}
        </Typography>
      </div>

      <div className="category-word-row">
        <Typography className="category-text">
          Category: <strong>{gameState.category}</strong>
        </Typography>
        <Typography className="guessed-word">{gameState.guessedWord}</Typography>
      </div>

      {username === gameState.hanger && (
        <div className="hanger-word-row">
          <Typography className="hanger-word">
            Word: <strong>{gameState.word}</strong>
          </Typography>
        </div>
      )}

      <div className="image-wrapper">
        <img src={`/images/${figureMapping[gameState.numIncorrect]}`} alt="Hangman"/>
      </div>

      {username !== gameState.hanger && (
        <div className="inputs-section">
          <Box className="know-word-box" sx={{ p: 2, mb: 2, borderRadius: 1, bgcolor: "#f3f3f3" }}>
            <Typography className="know-word-text" sx={{ mb: 1 }}>
              Know the complete word??
            </Typography>
            <form onSubmit={onFormSubmit} className="word-input-form-inline">
              <FormControl fullWidth>
                <InputLabel htmlFor="guess">Enter Word Guess</InputLabel>
                <Input
                  type="text"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  id="guess"
                  maxLength={50}
                  disabled={gameState.guesser !== username}
                />
              </FormControl>
            </form>
          </Box>

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
