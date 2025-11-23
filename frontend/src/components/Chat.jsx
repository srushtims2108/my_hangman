import React, { useState, useEffect, useCallback } from "react";
import { socket } from "../modules/socket";
import { FormControl, Input, Button, Typography } from "@mui/material";

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
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Input + Send Button at the top */}
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: "8px", alignItems: "center" }}
      >
        <FormControl fullWidth>
          <Input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onInput={validateMessage}
            id="message"
            name="message"
            placeholder="Enter your message..."
            required
            sx={{
              padding: "8px",
              fontSize: "14px",
            }}
          />
        </FormControl>
        <Button
          type="submit"
          variant="contained"
          sx={{
            backgroundColor: "#1976d2",
            color: "white",
            "&:hover": { backgroundColor: "#115293" },
            textTransform: "none",
            padding: "8px 16px",
            fontSize: "14px",
          }}
        >
          Send
        </Button>
      </form>

      {/* Messages render normally */}
      <div>
        {messages.map((info, idx) => (
          <Typography
            key={idx}
            sx={{
              color: info[2] ? color[info[0]] : "black",
              fontStyle: info[2] ? font[info[0]] : "normal",
              mb: 0.5,
              wordBreak: "break-word",
            }}
          >
            {!info[2] && (
              <span style={{ color: "#1976d2", fontWeight: "bold" }}>
                {info[0]}:
              </span>
            )}{" "}
            {info[1]}
          </Typography>
        ))}
      </div>
    </div>
  );
}

export default Chat;
