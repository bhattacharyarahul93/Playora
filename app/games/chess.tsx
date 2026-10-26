import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import { Chess } from "chess.js";

import { getAllProgress, saveGameProgress } from "../../src/services/storage";

import {
  getBoardFiles,
  getBoardRanks,
  getPieceSymbol,
  isLightSquare,
} from "../../src/chess/chessBoard";

import {
  getLegalMoveSquares,
  isPawnPromotion,
  makeChessMove,
} from "../../src/chess/chessMoves";

import { getCheckText, getGameResult } from "../../src/chess/chessRules";

import { getComputerMove } from "../../src/chess/chessAI";

import {
  getDifficultyDescription,
  getOpponentColor,
} from "../../src/chess/chessUtils";

import type {
  ChessDifficulty,
  GameState,
  PlayerColor,
} from "../../src/chess/chessTypes";

const DIFFICULTIES: ChessDifficulty[] = ["EASY", "MEDIUM", "HARD"];

export default function ChessScreen() {
  const router = useRouter();

  const chessRef = useRef<Chess>(new Chess());

  const computerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [gameState, setGameState] = useState<GameState>("ready");

  const [playerColor, setPlayerColor] = useState<PlayerColor>("w");

  const [difficulty, setDifficulty] = useState<ChessDifficulty>("EASY");

  const [roundNumber, setRoundNumber] = useState(0);

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const [legalMoves, setLegalMoves] = useState<string[]>([]);

  const [lastMove, setLastMove] = useState<{
    from: string;

    to: string;
  } | null>(null);

  const [computerThinking, setComputerThinking] = useState(false);

  const [promotionSquare, setPromotionSquare] = useState<string | null>(null);

  const [score, setScore] = useState(0);

  const [, setBestScore] = useState(0);

  const [wins, setWins] = useState(0);

  const [losses, setLosses] = useState(0);

  const [draws, setDraws] = useState(0);

  const [resultText, setResultText] = useState("");

  const [boardVersion, setBoardVersion] = useState(0);
  const [boardSize, setBoardSize] = useState(0);
  const [animatedMove, setAnimatedMove] = useState<{
    from: string;
    to: string;
    color: "w" | "b";
    piece: string;
  } | null>(null);
  const pieceTranslation = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const pieceAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    let mounted = true;

    getAllProgress()
      .then((allProgress) => {
        if (mounted) setBestScore(allProgress.chess.highScore);
      })

      .catch((error) => console.warn("Unable to load Chess progress:", error));

    return () => {
      mounted = false;
    };
  }, []);

  const computerColor = getOpponentColor(playerColor);

  const refreshBoard = useCallback(() => {
    setBoardVersion((value) => value + 1);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSquare(null);

    setLegalMoves([]);
  }, []);

  const startGame = useCallback(() => {
    if (computerTimerRef.current) {
      clearTimeout(computerTimerRef.current);
    }

    if (resultTimerRef.current) {
      clearTimeout(resultTimerRef.current);
    }

    const nextRound = roundNumber + 1;

    /*



         * Alternate colors.



         *



         * Round 1 = White



         * Round 2 = Black



         * Round 3 = White



         */

    const nextColor: PlayerColor = nextRound % 2 === 1 ? "w" : "b";

    pieceAnimationRef.current?.stop();
    setAnimatedMove(null);
    pieceTranslation.setValue({ x: 0, y: 0 });
    chessRef.current = new Chess();

    setRoundNumber(nextRound);

    setPlayerColor(nextColor);

    setGameState("playing");

    setSelectedSquare(null);

    setLegalMoves([]);

    setLastMove(null);

    setPromotionSquare(null);

    setResultText("");

    /*



         * If player is Black,



         * computer has White and



         * therefore starts.



         */

    setComputerThinking(nextColor === "b");

    refreshBoard();
  }, [roundNumber, refreshBoard]);

  const prepareGame = useCallback(() => {
    if (computerTimerRef.current) {
      clearTimeout(computerTimerRef.current);
    }

    if (resultTimerRef.current) {
      clearTimeout(resultTimerRef.current);
    }

    pieceAnimationRef.current?.stop();
    setAnimatedMove(null);
    pieceTranslation.setValue({ x: 0, y: 0 });
    chessRef.current = new Chess();

    setGameState("ready");

    setSelectedSquare(null);

    setLegalMoves([]);

    setLastMove(null);

    setPromotionSquare(null);

    setComputerThinking(false);

    setResultText("");

    refreshBoard();
  }, [refreshBoard]);

  useEffect(() => {
    return () => {
      if (computerTimerRef.current) {
        clearTimeout(computerTimerRef.current);
      }

      if (resultTimerRef.current) {
        clearTimeout(resultTimerRef.current);
      }
    };
  }, []);

  const finishGame = useCallback(
    (result: string) => {
      setResultText(result);

      setGameState("completed");

      setComputerThinking(false);

      const playerWon = result === "YOU WIN! 🏆";

      const isDraw = result === "DRAW! 🤝";

      const nextScore = score + (playerWon ? 100 : 0);

      setBestScore((value) => Math.max(value, nextScore));

      if (playerWon) {
        setWins((value) => value + 1);

        setScore(nextScore);
      } else if (isDraw) {
        setDraws((value) => value + 1);
      } else {
        setLosses((value) => value + 1);
      }

      getAllProgress()
        .then(async (allProgress) => {
          const previous = allProgress.chess;

          const earnedStars = playerWon ? 3 : isDraw ? 1 : 0;

          await saveGameProgress("chess", {
            ...previous,

            highScore: Math.max(previous.highScore, nextScore),

            currentLevel: previous.currentLevel + 1,

            unlockedLevels: Math.max(
              previous.unlockedLevels,

              previous.currentLevel + 2,
            ),

            stars: Math.max(previous.stars, earnedStars),
          });
        })

        .catch((error) => {
          console.warn("Unable to save Chess progress:", error);
        });
    },

    [score],
  );

  const checkFinished = useCallback(() => {
    const result = getGameResult(chessRef.current, playerColor);

    if (!result) {
      return false;
    }

    /*



         * Delay the result screen so



         * the final move is visible.



         */

    resultTimerRef.current = setTimeout(() => {
      finishGame(result);
    }, 900);

    return true;
  }, [playerColor, finishGame]);

  const animatePieceMove = useCallback(
    (from: string, to: string, color: "w" | "b", piece: string) => {
      const boardFiles: string[] = [...getBoardFiles(playerColor)];
      const boardRanks = getBoardRanks(playerColor);
      const fromColumn = boardFiles.indexOf(from.charAt(0));
      const toColumn = boardFiles.indexOf(to.charAt(0));

      const fromRow = boardRanks.findIndex(
        (rank) => String(rank) === from.charAt(1),
      );

      const toRow = boardRanks.findIndex(
        (rank) => String(rank) === to.charAt(1),
      );

      if (
        boardSize <= 0 ||
        fromColumn < 0 ||
        toColumn < 0 ||
        fromRow < 0 ||
        toRow < 0
      ) {
        setAnimatedMove(null);
        return;
      }

      pieceAnimationRef.current?.stop();
      pieceTranslation.setValue({ x: 0, y: 0 });
      setAnimatedMove({ from, to, color, piece });

      const cellSize = (boardSize - 8) / 8;
      pieceAnimationRef.current = Animated.timing(pieceTranslation, {
        toValue: {
          x: (toColumn - fromColumn) * cellSize,
          y: (toRow - fromRow) * cellSize,
        },
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      pieceAnimationRef.current.start(({ finished }) => {
        if (finished) setAnimatedMove(null);
      });
    },
    [boardSize, playerColor, pieceTranslation],
  );

  const performMove = useCallback(
    (from: string, to: string, promotion = "q") => {
      const chess = chessRef.current;

      const move = makeChessMove(chess, from as any, to as any, promotion);

      if (!move) {
        return false;
      }

      animatePieceMove(move.from, move.to, move.color, move.piece);
      setLastMove({
        from: move.from,
        to: move.to,
      });

      clearSelection();

      refreshBoard();

      checkFinished();

      return true;
    },

    [clearSelection, refreshBoard, checkFinished, animatePieceMove],
  );

  const handleSquarePress = useCallback(
    (square: string) => {
      if (gameState !== "playing") {
        return;
      }

      if (computerThinking) {
        return;
      }

      if (promotionSquare) {
        return;
      }

      const chess = chessRef.current;

      if (chess.turn() !== playerColor) {
        return;
      }

      const piece = chess.get(square as any);

      /*



         * Nothing selected.



         */

      if (!selectedSquare) {
        if (piece && piece.color === playerColor) {
          setSelectedSquare(square);

          setLegalMoves(getLegalMoveSquares(chess, square as any));
        }

        return;
      }

      /*



         * Tap selected piece



         * again.



         */

      if (selectedSquare === square) {
        clearSelection();

        return;
      }

      /*



         * Select another own



         * piece.



         */

      if (piece && piece.color === playerColor) {
        setSelectedSquare(square);

        setLegalMoves(getLegalMoveSquares(chess, square as any));

        return;
      }

      /*



         * Not a legal destination.



         */

      if (!legalMoves.includes(square)) {
        clearSelection();

        return;
      }

      /*



         * Promotion.



         */

      if (isPawnPromotion(chess, selectedSquare as any, square as any)) {
        setPromotionSquare(square);

        return;
      }

      const moved = performMove(selectedSquare, square);

      if (moved) {
        setComputerThinking(true);
      }
    },

    [
      gameState,

      computerThinking,

      promotionSquare,

      playerColor,

      selectedSquare,

      legalMoves,

      clearSelection,

      performMove,
    ],
  );

  const handlePromotion = useCallback(
    (piece: string) => {
      if (!promotionSquare || !selectedSquare) {
        return;
      }

      const moved = performMove(selectedSquare, promotionSquare, piece);

      setPromotionSquare(null);

      if (moved) {
        setComputerThinking(true);
      }
    },

    [promotionSquare, selectedSquare, performMove],
  );

  /*



     * COMPUTER TURN



     */

  useEffect(() => {
    if (gameState !== "playing" || !computerThinking || promotionSquare) {
      return;
    }

    const chess = chessRef.current;

    if (chess.turn() !== computerColor) {
      return;
    }

    computerTimerRef.current = setTimeout(() => {
      const move = getComputerMove(chess, difficulty, computerColor);

      if (!move) {
        setComputerThinking(false);

        return;
      }

      const result = makeChessMove(
        chess,

        move.from as any,

        move.to as any,

        move.promotion ?? "q",
      );

      if (!result) {
        setComputerThinking(false);

        return;
      }

      animatePieceMove(result.from, result.to, result.color, result.piece);
      setLastMove({
        from: result.from,
        to: result.to,
      });

      refreshBoard();

      const finished = getGameResult(chess, playerColor);

      if (finished) {
        resultTimerRef.current = setTimeout(() => {
          finishGame(finished);
        }, 900);

        return;
      }

      setComputerThinking(false);
    }, 550);

    return () => {
      if (computerTimerRef.current) {
        clearTimeout(computerTimerRef.current);

        computerTimerRef.current = null;
      }
    };
  }, [
    gameState,

    computerThinking,

    promotionSquare,

    computerColor,

    difficulty,

    playerColor,

    refreshBoard,

    finishGame,

    boardVersion,
    animatePieceMove,
  ]);

  const files = getBoardFiles(playerColor);

  const ranks = getBoardRanks(playerColor);

  /*



     * READY



     */

  if (gameState === "ready") {
    return (
      <View style={styles.readyScreen}>
        <View style={styles.readyCard}>
          <Text style={styles.readyEmoji}>♟️</Text>

          <Text style={styles.readyHeading}>Ready to play?</Text>

          <Text style={styles.readyInfo}>
            Play a real game of chess against the computer. Your color changes
            every round.
          </Text>

          <View style={styles.readyRules}>
            <Text style={styles.readyRule}>♟️ Real legal chess moves</Text>

            <Text style={styles.readyRule}>🏰 Castling & en-passant</Text>

            <Text style={styles.readyRule}>👑 Pawn promotion</Text>

            <Text style={styles.readyRule}>🔄 White ↔ Black every round</Text>

            <Text style={styles.readyRule}>
              🤖 Choose your opponent's difficulty below
            </Text>
          </View>

          <Text style={styles.difficultyHeading}>CHOOSE DIFFICULTY</Text>

          <View style={styles.difficultySelector}>
            {DIFFICULTIES.map((level) => {
              const selected = difficulty === level;

              return (
                <Pressable
                  key={level}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setDifficulty(level)}
                  style={({ pressed }) => [
                    styles.difficultyOption,

                    selected && styles.difficultyOptionSelected,

                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.difficultyOptionTitle,

                      selected && styles.difficultyOptionTitleSelected,
                    ]}
                  >
                    {level === "EASY"
                      ? "🟢 EASY"
                      : level === "MEDIUM"
                        ? "🟡 MEDIUM"
                        : "🔴 HARD"}
                  </Text>

                  <Text
                    style={[
                      styles.difficultyOptionDescription,

                      selected && styles.difficultyOptionDescriptionSelected,
                    ]}
                  >
                    {level === "EASY"
                      ? "Relaxed"
                      : level === "MEDIUM"
                        ? "Balanced"
                        : "Expert"}
                  </Text>

                  {selected && (
                    <Text style={styles.selectedLabel}>✓ SELECTED</Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.selectedDifficultyInfo}>
            {getDifficultyDescription(difficulty)}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.startButton,

              pressed && styles.buttonPressed,
            ]}
            onPress={startGame}
          >
            <Text style={styles.startButtonText}>START GAME</Text>
          </Pressable>

          <Pressable
            style={styles.backButton}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.backButtonText}>BACK TO GAMES</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  /*



     * COMPLETED



     */

  if (gameState === "completed") {
    return (
      <View style={styles.completedScreen}>
        <View style={styles.completedCard}>
          <Text style={styles.completedEmoji}>
            {resultText.includes("YOU WIN")
              ? "🏆"
              : resultText.includes("DRAW")
                ? "🤝"
                : "🤖"}
          </Text>

          <Text style={styles.completedTitle}>{resultText}</Text>

          <Text style={styles.completedSubtitle}>
            Round {roundNumber} • {difficulty} •{" "}
            {playerColor === "w" ? "WHITE" : "BLACK"}
          </Text>

          <View style={styles.scoreBox}>
            <Text style={styles.scoreText}>⭐ Score: {score}</Text>

            <Text style={styles.statsText}>
              Wins {wins} • Losses {losses} • Draws {draws}
            </Text>
          </View>

          <Text style={styles.difficultyHeading}>
            PLAY AGAIN — CHOOSE DIFFICULTY
          </Text>

          <View style={styles.difficultySelector}>
            {DIFFICULTIES.map((level) => {
              const selected = difficulty === level;

              return (
                <Pressable
                  key={level}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setDifficulty(level)}
                  style={({ pressed }) => [
                    styles.difficultyOption,

                    selected && styles.difficultyOptionSelected,

                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.difficultyOptionTitle,

                      selected && styles.difficultyOptionTitleSelected,
                    ]}
                  >
                    {level === "EASY"
                      ? "🟢 EASY"
                      : level === "MEDIUM"
                        ? "🟡 MEDIUM"
                        : "🔴 HARD"}
                  </Text>

                  <Text
                    style={[
                      styles.difficultyOptionDescription,

                      selected && styles.difficultyOptionDescriptionSelected,
                    ]}
                  >
                    {level === "EASY"
                      ? "Relaxed"
                      : level === "MEDIUM"
                        ? "Balanced"
                        : "Expert"}
                  </Text>

                  {selected && (
                    <Text style={styles.selectedLabel}>✓ SELECTED</Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.startButton,

              pressed && styles.buttonPressed,
            ]}
            onPress={startGame}
          >
            <Text style={styles.startButtonText}>PLAY AGAIN</Text>
          </Pressable>

          <Pressable
            style={styles.backButton}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.backButtonText}>TRY ANOTHER GAME</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  /*



     * PLAYING



     */

  return (
    <View style={styles.gameScreen}>
      <View style={styles.topBar}>
        <Pressable style={styles.topBackButton} onPress={prepareGame}>
          <Text style={styles.topBackText}>←</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>CHESS</Text>

          <Text style={styles.headerDifficulty}>{difficulty}</Text>
        </View>

        <Text style={styles.headerScoreText}>⭐ {score}</Text>
      </View>

      <View style={styles.infoArea}>
        <View style={styles.playerBadge}>
          <Text style={styles.playerBadgeLabel}>YOU</Text>

          <Text style={styles.playerBadgeValue}>
            {playerColor === "w" ? "WHITE" : "BLACK"}
          </Text>
        </View>

        <View style={styles.turnArea}>
          <Text style={styles.turnText}>
            {getCheckText(chessRef.current, playerColor, computerThinking)}
          </Text>

          <Text style={styles.roundText}>Round {roundNumber}</Text>
        </View>

        <View style={styles.playerBadge}>
          <Text style={styles.playerBadgeLabel}>COMPUTER</Text>

          <Text style={styles.playerBadgeValue}>
            {computerColor === "w" ? "WHITE" : "BLACK"}
          </Text>
        </View>
      </View>

      <View style={styles.difficultyBox}>
        <Text style={styles.difficultyText}>
          {getDifficultyDescription(difficulty)}
        </Text>
      </View>

      <View style={styles.boardWrapper}>
        <View
          style={styles.board}
          onLayout={(event) => setBoardSize(event.nativeEvent.layout.width)}
        >
          {ranks.map((rank, rankIndex) =>
            files.map((file, fileIndex) => {
              const square = `${file}${rank}`;

              const piece = chessRef.current.get(square as any);

              const selected = selectedSquare === square;

              const legal = legalMoves.includes(square);

              const last = lastMove?.from === square || lastMove?.to === square;

              const isKingInCheck =
                chessRef.current.isCheck() &&
                piece?.type === "k" &&
                piece?.color === chessRef.current.turn();

              const light = isLightSquare(fileIndex, rankIndex);

              return (
                <Pressable
                  key={square}
                  style={[
                    styles.square,

                    light ? styles.lightSquare : styles.darkSquare,

                    selected && styles.selectedSquare,

                    last && styles.lastMoveSquare,

                    isKingInCheck && styles.checkSquare,
                  ]}
                  onPress={() => handleSquarePress(square)}
                >
                  {piece && animatedMove?.to !== square && (
                    <Text
                      style={[
                        styles.pieceText,

                        piece.color === "w"
                          ? styles.whitePiece
                          : styles.blackPiece,
                      ]}
                    >
                      {getPieceSymbol(piece.color, piece.type)}
                    </Text>
                  )}

                  {legal && !piece && <View style={styles.moveDot} />}

                  {legal && piece && <View style={styles.captureRing} />}

                  {file === files[files.length - 1] && (
                    <Text style={styles.rankLabel}>{rank}</Text>
                  )}

                  {rank === ranks[ranks.length - 1] && (
                    <Text style={styles.fileLabel}>{file}</Text>
                  )}
                </Pressable>
              );
            }),
          )}
          {animatedMove &&
            boardSize > 0 &&
            (() => {
              const boardFiles = getBoardFiles(playerColor);
              const boardRanks = getBoardRanks(playerColor);
              const column = boardFiles.findIndex(
                (file) => String(file) === animatedMove.from.charAt(0),
              );
              const row = boardRanks.findIndex(
                (rank) => String(rank) === animatedMove.from.charAt(1),
              );
              const cellSize = (boardSize - 8) / 8;
              if (column < 0 || row < 0) return null;
              return (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.animatedPieceCell,
                    {
                      width: cellSize,
                      height: cellSize,
                      left: column * cellSize,
                      top: row * cellSize,
                      transform: pieceTranslation.getTranslateTransform(),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pieceText,
                      animatedMove.color === "w"
                        ? styles.whitePiece
                        : styles.blackPiece,
                    ]}
                  >
                    {getPieceSymbol(animatedMove.color, animatedMove.piece)}
                  </Text>
                </Animated.View>
              );
            })()}
        </View>
      </View>

      <View style={styles.bottomArea}>
        <Text style={styles.bottomHint}>
          {computerThinking
            ? "🤖 Computer is thinking..."
            : "Tap a piece, then tap its destination."}
        </Text>

        <Text style={styles.bottomStats}>
          Wins: {wins} • Losses: {losses} • Draws: {draws}
        </Text>
      </View>

      {promotionSquare && (
        <View style={styles.promotionOverlay}>
          <View style={styles.promotionCard}>
            <Text style={styles.promotionTitle}>PROMOTE PAWN</Text>

            <Text style={styles.promotionInfo}>Choose your piece</Text>

            <View style={styles.promotionOptions}>
              {[
                ["q", "♕"],

                ["r", "♖"],

                ["b", "♗"],

                ["n", "♘"],
              ].map(([type, symbol]) => (
                <Pressable
                  key={type}
                  style={styles.promotionButton}
                  onPress={() => handlePromotion(type)}
                >
                  <Text style={styles.promotionPiece}>{symbol}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  readyScreen: {
    flex: 1,

    backgroundColor: "#DFF7D8",

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 22,
  },

  readyCard: {
    width: "84%",

    maxWidth: 390,

    backgroundColor: "#FFFFFF",

    borderRadius: 24,

    paddingHorizontal: 24,

    paddingVertical: 28,

    alignItems: "center",

    elevation: 8,

    shadowColor: "#000",

    shadowOffset: {
      width: 0,

      height: 6,
    },

    shadowOpacity: 0.2,

    shadowRadius: 10,
  },

  readyEmoji: {
    fontSize: 68,

    marginBottom: 8,
  },

  readyHeading: {
    fontSize: 29,

    fontWeight: "900",

    color: "#18242D",

    textAlign: "center",
  },

  readyInfo: {
    textAlign: "center",

    color: "#66727B",

    fontSize: 15,

    lineHeight: 22,

    marginTop: 10,
  },

  readyRules: {
    width: "100%",

    backgroundColor: "#F4F8EC",

    borderRadius: 16,

    padding: 15,

    marginTop: 18,
  },

  readyRule: {
    color: "#374151",

    fontSize: 14,

    fontWeight: "700",

    marginVertical: 4,
  },

  difficultyHeading: {
    width: "100%",

    textAlign: "center",

    marginTop: 16,

    marginBottom: 9,

    fontSize: 12,

    fontWeight: "900",

    color: "#18242D",

    letterSpacing: 0.7,
  },

  difficultySelector: {
    width: "100%",

    flexDirection: "row",

    gap: 7,
  },

  difficultyOption: {
    flex: 1,

    minHeight: 76,

    paddingVertical: 10,

    paddingHorizontal: 4,

    alignItems: "center",

    justifyContent: "center",

    borderWidth: 2,

    borderColor: "#E1E8E0",

    borderRadius: 12,

    backgroundColor: "#FFFFFF",
  },

  difficultyOptionSelected: {
    borderColor: "#E85D04",

    backgroundColor: "#FFF1E7",
  },

  difficultyOptionTitle: {
    fontSize: 11,

    fontWeight: "900",

    color: "#34434D",

    textAlign: "center",
  },

  difficultyOptionTitleSelected: {
    color: "#E85D04",
  },

  difficultyOptionDescription: {
    fontSize: 10,

    color: "#7A8790",

    marginTop: 4,

    textAlign: "center",
  },

  difficultyOptionDescriptionSelected: {
    color: "#8C481D",
  },

  selectedLabel: {
    fontSize: 8,

    fontWeight: "900",

    color: "#E85D04",

    marginTop: 4,
  },

  selectedDifficultyInfo: {
    fontSize: 10,

    color: "#53635A",

    textAlign: "center",

    marginTop: 7,
  },

  startButton: {
    width: "100%",

    minHeight: 52,

    borderRadius: 14,

    backgroundColor: "#E85D04",

    alignItems: "center",

    justifyContent: "center",

    marginTop: 22,
  },

  buttonPressed: {
    transform: [
      {
        scale: 0.97,
      },
    ],
  },

  startButtonText: {
    color: "#FFFFFF",

    fontSize: 15,

    fontWeight: "900",
  },

  backButton: {
    width: "100%",

    minHeight: 52,

    borderRadius: 14,

    backgroundColor: "#EEF2F4",

    alignItems: "center",

    justifyContent: "center",

    marginTop: 10,
  },

  backButtonText: {
    color: "#27343D",

    fontSize: 14,

    fontWeight: "800",
  },

  gameScreen: {
    flex: 1,

    backgroundColor: "#F7FAFC",
  },

  topBar: {
    width: "100%",

    minHeight: 105,

    backgroundColor: "#18242D",

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    paddingHorizontal: 12,

    paddingTop: 42,

    paddingBottom: 10,
  },

  topBackButton: {
    width: 44,

    height: 44,

    borderRadius: 14,

    backgroundColor: "#293943",

    alignItems: "center",

    justifyContent: "center",
  },

  topBackText: {
    color: "#FFFFFF",

    fontSize: 28,
  },

  headerCenter: {
    alignItems: "center",
  },

  headerTitle: {
    color: "#FFFFFF",

    fontSize: 18,

    fontWeight: "900",
  },

  headerDifficulty: {
    color: "#F4A261",

    fontSize: 11,

    fontWeight: "900",

    marginTop: 3,
  },

  headerScoreText: {
    color: "#FFFFFF",

    fontSize: 14,

    fontWeight: "900",

    minWidth: 60,

    textAlign: "right",
  },

  infoArea: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    paddingHorizontal: 16,

    paddingTop: 14,
  },

  playerBadge: {
    minWidth: 82,

    paddingHorizontal: 8,

    paddingVertical: 8,

    borderRadius: 13,

    backgroundColor: "#FFFFFF",

    alignItems: "center",

    elevation: 2,
  },

  playerBadgeLabel: {
    color: "#7A8790",

    fontSize: 9,

    fontWeight: "900",
  },

  playerBadgeValue: {
    color: "#27343D",

    fontSize: 11,

    fontWeight: "900",

    marginTop: 3,
  },

  turnArea: {
    flex: 1,

    alignItems: "center",
  },

  turnText: {
    color: "#18242D",

    fontSize: 14,

    fontWeight: "900",

    textAlign: "center",
  },

  roundText: {
    color: "#7A8790",

    fontSize: 10,

    fontWeight: "700",

    marginTop: 4,
  },

  difficultyBox: {
    marginHorizontal: 20,

    marginTop: 10,

    paddingVertical: 7,

    paddingHorizontal: 10,

    borderRadius: 11,

    backgroundColor: "#EEF5EA",

    alignItems: "center",
  },

  difficultyText: {
    color: "#53635A",

    fontSize: 10,

    fontWeight: "700",

    textAlign: "center",
  },

  boardWrapper: {
    flex: 1,

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 8,
  },

  board: {
    width: "96%",

    maxWidth: 430,

    aspectRatio: 1,

    flexDirection: "row",

    flexWrap: "wrap",

    backgroundColor: "#8B5A2B",

    borderWidth: 4,

    borderColor: "#5D3A1A",

    borderRadius: 6,

    overflow: "hidden",

    elevation: 8,
  },

  square: {
    width: "12.5%",

    height: "12.5%",

    alignItems: "center",

    justifyContent: "center",

    position: "relative",
  },

  lightSquare: {
    backgroundColor: "#F0D9B5",
  },

  darkSquare: {
    backgroundColor: "#B58863",
  },

  selectedSquare: {
    backgroundColor: "#F6D365",
  },

  lastMoveSquare: {
    backgroundColor: "#D9C35A",
  },

  checkSquare: {
    backgroundColor: "#E85D5D",
  },

  animatedPieceCell: {
    position: "absolute",
    zIndex: 20,
    elevation: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pieceText: {
    fontSize: 33,

    lineHeight: 40,

    textAlign: "center",
  },

  whitePiece: {
    color: "#FFFFFF",

    textShadowColor: "#000",

    textShadowOffset: {
      width: 1,

      height: 1,
    },

    textShadowRadius: 2,
  },

  blackPiece: {
    color: "#171717",
  },

  moveDot: {
    width: 11,

    height: 11,

    borderRadius: 6,

    backgroundColor: "rgba(24,36,45,0.45)",
  },

  captureRing: {
    position: "absolute",

    width: "78%",

    height: "78%",

    borderRadius: 100,

    borderWidth: 4,

    borderColor: "rgba(232,93,4,0.75)",
  },

  rankLabel: {
    position: "absolute",

    right: 2,

    top: 1,

    fontSize: 7,

    fontWeight: "900",

    color: "rgba(0,0,0,0.45)",
  },

  fileLabel: {
    position: "absolute",

    left: 2,

    bottom: 1,

    fontSize: 7,

    fontWeight: "900",

    color: "rgba(0,0,0,0.45)",
  },

  bottomArea: {
    paddingHorizontal: 18,

    paddingBottom: 18,

    alignItems: "center",
  },

  bottomHint: {
    color: "#34434D",

    fontSize: 12,

    fontWeight: "800",

    textAlign: "center",
  },

  bottomStats: {
    color: "#89949B",

    fontSize: 10,

    fontWeight: "700",

    marginTop: 5,
  },

  completedScreen: {
    flex: 1,

    backgroundColor: "#DFF7D8",

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 22,
  },

  completedCard: {
    width: "88%",

    maxWidth: 400,

    backgroundColor: "#FFFFFF",

    borderRadius: 24,

    paddingHorizontal: 22,

    paddingVertical: 28,

    alignItems: "center",

    elevation: 8,

    shadowColor: "#000",

    shadowOffset: {
      width: 0,

      height: 6,
    },

    shadowOpacity: 0.2,

    shadowRadius: 10,
  },

  completedEmoji: {
    fontSize: 55,

    marginBottom: 6,
  },

  completedTitle: {
    color: "#18242D",

    fontSize: 27,

    fontWeight: "900",

    textAlign: "center",
  },

  completedSubtitle: {
    color: "#77838A",

    fontSize: 11,

    fontWeight: "800",

    marginTop: 5,
  },

  scoreBox: {
    width: "100%",

    backgroundColor: "#F4F8EC",

    borderRadius: 14,

    paddingVertical: 12,

    marginTop: 20,

    alignItems: "center",
  },

  scoreText: {
    color: "#27343D",

    fontSize: 16,

    fontWeight: "900",
  },

  statsText: {
    color: "#7A8790",

    fontSize: 11,

    fontWeight: "700",

    marginTop: 4,
  },

  promotionOverlay: {
    position: "absolute",

    top: 0,

    left: 0,

    right: 0,

    bottom: 0,

    backgroundColor: "rgba(0,0,0,0.45)",

    alignItems: "center",

    justifyContent: "center",

    zIndex: 100,

    elevation: 100,
  },

  promotionCard: {
    width: "82%",

    maxWidth: 350,

    backgroundColor: "#FFFFFF",

    borderRadius: 22,

    padding: 24,

    alignItems: "center",
  },

  promotionTitle: {
    color: "#18242D",

    fontSize: 20,

    fontWeight: "900",
  },

  promotionInfo: {
    color: "#71808A",

    fontSize: 13,

    fontWeight: "600",

    marginTop: 5,
  },

  promotionOptions: {
    flexDirection: "row",

    gap: 10,

    marginTop: 20,
  },

  promotionButton: {
    width: 58,

    height: 58,

    borderRadius: 15,

    backgroundColor: "#F0D9B5",

    alignItems: "center",

    justifyContent: "center",
  },

  promotionPiece: {
    fontSize: 38,

    color: "#171717",
  },
});
