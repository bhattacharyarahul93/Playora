import type { Square } from "chess.js";

export type PlayerColor = "w" | "b";

export type ChessDifficulty = "EASY" | "MEDIUM" | "HARD";

export type GameState = "ready" | "playing" | "completed";

export type ChessResult = "YOU WIN! 🏆" | "COMPUTER WINS 🤖" | "DRAW! 🤝";

export type SelectedMove = {
  from: Square;
  to: Square;
};

export type BoardPiece = {
  type: string;
  color: PlayerColor;
} | null;
