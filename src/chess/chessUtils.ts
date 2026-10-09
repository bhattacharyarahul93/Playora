import { Chess } from "chess.js";

export const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

export const evaluateBoard = (
  chess: Chess,
  computerColor: "w" | "b",
): number => {
  const board = chess.board();

  let score = 0;

  for (const row of board) {
    for (const piece of row) {
      if (!piece) {
        continue;
      }

      const value = PIECE_VALUES[piece.type] ?? 0;

      if (piece.color === computerColor) {
        score += value;
      } else {
        score -= value;
      }
    }
  }

  /*
   * Mobility bonus.
   */
  const mobility = chess.moves().length;

  score += mobility * 2;

  return score;
};

export const getRandomItem = <T>(items: T[]): T | null => {
  if (items.length === 0) {
    return null;
  }

  return items[Math.floor(Math.random() * items.length)];
};

export const getOpponentColor = (color: "w" | "b"): "w" | "b" => {
  return color === "w" ? "b" : "w";
};

export const getDifficultyDescription = (
  difficulty: "EASY" | "MEDIUM" | "HARD",
): string => {
  switch (difficulty) {
    case "EASY":
      return "Computer makes mistakes and gives you chances.";

    case "MEDIUM":
      return "Computer thinks ahead and plays carefully.";

    case "HARD":
      return "Computer plays much stronger chess.";

    default:
      return "";
  }
};
