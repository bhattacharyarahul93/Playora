import { Chess } from "chess.js";
import type { Square } from "chess.js";

export type LegalChessMove = {
  from: Square;
  to: Square;
  promotion?: string;
  captured?: string;
};

export const getLegalMoves = (
  chess: Chess,
  square: Square,
): LegalChessMove[] => {
  try {
    return chess.moves({
      square,
      verbose: true,
    }) as LegalChessMove[];
  } catch {
    return [];
  }
};

export const getLegalMoveSquares = (chess: Chess, square: Square): string[] => {
  return getLegalMoves(chess, square).map((move) => move.to);
};

export const isLegalDestination = (
  chess: Chess,
  from: Square,
  to: Square,
): boolean => {
  return getLegalMoveSquares(chess, from).includes(to);
};

export const makeChessMove = (
  chess: Chess,
  from: Square,
  to: Square,
  promotion = "q",
) => {
  try {
    return chess.move({
      from,
      to,
      promotion,
    });
  } catch {
    return null;
  }
};

export const isPawnPromotion = (
  chess: Chess,
  from: Square,
  to: Square,
): boolean => {
  const piece = chess.get(from);

  if (!piece || piece.type !== "p") {
    return false;
  }

  const targetRank = to[1];

  return targetRank === "1" || targetRank === "8";
};
