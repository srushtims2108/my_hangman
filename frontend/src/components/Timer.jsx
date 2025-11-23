import React, { useState, useEffect, useRef } from "react";

function Timer({ gameState, makeGuess }) {
  const [timeLeft, setTimeLeft] = useState(gameState.time);
  const timerRef = useRef(null);

  // Reset timer when game state changes (like new round or incorrect guess)
  useEffect(() => {
    clearInterval(timerRef.current);
    setTimeLeft(gameState.time);
  }, [gameState.guessedWord, gameState.numIncorrect, gameState.time]);

  // Countdown logic
  useEffect(() => {
    if (timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          makeGuess(""); // emit empty guess when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeLeft, makeGuess]);

  return (
    <>
      {timeLeft > 0 && <h2 className="time-remaining">Time Remaining: {timeLeft}</h2>}
    </>
  );
}

export default Timer;
