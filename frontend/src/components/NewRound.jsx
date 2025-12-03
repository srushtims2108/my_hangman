import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  FormGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Typography,
} from "@mui/material";
import { socket } from "../modules/socket";

const NewRound = ({ gameState, setGameState, roomID, user }) => {
  const [started, setStarted] = useState(false);

  const tempTime = gameState.time === null ? "inf" : gameState.time.toString();

  const [state, setState] = useState({
    username: user,
    lives: gameState.lives.toString(),
    numRounds: gameState.numRounds.toString(),
    rotation: gameState.rotation,
    time: tempTime,
  });

  // Host clicks "Start Next Game"
  const handleStartNextGame = () => {
    socket.emit("new", roomID);
  };

  // Host configures settings and clicks "Create Game"
  const handleCreateGame = () => {
    const info = { params: { ...state }, roomID, username: user };
    socket.emit("join_new", info);
  };

  // Socket event when a new game is initiated
  const handleNew = useCallback(() => {
    setStarted(true);
  }, []);

  // Socket event when a player joins/configures the new game
  const handleJoin = useCallback(
    (newState) => {
      setGameState({ ...newState });
    },
    [setGameState]
  );
const handleSubmit = (e) => {
  e.preventDefault();
  let params = Object.assign({}, state);
  const info = { params: params, roomID: roomID, username: user };
  console.log("Submitting new game:", info); // ✅ add this
  socket.emit("join_new", info);
};

  useEffect(() => {
    socket.on("new", handleNew);
    socket.on("join_new", handleJoin);

    return () => {
      socket.off("new", handleNew);
      socket.off("join_new", handleJoin);
    };
  }, [handleNew, handleJoin]);

  return (
    <Box sx={{ width: "100%", maxWidth: 400, mx: "auto", mt: 3 }}>
      {/* Non-host waiting view */}
      {user !== gameState.players[0] && !started && (
        <Typography variant="h6" align="center" sx={{ mb: 1 }}>
          Waiting for {gameState.players[0]} to start the next game...
        </Typography>
      )}
      {user !== gameState.players[0] && started && (
        <Typography variant="body1" align="center" sx={{ mb: 1 }}>
          {gameState.players[0]} is choosing the settings...
        </Typography>
      )}

      {/* Host: Start Next Game button */}
      {user === gameState.players[0] && !started && (
        <Box display="flex" justifyContent="center" mt={2}>
          <Button
            onClick={handleStartNextGame}
            variant="contained"
            color="primary"
            size="medium"
            sx={{ py: 1.2, px: 3 }}
          >
            Start Next Game
          </Button>
        </Box>
      )}

      {/* Host: Configure Next Game */}
      {user === gameState.players[0] && started && (
        <Box
          sx={{
            mt: 2,
            p: 3,
            borderRadius: 2,
            backgroundColor: "#f5f5f5",
            boxShadow: "0 3px 12px rgba(0,0,0,0.08)",
          }}
        >
          <Typography variant="h5" align="center" fontWeight="bold" mb={2}>
            Configure Next Round
          </Typography>

          <FormGroup sx={{ gap: 2 }}>
            <TextField
              label="Lives"
              type="number"
              value={state.lives}
              onChange={(e) => setState({ ...state, lives: e.target.value })}
              inputProps={{ min: 6, max: 10 }}
              variant="outlined"
              required
              fullWidth
            />

            <TextField
              label="Rounds"
              type="number"
              value={state.numRounds}
              onChange={(e) =>
                setState({ ...state, numRounds: e.target.value })
              }
              inputProps={{ min: 1 }}
              variant="outlined"
              required
              fullWidth
            />

            <FormControl fullWidth variant="outlined" required>
              <InputLabel>Rotation</InputLabel>
              <Select
                value={state.rotation}
                onChange={(e) =>
                  setState({ ...state, rotation: e.target.value })
                }
                label="Rotation"
              >
                <MenuItem value="robin">Round Robin</MenuItem>
                <MenuItem value="king">King of the Hill</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth variant="outlined" required>
              <InputLabel>Guess Time (sec)</InputLabel>
              <Select
                value={state.time}
                onChange={(e) => setState({ ...state, time: e.target.value })}
                label="Guess Time (sec)"
              >
                {["10","20","30","40","50","60","70","80","90","inf"].map(
                  (t) => (
                    <MenuItem key={t} value={t}>
                      {t === "inf" ? "Unlimited" : t}
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>

            <Button
                  onClick={handleCreateGame}
                  variant="contained"
                  color="primary"
                  sx={{ mt: 2, py: 1.3, fontWeight: "bold" }}
                >
                  Create Game
                </Button>

          </FormGroup>
        </Box>
      )}
    </Box>
  );
};

export default NewRound;
