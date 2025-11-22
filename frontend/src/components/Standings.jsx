import React, { useRef } from "react";
import NewRound from "./NewRound";
import { Typography } from "@mui/material"; // updated


const Standings = ({ gameState, setGameState, roomID, user }) => {
  const standings = useRef([]);

  const places = [
    "FIRST",
    "SECOND",
    "THIRD",
    "FOURTH",
    "FIFTH",
    "SIXTH",
    "SEVENTH",
    "EIGTH",
  ];

  const getScore = (player) => {
    const win = 30;
    const right = 15;
    const wrong = -5;
    const miss = -5;

    return (
      win * gameState.wins[player] +
      right * gameState.right[player] +
      wrong * gameState.wrong[player] +
      miss * gameState.misses[player]
    );
  };

  let scores = gameState.players.reduce((obj, player) => {
    obj[player] = getScore(player);
    return obj;
  }, {});

  if (!standings.current.length) {
    let wins = Object.entries(scores);

    wins.sort((a, b) => b[1] - a[1]);

    let prev = wins[0][1];
    let uniq = 0;
    let res = [];

    for (let person of wins) {
      if (person[1] !== prev) {
        uniq++;
      }
      prev = person[1];

      const str = `${person[0]} ${places[uniq]}  with a score of ${person[1]}`;
      res.push(str);
    }

    standings.current = res;
  }

  return (
    <div>
      {standings.current.map((place) => (
        <Typography variant="h5" key={place}>
          <b>{place}</b>
        </Typography>
      ))}

      <br />

      <NewRound
        gameState={gameState}
        setGameState={setGameState}
        roomID={roomID}
        user={user}
      />
    </div>
  );
};

export default Standings;
