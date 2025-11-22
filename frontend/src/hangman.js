// No TypeScript types — plain JS version

export const gameInitDefault = {
  username: "",
  lives: "6",
  numRounds: "1",
  rotation: "robin",
  time: "inf",
};

export const defaultGameState = {
  players: [],
  wins: {},
  right: {},
  wrong: {},
  misses: {},
  cap: 8,
  hanger: "",
  category: "",
  word: "",
  guessedLetters: [],
  lives: 6,
  numIncorrect: 0,
  guessedWords: [],
  guesser: "",
  curGuess: "",
  guessedWord: "",
  gameStart: false,
  rotation: "robin",
  round: 1,
  numRounds: 1,
  time: 0,
};
