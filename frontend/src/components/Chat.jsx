import React, { useState, useEffect, useCallback } from "react";
import { socket } from "../modules/socket";
import { FormControl, Input, Button, Box } from "@mui/material";
import ScrollableFeed from "react-scrollable-feed";

function Chat({ user, roomID }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const handleMessage = useCallback((info) => {
    setMessages((prev) => [...prev, info]);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() !== "") {
      const info = {
        roomID,
        user,
        message,
        effects: false,
      };
      setMessage("");
      socket.emit("chat", info);
    }
  };

  const validateMessage = () => {
    const userMsg = document.getElementById("message");
    if (!/^[^\s]+(\s+[^\s]+)*$/.test(userMsg.value)) {
      userMsg.setCustomValidity("Message cannot have leading or trailing spaces");
    } else {
      userMsg.setCustomValidity("");
    }
  };

  useEffect(() => {
    socket.on("chat", handleMessage);
    return () => {
      socket.off("chat", handleMessage);
    };
  }, [handleMessage]);

  const color = {
    word: "SlateBlue",
    win: "green",
    correct: "green",
    incorrect: "red",
    timer: "red",
    join: "gray",
    leave: "gray",
  };

  const font = {
    join: "italic",
    leave: "italic",
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "90%",
        width: "100%",
      }}
    >
      {/* Input Area on Top */}
      <Box
  component="form"
  onSubmit={handleSubmit}
  sx={{
    display: "flex",
    gap: 1,
    mb: 1,
    p: 1,
    bgcolor: "#f5f5f5",
    borderRadius: 1,
    alignItems: "center",
  }}
>
  <FormControl sx={{ flex: 1 }}>
    <Input
      type="text"
      value={message}
      onChange={(e) => setMessage(e.target.value)}
      onInput={validateMessage}
      id="message"
      name="message"
      placeholder="Enter your message"
      fullWidth
      sx={{
        bgcolor: "white",
        px: 1,
        py: 0.5,
        borderRadius: 1,
        border: "1px solid #ccc",
      }}
      required
    />
  </FormControl>
  <Button variant="contained" color="primary" type="submit">
    Send
  </Button>
</Box>

      {/* Messages Area below */}
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        <ScrollableFeed forceScroll={true}>
          {messages.map((info, idx) => (
            <p
              key={idx}
              style={{
                color: info[2] ? color[info[0]] : "black",
                fontStyle: info[2] ? font[info[0]] : "normal",
                margin: "2px 0",
              }}
            >
              {info[2] ? "" : `${info[0]}:`} {info[1]}
            </p>
          ))}
        </ScrollableFeed>
      </Box>
    </Box>
  );
}

export default Chat;
