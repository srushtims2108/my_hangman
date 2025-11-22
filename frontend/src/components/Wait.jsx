import React, { useState, useEffect, useRef, useCallback } from "react";
import { socket } from "../modules/socket";
import { InputLabel, TextField, Button, Typography } from "@mui/material"; // updated

function Wait({ user, roomID, gameState, setGameState, setUser, mute }) {
  const [formUser, setFormUser] = useState("");
  const [copy, setCopy] = useState("Copy Link");
  const timerRef = useRef();
  const url = window.location.href;

  const handleUpdate = useCallback((newState) => {
    setGameState({ ...newState });
  }, [setGameState]);

  const handleSubmitJoin = (e) => {
    e.preventDefault();

    const credentials = {
      roomID,
      user: formUser,
    };

    setUser(formUser);
    setFormUser("");

    socket.emit("join", credentials);

    const message = `${formUser} has joined`;

    const info = {
      roomID,
      user: "join",
      message,
      effects: true,
    };

    socket.emit("chat", info);
  };

  const validateUsername = () => {
    const username = document.getElementById("username");

    if (gameState.players.includes(username.value)) {
      username.setCustomValidity("Username is already taken");
    } else if (!/^[^\s]+(\s+[^\s]+)*$/.test(username.value)) {
      username.setCustomValidity(
        "Guess cannot have leading or trailing spaces"
      );
    } else if (username.value.length > 20) {
      username.setCustomValidity("Username cannot be more than 20 characters");
    } else {
      username.setCustomValidity("");
    }
  };

  const onButtonClick = () => {
    socket.emit("start", roomID);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(url).then(
      () => {
        clearTimeout(timerRef.current);
        setCopy("Copied!");
        timerRef.current = setTimeout(() => setCopy("Copy Link"), 5000);
      },
      () => {
        clearTimeout(timerRef.current);
        setCopy("Failed to Copy");
        timerRef.current = setTimeout(() => setCopy("Copy Link"), 5000);
      }
    );
  };

  useEffect(() => {
    socket.on("update", handleUpdate);
    socket.emit("joinRoom", roomID);

    return () => {
      socket.off("update", handleUpdate);
    };
  }, [roomID, handleUpdate]);

  const render = () => {
    if (gameState && gameState.players.length >= gameState.cap && user === "") {
      return <p>Sorry, Room is full</p>;
    }

    return (
      <>
        <Typography variant="h4" paragraph>
          Players
        </Typography>

        {gameState.players.map((player) => (
          <Typography key={player} variant="h6">
            {player}
          </Typography>
        ))}

        <br />

        {user === gameState.hanger && gameState.players.length >= 2 && (
          <Button variant="contained" color="primary" onClick={onButtonClick}>
            Start game!
          </Button>
        )}

        {!gameState.players.includes(user) && (
          <div id="wait">
            <form onSubmit={handleSubmitJoin}>
              <InputLabel htmlFor="username">Username</InputLabel>
              <TextField
                type="text"
                value={formUser}
                onChange={(e) => setFormUser(e.target.value)}
                onInput={validateUsername}
                id="username"
                name="username"
                required
              />
            </form>
          </div>
        )}

        <br />
        <br />

        <Typography paragraph>
          Share this link with your friends:
          <br />
          {url}{" "}
          <Button onClick={copyLink} color="primary">
            {copy}
          </Button>
        </Typography>
      </>
    );
  };

  return <div>{render()}</div>;
}

export default Wait;
