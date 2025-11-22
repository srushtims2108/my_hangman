import React, { useState, useEffect, useCallback } from "react";
import { TextField, Button, InputLabel, Typography } from "@mui/material"; // updated
import Standings from "./Standings";
import { socket } from "../modules/socket";
import PropTypes from "prop-types";


const NewWord = ({ gameState, setGameState, user, roomID }) => {
  const [word, setWord] = useState("");
  const [category, setCategory] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    const info = {
      category,
      word,
      user,
      roomID,
    };

    setWord("");
    setCategory("");
    socket.emit("newRound", info);
  };

  const gameHandler = useCallback((newState) => {
    setGameState({ ...newState });
  }, [setGameState]);

  const validateWord = () => {
    let userWord = document.getElementById("word");
    if (!/^[^\s]+(\s+[^\s]+)*$/.test(userWord.value)) {
      userWord.setCustomValidity("Word cannot have leading or trailing spaces");
    } else if (!/^[-\sa-zA-Z]+$/.test(userWord.value)) {
      userWord.setCustomValidity(
        "Only alphabetic characters, spaces, and dashes allowed"
      );
    } else if (userWord.value.length < 2) {
      userWord.setCustomValidity("Word must have at least two characters");
    } else {
      userWord.setCustomValidity("");
    }
  };

  useEffect(() => {
    socket.on("update", gameHandler);

    return () => {
      socket.off("update", gameHandler);
    };
  }, [gameHandler]);

  const nextPlayer =
    gameState.players[
      (gameState.players.indexOf(gameState.hanger) + 1) %
        gameState.players.length
    ];

  const renderScreen = () => {
    let next_hanger;

    if (gameState.round === 0) {
      next_hanger = gameState.hanger;
    } else if (gameState.rotation === "king") {
      if (gameState.numIncorrect === gameState.lives) {
        next_hanger = gameState.hanger;
      } else {
        next_hanger = gameState.guesser;
      }
    } else {
      next_hanger = nextPlayer;
    }

    if (gameState.round !== gameState.numRounds) {
      return (
        <>
          {user === next_hanger ? (
            <div>
              <form onSubmit={handleSubmit}>
                <InputLabel htmlFor="word">
                  Enter {gameState.word ? "New" : ""} Word(s):
                </InputLabel>
                <TextField
                  type="text"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  id="word"
                  name="word"
                  onInput={validateWord}
                  inputProps={{ maxLength: 50, minLength: 2 }}
                  required
                />
                <br />
                <br />
                <InputLabel htmlFor="category">
                  Enter {gameState.word ? "New" : ""} Category:
                </InputLabel>
                <TextField
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  id="category"
                  name="category"
                  required
                />
                <br />
                <br />
                <Button variant="contained" color="primary" type="submit">
                  Submit
                </Button>
              </form>
            </div>
          ) : (
            <div>
              {gameState.word !== "" && user !== gameState.hanger && (
                <Typography variant="h6">
                  The word(s) was {gameState.word}
                </Typography>
              )}
              <p>
                {next_hanger} is {gameState.word ? "now" : ""} the hanger
              </p>
              <p>Waiting for a {gameState.word ? "new" : ""} word(s)...</p>
            </div>
          )}
        </>
      );
    } else {
      return (
        <Standings
          gameState={gameState}
          setGameState={setGameState}
          roomID={roomID}
          user={user}
        />
      );
    }
  };

  return <div>{renderScreen()}</div>;
};

NewWord.propTypes = {
  gameState: PropTypes.object.isRequired,
  setGameState: PropTypes.func.isRequired,
  user: PropTypes.string.isRequired,
  roomID: PropTypes.string.isRequired,
};

export default NewWord;
