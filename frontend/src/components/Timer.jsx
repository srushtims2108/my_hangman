import React, { useState, useEffect, useRef } from "react";

function Timer({ gameState, makeGuess, paused }) {
  const [timeLeft, setTimeLeft] = useState(gameState.time);
  const timerRef = useRef(null);

  // Keep track of latest timeLeft to use in interval
  const timeRef = useRef(timeLeft);
  useEffect(() => {
    timeRef.current = timeLeft;
  }, [timeLeft]);

  // Reset timer only when a new round starts
  useEffect(() => {
    setTimeLeft(gameState.time);
  }, [gameState.time]);

  // Countdown interval
  useEffect(() => {
    if (paused) {
      clearInterval(timerRef.current);
      return; // stop the timer
    }

    timerRef.current = setInterval(() => {
      if (timeRef.current <= 0) {
        clearInterval(timerRef.current);
        return;
      }

      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          makeGuess("__TIMER_EXPIRED__");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [paused, makeGuess]);

  return (
    <>
      {timeLeft > 0 && (
        <h2 className="time-remaining">Time Remaining: {timeLeft}</h2>
      )}
    </>
  );
}

export default Timer;
