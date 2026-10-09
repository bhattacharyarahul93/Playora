import { Chess } from "chess.js";

import { evaluateBoard, getRandomItem } from "./chessUtils";

import type { ChessDifficulty, PlayerColor } from "./chessTypes";

export type ComputerMove = {
  from: string;
  to: string;
  promotion?: string;
};

const getMoves = (chess: Chess): ComputerMove[] => {
  return chess.moves({
    verbose: true,
  }) as ComputerMove[];
};

const getRandomMove = (chess: Chess): ComputerMove | null => {
  return getRandomItem(getMoves(chess));
};

const minimax = (
  chess: Chess,
  depth: number,
  maximizing: boolean,
  computerColor: PlayerColor,
  alpha: number,
  beta: number,
): number => {
  if (chess.isCheckmate()) {
    if (chess.turn() === computerColor) {
      return -100000 - depth;
    }

    return 100000 + depth;
  }

  if (
    chess.isDraw() ||
    chess.isStalemate() ||
    chess.isThreefoldRepetition() ||
    chess.isInsufficientMaterial()
  ) {
    return 0;
  }

  if (depth === 0) {
    return evaluateBoard(chess, computerColor);
  }

  const moves = getMoves(chess);

  if (maximizing) {
    let bestScore = -Infinity;

    for (const move of moves) {
      const next = new Chess(chess.fen());

      try {
        next.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion ?? "q",
        });
      } catch {
        continue;
      }

      const score = minimax(next, depth - 1, false, computerColor, alpha, beta);

      bestScore = Math.max(bestScore, score);

      alpha = Math.max(alpha, bestScore);

      if (beta <= alpha) {
        break;
      }
    }

    return bestScore;
  }

  let bestScore = Infinity;

  for (const move of moves) {
    const next = new Chess(chess.fen());

    try {
      next.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion ?? "q",
      });
    } catch {
      continue;
    }

    const score = minimax(next, depth - 1, true, computerColor, alpha, beta);

    bestScore = Math.min(bestScore, score);

    beta = Math.min(beta, bestScore);

    if (beta <= alpha) {
      break;
    }
  }

  return bestScore;
};

const getBestMove = (
  chess: Chess,
  depth: number,
  computerColor: PlayerColor,
): ComputerMove | null => {
  const moves = getMoves(chess);

  if (moves.length === 0) {
    return null;
  }

  let bestScore = -Infinity;

  let bestMoves: ComputerMove[] = [];

  for (const move of moves) {
    const next = new Chess(chess.fen());

    try {
      next.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion ?? "q",
      });
    } catch {
      continue;
    }

    const score = minimax(
      next,
      depth - 1,
      false,
      computerColor,
      -Infinity,
      Infinity,
    );

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return getRandomItem(bestMoves);
};

export const getComputerMove = (
  chess: Chess,
  difficulty: ChessDifficulty,
  computerColor: PlayerColor,
): ComputerMove | null => {
  if (difficulty === "EASY") {
    /*
     * Easy:
     * 45% smart
     * 55% random
     */
    if (Math.random() < 0.45) {
      return getBestMove(chess, 1, computerColor);
    }

    return getRandomMove(chess);
  }

  if (difficulty === "MEDIUM") {
    /*
     * Medium uses depth 2.
     */
    return getBestMove(chess, 2, computerColor);
  }

  /*
   * Hard uses depth 3.
   */
  return getBestMove(chess, 3, computerColor);
};
