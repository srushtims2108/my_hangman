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
  Chip,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

/* --------------------------------------------------
   COPY ROOM ID COMPONENT
-------------------------------------------------- */
function CopyRoomID({ roomID }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Tooltip title={copied ? "Copied!" : "Copy Room Code"}>
      <IconButton size="small" color="primary" onClick={handleCopy}>
        <ContentCopyIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

/* --------------------------------------------------
   MAIN ROOM COMPONENT
-------------------------------------------------- */
function Room({ username, mute }) {
  const [gameState, setGameState] = useState(null);
  const [user, setUser] = useState(username || "");
  const { roomID } = useParams();

  // ---------------- JOIN SOCKET ROOM ----------------
  useEffect(() => {
    if (roomID) {
      socket.emit("joinRoom", roomID);
    }
  }, [roomID]);

  const [err, setErr] = useState(false);

  // ---------------- NOTIFICATION ----------------
  const [notification, setNotification] = useState("");

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 2500);
  };

  // ---------------- PLAYER LEAVE ----------------
  const handleLeave = useCallback((newState) => {
    if (!newState?.players?.length) setErr(true);
    else setGameState({ ...newState });
  }, []);

  // ---------------- INITIAL FETCH ----------------
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

    return () => socket.off("leave", handleLeave);
  }, [roomID, handleLeave]);

  // ---------------- LEAVE ON TAB CLOSE ----------------
  useEffect(() => {
    const cleanup = () => {
      if (user) socket.emit("leave", { user, roomID });
    };
    window.addEventListener("unload", cleanup);
    return () => window.removeEventListener("unload", cleanup);
  }, [user, roomID]);

  // ---------------- CONTENT LOGIC ----------------
  const renderContent = () => {
    if (err) return <Typography color="error">Room does not exist</Typography>;
    if (!gameState) return <Typography>Loading...</Typography>;

    if (!user || !gameState.gameStart) {
      return (
        <Wait
          user={user}
          roomID={roomID}
          gameState={gameState}
          setGameState={setGameState}
          setUser={setUser}
          mute={mute}
          showNotification={showNotification}
        />
      );
    }

    if (gameState.gameStart && gameState.category !== "") {
      return (
        <Game
          username={user}
          roomID={roomID}
          gameState={gameState}
          setGameState={setGameState}
          mute={mute}
          showNotification={showNotification}
        />
      );
    }

    if (gameState.category === "") {
      return (
        <NewWord
          gameState={gameState}
          setGameState={setGameState}
          user={user}
          roomID={roomID}
          mute={mute}
          showNotification={showNotification}
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
        height: "100vh",
        width: "96vw",
        px: "8px",
        position: "relative",
      }}
    >
      {/* LEFT PANEL */}
      <Paper
        elevation={6}
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          p: 3,
          borderRadius: 3,
          backgroundColor: "#f9f9f9",
          overflowY: "auto",
        }}
      >
        {/* ROOM CODE */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 3,
          }}
        >
          <Typography
            variant="h5"
            textAlign="center"
            sx={{
              fontWeight: "bold",
              letterSpacing: 1,
              color: "#1976d2",
              mr: 1,
            }}
          >
            🎮 Room Code: {roomID.toUpperCase()}
          </Typography>

          <CopyRoomID roomID={roomID.toUpperCase()} />
        </Box>

        {/* PLAYERS LIST */}
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
          Players
        </Typography>

        <List dense>
          {gameState?.players?.map((player) => {
            const points =
              (gameState.wins?.[player] || 0) * 30 +
              (gameState.right?.[player] || 0) * 15 +
              (gameState.wrong?.[player] || 0) * -5 +
              (gameState.misses?.[player] || 0) * -5;

            return (
              <ListItem
                key={player}
                sx={{
                  mb: 0.5,
                  borderRadius: 1,
                  bgcolor:
                    player === gameState.hanger
                      ? "rgba(25, 118, 210, 0.1)"
                      : "transparent",
                }}
              >
                <ListItemText
                  primary={player}
                  primaryTypographyProps={{
                    fontWeight: "medium",
                    fontSize: "1rem",
                  }}
                />
                <Chip
                  label={`${points} pts`}
                  color={points >= 0 ? "primary" : "error"}
                  size="small"
                  sx={{ fontWeight: "bold" }}
                />
              </ListItem>
            );
          })}
        </List>

        <Divider sx={{ my: 2 }} />

        {/* GAME INFO */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography>
            <b>Hanger:</b> {gameState?.hanger}
          </Typography>
          <Typography>
            <b>Mode:</b> {mode}
          </Typography>
          <Typography>
            <b>Round:</b> {gameState?.round}
          </Typography>
        </Box>
      </Paper>

      {/* CENTER PANEL */}
      <Box
        sx={{
          flex: 2,
          display: "flex",
          flexDirection: "column",
          p: 2,
          py: 2,
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {renderContent()}

        {notification && (
          <div className="notification-toast">
            <Typography variant="subtitle1" fontWeight="bold">
              {notification}
            </Typography>
          </div>
        )}
      </Box>

{/* RIGHT PANEL */}
<Paper
  elevation={6} // match left panel
  sx={{
    flex: 1,
    display: "flex",
    flexDirection: "column",
    p: 3, // same padding as left
    borderRadius: 3, // same rounding
    backgroundColor: "#f9f9f9", // same background
    overflowY: "auto",
  }}
>
  <Typography
    variant="h5"
    textAlign="center"
    sx={{
      fontWeight: "bold",
      letterSpacing: 1,
      color: "#1976d2",
      mb: 2,
    }}
  >
    💬Chat
  </Typography>

  {user && <Chat user={user} roomID={roomID} />}
</Paper>

    </Box>
  );
}

export default Room;
