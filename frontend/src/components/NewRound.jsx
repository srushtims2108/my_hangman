import React, { useCallback, useEffect, useState } from "react";
import {
  FormGroup,
  FormControl,
  InputLabel,
  TextField,
  Typography,
  MenuItem,
  Select,
  Button,
  Box,
} from "@mui/material";
import { socket } from "../modules/socket";

const NewRound = ({ gameState, setGameState, roomID, user }) => {
  const [started, setStarted] = useState(false);

  let temp = gameState.time === null ? "inf" : gameState.time.toString();

  const [state, setState] = useState({
    username: user,
    lives: gameState.lives.toString(),
    numRounds: gameState.numRounds.toString(),
    rotation: gameState.rotation,
    time: temp,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    let params = Object.assign({}, state);
    const info = { params: params, roomID: roomID, username: user };
    socket.emit("join_new", info);
  };

  const onClick = () => {
    socket.emit("new", roomID);
  };

  const handleNew = useCallback(() => {
    setStarted(true);
  }, []);

  const handleJoin = useCallback(
    (newState) => {
      setGameState(Object.assign({}, newState));
    },
    [setGameState]
  );

  useEffect(() => {
    socket.on("new", handleNew);
    socket.on("join_new", handleJoin);
    return () => {
      socket.off("join_new", handleJoin);
      socket.off("new", handleNew);
    };
  }, [handleJoin, handleNew]);

  return (
    <Box sx={{ width: "100%", maxWidth: 400, margin: "auto", mt: 2 }}>
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

      {user === gameState.players[0] && !started && (
        <Box display="flex" justifyContent="center" mt={1}>
          <Button
            onClick={onClick}
            variant="contained"
            color="primary"
            size="medium"
            sx={{ py: 1, px: 3 }}
          >
            Start Next Game
          </Button>
        </Box>
      )}

      {user === gameState.players[0] && started && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 2,
            backgroundColor: "#f5f5f5",
            boxShadow: "0 3px 12px rgba(0,0,0,0.08)",
          }}
        >
          <Typography variant="h5" align="center" fontWeight="bold" mb={1}>
            Configure Next Round
          </Typography>

          <form onSubmit={handleSubmit}>
            <FormGroup sx={{ gap: 1.5 }}>
              <TextField
                type="number"
                label="Lives"
                value={state.lives}
                onChange={(e) => setState({ ...state, lives: e.target.value })}
                inputProps={{ min: 6, max: 10 }}
                variant="outlined"
                required
                fullWidth
              />

              <TextField
                type="number"
                label="Rounds"
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
                  onChange={(e) =>
                    setState({ ...state, time: e.target.value })
                  }
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
                type="submit"
                variant="contained"
                color="primary"
                sx={{ mt: 1.5, py: 1.2, fontWeight: "bold" }}
              >
                Create Game
              </Button>
            </FormGroup>
          </form>
        </Box>
      )}
    </Box>
  );
};

export default NewRound;
