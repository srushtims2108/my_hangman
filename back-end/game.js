// game.js
// All game logic functions exported to be used by sockets/routes

export function createGame(params) {
  const time = params.time === "inf" ? null : (params.time ? parseInt(params.time) : null);
  const username = params.username;
  return {
    players: [username],
    wins: { [username]: 0 },
    right: { [username]: 0 },
    wrong: { [username]: 0 },
    misses: { [username]: 0 },
    hanger: username,
    category: "",
    word: "",
    guessedLetters: [],
    numIncorrect: 0,
    lives: params.lives ? parseInt(params.lives) : 6,
    guessedWords: [],
    guesser: "",
    curGuess: "",
    guessedWord: "",
    gameStart: false,
    cap: 8,
    rotation: params.rotation || "",
    round: 0,
    numRounds: params.numRounds ? parseInt(params.numRounds) : 0,
    time
  };
}

export function startGame(gameState) {
  gameState.gameStart = true;
  gameState.guesser = gameState.players.length > 1 ? gameState.players[1] : "";
}

export function addPlayer(gameState, user) {
  gameState.players.push(user);
  gameState.wins[user] = 0;
  gameState.right[user] = 0;
  gameState.wrong[user] = 0;
  gameState.misses[user] = 0;
}

export function removePlayer(gameState, user) {
  try {
    gameState.players = gameState.players.filter(p => p !== user);
    delete gameState.wins[user];
    delete gameState.right[user];
    delete gameState.wrong[user];
    delete gameState.misses[user];
  } catch (err) {
    console.log("No user found named ", user);
  }
}

export function numPlayers(gameState) {
  return gameState.players.length;
}

export function setNewGuesser(gameState) {
  if (!gameState.guesser) return;
  let guessPos = gameState.players.indexOf(gameState.guesser);

  if (guessPos === -1) {
    // fallback: pick first non-hanger
    for (const p of gameState.players) {
      if (p !== gameState.hanger) {
        gameState.guesser = p;
        return;
      }
    }
    return;
  }

  while (true) {
    guessPos = (guessPos + 1) % numPlayers(gameState);
    if (gameState.players[guessPos] !== gameState.hanger) {
      break;
    }
  }
  gameState.guesser = gameState.players[guessPos];
}

export function handleLeave(gameState, username) {
  if (numPlayers(gameState) === 2) {
    removePlayer(gameState, username);
    const remaining = gameState.players[0];
    const time = (!gameState.time && gameState.time !== 0) ? 'inf' : gameState.time;
    const res = createGame({
      username: remaining,
      lives: gameState.lives,
      rotation: gameState.rotation,
      numRounds: gameState.numRounds,
      time
    });
    Object.keys(gameState).forEach(k => delete gameState[k]);
    Object.assign(gameState, res);
    gameState.wins = { [remaining]: 0 };
    gameState.right = { [remaining]: 0 };
    gameState.wrong = { [remaining]: 0 };
    gameState.misses = { [remaining]: 0 };
    return;
  }

  if (username === gameState.hanger) {
    removePlayer(gameState, username);
    gameState.hanger = gameState.players[0];
    gameState.guesser = gameState.players[1] || "";
    gameState.word = "";
    gameState.category = "";
    return;
  }

  if (username === gameState.guesser) {
    setNewGuesser(gameState);
    removePlayer(gameState, username);
    return;
  }

  removePlayer(gameState, username);
}

export function handleNewRound(gameState, category, word, user) {
  gameState.word = word;
  gameState.category = category;
  gameState.guessedWord = Array.from(word)
    .map(c => /[a-zA-Z0-9]/.test(c) ? "_" : c)
    .join("");

  if (gameState.round) {
    if (gameState.rotation === "robin") {
      let hangPos = gameState.players.indexOf(gameState.hanger);
      const nextHanger = (hangPos !== (numPlayers(gameState) - 1)) ? hangPos + 1 : 0;
      gameState.hanger = gameState.players[nextHanger];
    } else if (gameState.numIncorrect !== gameState.lives) {
      gameState.hanger = user;
    }

    const hangPos = gameState.players.indexOf(gameState.hanger);
    const guessPos = (hangPos !== (numPlayers(gameState) - 1)) ? hangPos + 1 : 0;
    gameState.guesser = gameState.players[guessPos];
  }

  gameState.numIncorrect = 0;
  gameState.curGuess = "";
  gameState.round = (gameState.round || 0) + 1;
}

export function guess(gameState) {
  const cur = gameState.curGuess;
  let status = null;
  let winner = null;

  if (!cur) {
    // No guess entered: treat as timer miss
    gameState.numIncorrect += 1;
    gameState.misses[gameState.guesser] = (gameState.misses[gameState.guesser] || 0) + 1;
    status = "timer";
  } else if (cur.length === 1) {
    // Single letter guess
    if (!gameState.guessedLetters.includes(cur)) gameState.guessedLetters.push(cur);
    let match = 0;

    for (let i = 0; i < gameState.word.length; i++) {
      if (gameState.word[i].toLowerCase() === cur.toLowerCase() && gameState.guessedWord[i] === "_") {
        gameState.guessedWord =
          gameState.guessedWord.substring(0, i) +
          gameState.word[i] +
          gameState.guessedWord.substring(i + 1);
        match += 1;
      }
    }

    if (match === 0) {
      gameState.numIncorrect += 1;
      gameState.wrong[gameState.guesser] = (gameState.wrong[gameState.guesser] || 0) + 1;
      status = "incorrect";
    } else {
      gameState.right[gameState.guesser] = (gameState.right[gameState.guesser] || 0) + 1;
      status = "correct";
    }
  } else {
    // Full word guess
    if (!gameState.guessedWords.includes(cur)) gameState.guessedWords.push(cur);
    if (cur.toLowerCase() !== gameState.word.toLowerCase()) {
      gameState.numIncorrect += 1;
      gameState.wrong[gameState.guesser] = (gameState.wrong[gameState.guesser] || 0) + 1;
      status = "incorrect";
    }
  }

  const wordSolved = gameState.word.toLowerCase() === gameState.guessedWord.toLowerCase();
  const failed = gameState.numIncorrect >= gameState.lives;
  const directWin = cur.toLowerCase() === gameState.word.toLowerCase();

  if (wordSolved || failed || directWin) {
    if (failed) {
      status = status || "failed";
      gameState.wins[gameState.hanger] = (gameState.wins[gameState.hanger] || 0) + 1;
      winner = gameState.hanger;
    } else {
      status = status || "win";
      gameState.wins[gameState.guesser] = (gameState.wins[gameState.guesser] || 0) + 1;
      winner = gameState.guesser;
    }

    // Immediately reset round fields for next round (frontend should reflect instantly)
    gameState.category = "";
    gameState.guessedWord = "";
    gameState.guessedLetters = [];
    gameState.guessedWords = [];
  } else {
    // Round continues: pick next guesser
    setNewGuesser(gameState);
  }

  return { status, winner };
}
