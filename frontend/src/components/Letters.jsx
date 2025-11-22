import React from "react";
import { Button } from "@mui/material";


const Letters = ({ onClick, disabled, guessedLetters }) => {
  const letters = "abcdefghijklmnopqrstuvwxyz".split("");

  const renderLetters = () => {
    return letters.map((letter) => (
      <Button
        variant="contained"
        onClick={onClick}
        value={letter}
        key={letter.charCodeAt(0)}
        size="small"
        color="primary"
        style={{ maxWidth: "30px", minWidth: "30px", margin: "3px" }}
        disabled={disabled || guessedLetters.includes(letter)}
      >
        {letter}
      </Button>
    ));
  };

  return <div style={{ textAlign: "center" }}>{renderLetters()}</div>;
};

export default Letters;
