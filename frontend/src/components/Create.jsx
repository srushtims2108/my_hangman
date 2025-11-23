import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  FormGroup,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Button,
} from "@mui/material";
import { socket } from "../modules/socket";
import { Navigate } from "react-router-dom";

function Create({ user, setUser }) {
  const [roomID, setRoomID] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [state, setState] = useState({
    username: "",
    lives: "6",
    numRounds: "3",
    rotation: "king",
    time: "30",
  });

  const handleLink = useCallback(
    ({ gameState, roomID }) => {
      setUser(gameState.players[0]);
      setRoomID(roomID);
    },
    [setUser]
  );

  useEffect(() => {
    socket.on("link", handleLink);
    return () => socket.off("link", handleLink);
  }, [handleLink]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!state.username.trim()) return;
    setSubmitted(true);
    socket.emit("create", state);
  };

  const validateUsername = (name) => {
    if (!/^[^\s]+(\s+[^\s]+)*$/.test(name)) return "No leading/trailing spaces";
    if (name.length > 20) return "Max 20 characters";
    return "";
  };

  if (user && roomID) return <Navigate to={`/${roomID}`} />;

  return (
    <Box
      sx={{
        display: "flex",
        height: "80vh",
        width: "95vw",
        margin: "auto",
      }}
    >
      {/* Left Side - Image */}
      <Box
        component="img"
        src="/images/hangman_image.png"
        alt="Hangman Banner"
        sx={{
          flex: 1,
          width: { xs: "100%", md: "48%" },
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Right Side - Form */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          px: 3,
        }}
      >
        <Typography
          variant="h4"
          sx={{ fontWeight: "bold", mb: 3, textAlign: "center" }}
        >
          🎯 Create Hangman Game
        </Typography>

        <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 360 }}>
          <FormGroup sx={{ gap: 2 }}>
            <TextField
              label="Username"
              variant="outlined"   // box-style
              value={state.username}
              onChange={(e) =>
                setState({ ...state, username: e.target.value })
              }
              error={!!validateUsername(state.username)}
              helperText={validateUsername(state.username)}
              disabled={submitted}
              required
              fullWidth
            />

            <TextField
              label="Lives"
              type="number"
              variant="outlined"   // box-style
              value={state.lives}
              onChange={(e) => setState({ ...state, lives: e.target.value })}
              inputProps={{ min: 6, max: 10 }}
              disabled={submitted}
              required
              fullWidth
            />

            <TextField
              label="Rounds"
              type="number"
              variant="outlined"   // box-style
              value={state.numRounds}
              onChange={(e) =>
                setState({ ...state, numRounds: e.target.value })
              }
              inputProps={{ min: 1 }}
              disabled={submitted}
              required
              fullWidth
            />

            <FormControl fullWidth variant="outlined" disabled={submitted}>
              <InputLabel>Rotation</InputLabel>
              <Select
                value={state.rotation}
                onChange={(e) =>
                  setState({ ...state, rotation: e.target.value })
                }
                label="Rotation"
                required
              >
                <MenuItem value="king">King of the Hill</MenuItem>
                <MenuItem value="robin">Round Robin</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth variant="outlined" disabled={submitted}>
              <InputLabel>Guess Time (sec)</InputLabel>
              <Select
                value={state.time}
                onChange={(e) =>
                  setState({ ...state, time: e.target.value })
                }
                label="Guess Time (sec)"
                required
              >
                {["10", "20", "30", "40", "50", "60", "70", "80", "90", "inf"].map(
                  (t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              sx={{
                mt: 2,
                py: 1.5,
                fontWeight: "bold",
                borderRadius: 2,
                backgroundColor: "#1976d2",
                "&:hover": { backgroundColor: "#1565c0" },
              }}
              disabled={submitted || !!validateUsername(state.username)}
            >
              Create Game
            </Button>
          </FormGroup>
        </form>
      </Box>
    </Box>
  );
}

export default Create;
