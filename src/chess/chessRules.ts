import { Chess } from "chess.js";
import type { ChessResult, PlayerColor } from "./chessTypes";

export const isGameDraw = (chess: Chess): boolean => {
  return (
    chess.isDraw() ||
    chess.isStalemate() ||
    chess.isThreefoldRepetition() ||
    chess.isInsufficientMaterial()
  );
};

export const isGameOver = (chess: Chess): boolean => {
  return chess.isCheckmate() || isGameDraw(chess);
};

export const isInCheck = (chess: Chess): boolean => {
  return chess.isCheck();
};

export const getGameResult = (
  chess: Chess,
  playerColor: PlayerColor,
): ChessResult | null => {
  if (chess.isCheckmate()) {
    /*
     * chess.turn() is the side that has
     * been checkmated.
     */
    const loser = chess.turn();

    if (loser === playerColor) {
      return "COMPUTER WINS 🤖";
    }

    return "YOU WIN! 🏆";
  }

  if (isGameDraw(chess)) {
    return "DRAW! 🤝";
  }

  return null;
};

export const getTurnText = (
  chess: Chess,
  playerColor: PlayerColor,
  computerThinking: boolean,
): string => {
  if (computerThinking) {
    return "Computer is thinking...";
  }

  if (chess.turn() === playerColor) {
    return "Your turn";
  }

  return "Computer turn";
};

export const getCheckText = (
  chess: Chess,
  playerColor: PlayerColor,
  computerThinking: boolean,
): string => {
  if (chess.isCheck()) {
    return "CHECK!";
  }

  return getTurnText(chess, playerColor, computerThinking);
};
