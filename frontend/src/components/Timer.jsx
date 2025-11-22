import React, { useState, useEffect, useRef } from "react";

function Timer({ gameState, makeGuess }) {
  const [time, setTime] = useState(gameState.time);
  const [change, setChange] = useState(false);
  const timerRef = useRef();

  useEffect(() => {
    clearTimeout(timerRef.current);
    setTime(gameState.time);
    setChange((prev) => !prev);
  }, [gameState.guessedWord, gameState.numIncorrect, gameState.time]);

  useEffect(() => {
    if (time > 0) {
      timerRef.current = setTimeout(() => setTime(time - 1), 1000);
    } else {
      makeGuess("");
    }

    return () => clearTimeout(timerRef.current);
  }, [time, change]);

  return <>{time !== 0 && <h2>Time Remaining: {time}</h2>}</>;
}

export default Timer;
