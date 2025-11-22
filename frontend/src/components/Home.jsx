import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Card, TextField, Typography } from "@mui/material";
import axios from "axios";

const Home = () => {
  const navigate = useNavigate();
  const [roomIdInput, setRoomIdInput] = useState("");
  const [feedback, setFeedback] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("SEND");
  const timerRef = useRef(null);

  const handleCreateRoom = () => navigate("/create");
  const handleJoinRoom = () => {
    if (roomIdInput.trim() !== "") navigate(`/${roomIdInput}`);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("Sent!");
    try {
      await axios.post(`${process.env.REACT_APP_SERVER}/feedback/`, { data: feedback });
      setFeedback({ name: "", email: "", message: "" });
    } catch (err) {
      console.error(err);
      setStatus("Error!");
    }
    timerRef.current = setTimeout(() => setStatus("SEND"), 5000);
  };

  // Common card style
  const cardStyle = {
    width: "100%",
    maxWidth: 1000,
    p: 4,
    borderRadius: 3,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    backgroundColor: "#fff",
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "110vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        px: 2,
        py: 6,
        backgroundColor: "#f9f9f9",
        gap: 6,
      }}
    >
      {/* Intro Card */}
      <Card sx={{ ...cardStyle, minHeight: 180 }}>
        <Typography variant="h4" sx={{ fontWeight: "bold", color: "#333" }}>
          hangmanonline.io
        </Typography>
        <Typography variant="body1" sx={{ color: "#555", lineHeight: 1.8 }}>
          hangmanonline.io is a free online platform to play Hangman with your friends. A player can create a game
          by filling out the form below and can invite friends by sharing the URL they'll receive afterwards.
        </Typography>
      </Card>

      {/* How to Play */}
      <Card sx={{ ...cardStyle, minHeight: 250 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", color: "#333" }}>
          How to Play
        </Typography>
        <Typography variant="body1" sx={{ color: "#555", lineHeight: 1.8, mt: 1 }}>
          When it's your turn to be the "hanger", choose a word and category you think could stump, or even get a laugh
          out of your friends. Alternatively, if you're a "guesser", try to guess an individual letter or the entire word.
          Keep an eye on the timer and the number of lives. If you run out of time or guess wrong, you lose a life.
          Once finished, try different rotation modes and adjust guess time and lives!
        </Typography>
      </Card>

      {/* Room & Feedback Section */}
      {/* Room & Feedback Section */}
<Box
  sx={{
    display: "flex",
    flexDirection: { xs: "column", md: "row" },
    gap: 4,
    justifyContent: "center",
    alignItems: "stretch", // ensures both cards have equal height
    width: "100%",
    px: 2,
  }}
>
  {/* Room Controls Card */}
  <Card
    sx={{
      width: "100%",
      maxWidth: 500,
      minHeight: 450, // fixed height
      p: 4,
      borderRadius: 3,
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      gap: 2,
      backgroundColor: "#fff",
      flex: 1,
    }}
  >
    <Typography
      variant="h6"
      sx={{
        color: "black",
        fontWeight: 900,
        textTransform: "uppercase",
        letterSpacing: 1,
        textAlign: "center",
        textShadow: "1px 1px 2px rgba(0,0,0,0.2)",
      }}
    >
      START THE GAME NOW !!!
    </Typography>

    <Typography variant="subtitle1" sx={{ color: "#555", fontWeight: "bold", mt: 2 }}>
      Click below to create room
    </Typography>
    <Button variant="contained" color="primary" sx={{ py: 1.5, fontWeight: "bold", width: "100%" }} onClick={handleCreateRoom}>
      Create Room
    </Button>

    <Typography variant="subtitle1" sx={{ color: "#555", fontWeight: "bold", mt: 3 }}>
      Enter the room ID to join room
    </Typography>
    <TextField
      placeholder="Enter Room ID"
      value={roomIdInput}
      onChange={(e) => setRoomIdInput(e.target.value)}
      variant="outlined"
      fullWidth
      sx={{ mt: 1 }}
    />
    <Button variant="contained" color="primary" sx={{ py: 1.5, fontWeight: "bold", mt: 1, width: "100%" }} onClick={handleJoinRoom}>
      Join Room
    </Button>
  </Card>

  {/* Feedback Card */}
  <Card
    sx={{
      width: "100%",
      maxWidth: 500, // same as Room Controls
      minHeight: 450, // same as Room Controls
      p: 4,
      borderRadius: 3,
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
      gap: 2,
      backgroundColor: "#fff",
      flex: 1,
    }}
  >
    <Typography variant="h5" sx={{ fontWeight: "bold", color: "#333" }}>
      Feedback
    </Typography>
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
      <TextField fullWidth label="Name" value={feedback.name} onChange={(e) => setFeedback({ ...feedback, name: e.target.value })} required />
      <TextField fullWidth label="Email" type="email" value={feedback.email} onChange={(e) => setFeedback({ ...feedback, email: e.target.value })} required />
      <TextField fullWidth label="Message" value={feedback.message} onChange={(e) => setFeedback({ ...feedback, message: e.target.value })} required multiline minRows={6} />
      <Button type="submit" variant="contained" color="primary" sx={{ py: 1.5, fontWeight: "bold" }} onClick={handleFeedbackSubmit}>
        {status}
      </Button>
    </Box>
  </Card>
</Box>

    </Box>
  );
};

export default Home;
