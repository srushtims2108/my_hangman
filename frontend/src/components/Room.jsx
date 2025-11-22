import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import Game from "./Game";
import Wait from "./Wait";
import Chat from "./Chat";
import NewWord from "./NewWord";
import axios from "axios";
import "../css/Room.scss";
import { socket } from "../modules/socket";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";

function Room({ username, mute }) {
  const [gameState, setGameState] = useState(null);
  const [user, setUser] = useState(username || "");
  const { roomID } = useParams();
  const [err, setErr] = useState(false);

  /** ---------------- PLAYER LEAVE ---------------- */
  const handleLeave = useCallback((newState) => {
    if (!newState?.players?.length) {
      setErr(true);
    } else {
      setGameState({ ...newState });
    }
  }, []);

  /** ---------------- INITIAL STATE FETCH ---------------- */
  useEffect(() => {
    const getGameState = async () => {
      try {
        const backendURL =
          process.env.REACT_APP_SERVER || "http://localhost:5000";

        const res = await axios.get(`${backendURL}/?roomID=${roomID}`);

        if (res.status === 200 && res.data?.players) {
          setGameState(res.data);
        } else {
          setErr(true);
        }
      } catch {
        setErr(true);
      }
    };

    socket.on("leave", handleLeave);

    getGameState();

    return () => {
      socket.off("leave", handleLeave);
    };
  }, [roomID, handleLeave]);

  /** ---------------- LEAVE ON CLOSE ---------------- */
  useEffect(() => {
    const cleanup = () => {
      if (user) socket.emit("leave", { user, roomID });
    };
    window.addEventListener("unload", cleanup);
    return () => window.removeEventListener("unload", cleanup);
  }, [user, roomID]);

  /** ---------------- CONTENT SWITCHER ---------------- */
  const renderContent = () => {
    if (err) return <Typography color="error">Room does not exist</Typography>;
    if (!gameState) return <Typography>Loading...</Typography>;

    // before game starts
    if (!user || !gameState.gameStart) {
      return (
        <Wait
          user={user}
          roomID={roomID}
          gameState={gameState}
          setGameState={setGameState}
          setUser={setUser}
          mute={mute}
        />
      );
    }

    // active game
    if (gameState.gameStart && gameState.category !== "") {
      return (
        <Game
          username={user}
          roomID={roomID}
          gameState={gameState}
          setGameState={setGameState}
          mute={mute}
        />
      );
    }

    // new word screen
    if (gameState.category === "") {
      return (
        <NewWord
          gameState={gameState}
          setGameState={setGameState}
          user={user}
          roomID={roomID}
          mute={mute}
        />
      );
    }

    return <Typography>Loading...</Typography>;
  };

  const mode =
    gameState?.rotation === "robin" ? "Round Robin" : "King of the Hill";

  return (
    <Box
      sx={{
        display: "flex",
        height: "95vh",
        width: "96vw",
        px: "8px",
        position: "relative",
      }}
    >
      {/* ---------------- LEFT PANEL ---------------- */}
      <Paper
        elevation={3}
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          p: 2,
          overflowY: "auto",
        }}
      >
        <Typography variant="h6" textAlign="center" sx={{ mb: 2 }}>
          🎮 Room Code: {roomID.toUpperCase()}
        </Typography>

        <Typography variant="subtitle1" fontWeight="bold">
          Players
        </Typography>

        <List dense>
          {gameState?.players?.map((player) => (
            <ListItem key={player}>
              <ListItemText
                primary={`${player} — ${
                  (gameState.wins?.[player] || 0) * 30 +
                  (gameState.right?.[player] || 0) * 15 +
                  (gameState.wrong?.[player] || 0) * -5 +
                  (gameState.misses?.[player] || 0) * -5
                } pts`}
              />
            </ListItem>
          ))}
        </List>

        <Typography sx={{ mt: 2 }}>
          <b>Hanger:</b> {gameState?.hanger}
        </Typography>
        <Typography>
          <b>Mode:</b> {mode}
        </Typography>
        <Typography>
          <b>Round:</b> {gameState?.round}
        </Typography>
      </Paper>

      {/* ---------------- CENTER PANEL ---------------- */}
      <Box sx={{ flex: 2, display: "flex", flexDirection: "column", p: 2 }}>
        {renderContent()}
      </Box>

      {/* ---------------- RIGHT PANEL ---------------- */}
      <Paper
        elevation={3}
        sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2 }}
      >
        <Typography variant="h6" textAlign="center" sx={{ mb: 2 }}>
          💬 Chat
        </Typography>
        {user && <Chat user={user} roomID={roomID} />}
      </Paper>
    </Box>
  );
}

export default Room;
