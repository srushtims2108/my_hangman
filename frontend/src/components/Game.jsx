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
  const audioRef = useRef(null);
  const [audioSource, setAudioSource] = useState("");

  /** ---------------- NOTIFICATIONS ---------------- */
  const showNotification = useCallback((msg, duration = 3000) => { // 3 seconds
    setNotification(msg);
    setTimeout(() => setNotification(""), duration);
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

    showNotification(msg, 3000);

    // Play sound effects here if needed
    if(info.audioSrc) setAudioSource(info.audioSrc);
  }, [gameState.word, showNotification]);

  /** ---------------- SOCKET LISTENERS ---------------- */
  useEffect(() => {
    socket.on("update", (newState) => {
      setGameState(newState);
    });

    socket.on("status", handleStatus);

    return () => {
      socket.off("update");
      socket.off("status");
    };
  }, [handleStatus, setGameState]);

  /** ---------------- GUESS HANDLER ---------------- */
  const makeGuess = (entity) => {
    if(!entity) return;
    socket.emit("guess", {
      roomID,
      user: username,
      gameState: { ...gameState, curGuess: entity }
    });
    setWord("");
  };

  const onFormSubmit = (e) => {
    e.preventDefault();
    if(word.trim() !== "") makeGuess(word);
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
        <audio autoPlay muted={mute} ref={audioRef} onEnded={()=>setAudioSource("")}>
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
          {/* ---------------- KNOW WORD BOX WITH PADDING ---------------- */}
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
                  onChange={(e)=>setWord(e.target.value)}
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
