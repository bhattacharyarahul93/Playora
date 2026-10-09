import type { Square } from "chess.js";
import type { BoardPiece, PlayerColor } from "./chessTypes";

export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

export const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"] as const;

export const PIECE_SYMBOLS: Record<string, string> = {
  wp: "♙",
  wn: "♘",
  wb: "♗",
  wr: "♖",
  wq: "♕",
  wk: "♔",

  bp: "♟",
  bn: "♞",
  bb: "♝",
  br: "♜",
  bq: "♛",
  bk: "♚",
};

export const getPieceSymbol = (color: PlayerColor, type: string): string => {
  return PIECE_SYMBOLS[`${color}${type}`] ?? "";
};

export const getBoardFiles = (playerColor: PlayerColor) => {
  return playerColor === "w" ? [...FILES] : [...FILES].reverse();
};

export const getBoardRanks = (playerColor: PlayerColor) => {
  return playerColor === "w" ? [...RANKS] : [...RANKS].reverse();
};

export const getSquare = (file: string, rank: string): Square => {
  return `${file}${rank}` as Square;
};

export const isLightSquare = (
  fileIndex: number,
  rankIndex: number,
): boolean => {
  return (fileIndex + rankIndex) % 2 === 0;
};

export const getBoardPiece = (
  board: BoardPiece[][],
  rankIndex: number,
  fileIndex: number,
): BoardPiece => {
  return board[rankIndex]?.[fileIndex] ?? null;
};
