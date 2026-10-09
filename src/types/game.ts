export type GameState =
  | "ready"
  | "playing"
  | "paused"
  | "completed"
  | "gameOver";

export type GameProgress = {
  highScore: number;
  currentLevel: number;
  unlockedLevels: number;
  stars: number;
};

export type GameId =
  | "card-match"
  | "watermelon"
  | "number-merge"
  | "snake"
  | "ludo"
  | "periodic-table"
  | "sudoku-classic"
  | "crossword-master"
  | "tic-tac-toe"
  | "chess";
