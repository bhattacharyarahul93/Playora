import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { getAllProgress, saveGameProgress } from "../../src/services/storage";
type SymbolType = "X" | "O";
type GameState = "ready" | "playing" | "completed";
type Difficulty = "EASY" | "MEDIUM" | "HARD";
type Cell = SymbolType | null;
type Board = Cell[];
type GameResult = {
  winner: SymbolType | null;
  line: number[];
};
const EMPTY_BOARD: Board = Array(9).fill(null);
const WINNING_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
const DIFFICULTIES: Difficulty[] = ["EASY", "MEDIUM", "HARD"];
const getOpponent = (symbol: SymbolType): SymbolType =>
  symbol === "X" ? "O" : "X";
const checkWinner = (board: Board): GameResult => {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return {
        winner: board[a],
        line,
      };
    }
  }
  if (board.every(Boolean)) {
    return {
      winner: null,
      line: [],
    };
  }
  return {
    winner: null,
    line: [],
  };
};
const getEmptyCells = (board: Board): number[] =>
  board
    .map((cell, index) => (cell === null ? index : -1))
    .filter((index) => index !== -1);
const findWinningMove = (board: Board, symbol: SymbolType): number | null => {
  const emptyCells = getEmptyCells(board);
  for (const index of emptyCells) {
    const testBoard = [...board];
    testBoard[index] = symbol;
    const result = checkWinner(testBoard);
    if (result.winner === symbol) {
      return index;
    }
  }
  return null;
};
const getRandomMove = (board: Board): number | null => {
  const emptyCells = getEmptyCells(board);
  if (emptyCells.length === 0) {
    return null;
  }
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
};
const getEasyMove = (
  board: Board,
  computerSymbol: SymbolType,
  playerSymbol: SymbolType,
): number | null => {
  const emptyCells = getEmptyCells(board);
  if (emptyCells.length === 0) {
    return null;
  }
  /*
   * EASY
   *
   * Still beatable, but no longer too weak.
   *
   * 1. Always take an immediate winning move.
   * 2. 60% chance to block the player.
   * 3. Prefer center/corners.
   * 4. Occasionally make a random move.
   */
  const winningMove = findWinningMove(board, computerSymbol);
  if (winningMove !== null) {
    return winningMove;
  }
  const blockingMove = findWinningMove(board, playerSymbol);
  if (blockingMove !== null && Math.random() < 0.6) {
    return blockingMove;
  }
  // Prefer center
  if (emptyCells.includes(4) && Math.random() < 0.65) {
    return 4;
  }
  // Prefer corners
  const corners = [0, 2, 6, 8].filter((index) => emptyCells.includes(index));
  if (corners.length > 0 && Math.random() < 0.65) {
    return corners[Math.floor(Math.random() * corners.length)];
  }
  return getRandomMove(board);
};
const getMediumMove = (
  board: Board,
  computerSymbol: SymbolType,
  playerSymbol: SymbolType,
): number | null => {
  const emptyCells = getEmptyCells(board);
  if (emptyCells.length === 0) {
    return null;
  }
  /*
   * MEDIUM
   *
   * Much stronger than Easy:
   *
   * 1. Always win when possible.
   * 2. Block the player almost every time.
   * 3. Strong center preference.
   * 4. Strong corner preference.
   * 5. Small chance of making a mistake.
   */
  // Always take a winning move
  const winningMove = findWinningMove(board, computerSymbol);
  if (winningMove !== null) {
    return winningMove;
  }
  // Usually block the player
  const blockingMove = findWinningMove(board, playerSymbol);
  if (blockingMove !== null && Math.random() < 0.9) {
    return blockingMove;
  }
  // Take center when available
  if (emptyCells.includes(4)) {
    return 4;
  }
  // Prefer opposite corner / corners
  const corners = [0, 2, 6, 8].filter((index) => emptyCells.includes(index));
  if (corners.length > 0) {
    return corners[Math.floor(Math.random() * corners.length)];
  }
  // Take any remaining move
  return getRandomMove(board);
};
const minimax = (
  board: Board,
  maximizing: boolean,
  computerSymbol: SymbolType,
  playerSymbol: SymbolType,
): number => {
  const result = checkWinner(board);
  if (result.winner === computerSymbol) {
    return 10;
  }
  if (result.winner === playerSymbol) {
    return -10;
  }
  if (board.every(Boolean)) {
    return 0;
  }
  const emptyCells = getEmptyCells(board);
  if (maximizing) {
    let bestScore = -Infinity;
    for (const index of emptyCells) {
      const nextBoard = [...board];
      nextBoard[index] = computerSymbol;
      const score = minimax(nextBoard, false, computerSymbol, playerSymbol);
      bestScore = Math.max(bestScore, score);
    }
    return bestScore;
  }
  let bestScore = Infinity;
  for (const index of emptyCells) {
    const nextBoard = [...board];
    nextBoard[index] = playerSymbol;
    const score = minimax(nextBoard, true, computerSymbol, playerSymbol);
    bestScore = Math.min(bestScore, score);
  }
  return bestScore;
};
const getHardMove = (
  board: Board,
  computerSymbol: SymbolType,
  playerSymbol: SymbolType,
): number | null => {
  const emptyCells = getEmptyCells(board);
  if (emptyCells.length === 0) {
    return null;
  }
  let bestScore = -Infinity;
  let bestMoves: number[] = [];
  for (const index of emptyCells) {
    const nextBoard = [...board];
    nextBoard[index] = computerSymbol;
    const score = minimax(nextBoard, false, computerSymbol, playerSymbol);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [index];
    } else if (score === bestScore) {
      bestMoves.push(index);
    }
  }
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
};
const getComputerMove = (
  board: Board,
  computerSymbol: SymbolType,
  playerSymbol: SymbolType,
  difficulty: Difficulty,
): number | null => {
  switch (difficulty) {
    case "EASY":
      return getEasyMove(board, computerSymbol, playerSymbol);
    case "MEDIUM":
      return getMediumMove(board, computerSymbol, playerSymbol);
    case "HARD":
      return getHardMove(board, computerSymbol, playerSymbol);
    default:
      return getEasyMove(board, computerSymbol, playerSymbol);
  }
};
const getDifficultyDescription = (difficulty: Difficulty): string => {
  switch (difficulty) {
    case "EASY":
      return "Computer makes mistakes. Good chance to win!";
    case "MEDIUM":
      return "Computer thinks ahead, but can still be beaten.";
    case "HARD":
      return "Computer plays much smarter. Good luck!";
    default:
      return "";
  }
};
function WinningLine({ line }: { line: number[] }) {
  if (line.length !== 3) {
    return null;
  }
  const key = [...line].sort((a, b) => a - b).join(",");
  let lineStyle: any = {};
  switch (key) {
    // Top row
    case "0,1,2":
      lineStyle = {
        left: "8%",
        top: "16.666%",
        width: "84%",
        height: 6,
        transform: [{ translateY: -3 }],
      };
      break;
    // Middle row
    case "3,4,5":
      lineStyle = {
        left: "8%",
        top: "50%",
        width: "84%",
        height: 6,
        transform: [{ translateY: -3 }],
      };
      break;
    // Bottom row
    case "6,7,8":
      lineStyle = {
        left: "8%",
        top: "83.333%",
        width: "84%",
        height: 6,
        transform: [{ translateY: -3 }],
      };
      break;
    // Left column
    case "0,3,6":
      lineStyle = {
        left: "16.666%",
        top: "8%",
        width: 6,
        height: "84%",
        transform: [{ translateX: -3 }],
      };
      break;
    // Middle column
    case "1,4,7":
      lineStyle = {
        left: "50%",
        top: "8%",
        width: 6,
        height: "84%",
        transform: [{ translateX: -3 }],
      };
      break;
    // Right column
    case "2,5,8":
      lineStyle = {
        left: "83.333%",
        top: "8%",
        width: 6,
        height: "84%",
        transform: [{ translateX: -3 }],
      };
      break;
    // Diagonal
    case "0,4,8":
      lineStyle = {
        left: "-9%",
        top: "49%",
        width: "118%",
        height: 6,
        transform: [{ rotate: "45deg" }],
      };
      break;
    // Reverse diagonal
    case "2,4,6":
      lineStyle = {
        left: "-9%",
        top: "49%",
        width: "118%",
        height: 6,
        transform: [{ rotate: "-45deg" }],
      };
      break;
    default:
      return null;
  }
  return <View pointerEvents="none" style={[styles.winLine, lineStyle]} />;
}
export default function TicTacToeScreen() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>("ready");
  const [board, setBoard] = useState<Board>(EMPTY_BOARD);
  const [playerSymbol, setPlayerSymbol] = useState<SymbolType>("X");
  const computerSymbol = getOpponent(playerSymbol);
  const [currentPlayer, setCurrentPlayer] = useState<SymbolType>("X");
  const [computerThinking, setComputerThinking] = useState(false);
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [pendingResult, setPendingResult] = useState<GameResult | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("EASY");
  const [roundNumber, setRoundNumber] = useState(0);
  const [score, setScore] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [draws, setDraws] = useState(0);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startGame = useCallback(() => {
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    const nextRound = roundNumber + 1;
    const nextDifficulty = DIFFICULTIES[(nextRound - 1) % DIFFICULTIES.length];
    const nextPlayerSymbol: SymbolType = nextRound % 2 === 1 ? "X" : "O";
    setRoundNumber(nextRound);
    setDifficulty(nextDifficulty);
    setPlayerSymbol(nextPlayerSymbol);
    setBoard([...EMPTY_BOARD]);
    setWinningLine([]);
    setPendingResult(null);
    setGameState("playing");
    setCurrentPlayer("X");
    if (nextPlayerSymbol === "O") {
      setComputerThinking(true);
    } else {
      setComputerThinking(false);
    }
  }, [roundNumber]);
  const prepareGame = useCallback(() => {
    setGameState("ready");
    setBoard([...EMPTY_BOARD]);
    setWinningLine([]);
    setPendingResult(null);
    setComputerThinking(false);
    setCurrentPlayer("X");
  }, []);
  useEffect(() => {
    return () => {
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }
    };
  }, []);
  const finishGame = useCallback(
    (result: GameResult) => {
      setGameState("completed");
      setPendingResult(null);
      setComputerThinking(false);
      const playerWon = result.winner === playerSymbol;
      const nextScore = playerWon ? score + 100 : score;
      if (result.winner === null) {
        setDraws((value) => value + 1);
      } else if (playerWon) {
        setWins((value) => value + 1);
        setScore(nextScore);
      } else {
        setLosses((value) => value + 1);
      }
      getAllProgress()
        .then(async (allProgress) => {
          const previous = allProgress["tic-tac-toe"];
          const earnedStars = playerWon ? 3 : result.winner === null ? 1 : 0;
          await saveGameProgress("tic-tac-toe", {
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
          console.warn("Unable to save Tic Tac Toe progress:", error);
        });
    },
    [playerSymbol, score],
  );
  /*
   * Wait before showing the result screen.
   *
   * This is important because otherwise React can immediately
   * replace the board and the user's final move is not visible.
   */
  useEffect(() => {
    if (!pendingResult) {
      return;
    }
    completionTimerRef.current = setTimeout(() => {
      finishGame(pendingResult);
      completionTimerRef.current = null;
    }, 850);
    return () => {
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
        completionTimerRef.current = null;
      }
    };
  }, [pendingResult, finishGame]);
  /*
   * COMPUTER TURN
   */
  useEffect(() => {
    if (gameState !== "playing") {
      return;
    }
    if (pendingResult) {
      return;
    }
    if (!computerThinking) {
      return;
    }
    if (currentPlayer !== computerSymbol) {
      return;
    }
    const timer = setTimeout(() => {
      setBoard((currentBoard) => {
        const move = getComputerMove(
          currentBoard,
          computerSymbol,
          playerSymbol,
          difficulty,
        );
        if (move === null) {
          return currentBoard;
        }
        const nextBoard = [...currentBoard];
        nextBoard[move] = computerSymbol;
        const result = checkWinner(nextBoard);
        /*
         * Update board first.
         *
         * If this is the final move, the board and winning
         * line are displayed before the result screen.
         */
        setWinningLine(result.line);
        if (result.winner !== null || nextBoard.every(Boolean)) {
          setPendingResult(result);
          return nextBoard;
        }
        setCurrentPlayer(playerSymbol);
        setComputerThinking(false);
        return nextBoard;
      });
    }, 500);
    return () => {
      clearTimeout(timer);
    };
  }, [
    gameState,
    pendingResult,
    computerThinking,
    currentPlayer,
    computerSymbol,
    playerSymbol,
    difficulty,
  ]);
  const handlePlayerMove = useCallback(
    (index: number) => {
      if (gameState !== "playing") {
        return;
      }
      if (pendingResult) {
        return;
      }
      if (computerThinking) {
        return;
      }
      if (currentPlayer !== playerSymbol) {
        return;
      }
      if (board[index] !== null) {
        return;
      }
      const nextBoard = [...board];
      nextBoard[index] = playerSymbol;
      setBoard(nextBoard);
      const result = checkWinner(nextBoard);
      setWinningLine(result.line);
      /*
       * Player's final move.
       */
      if (result.winner !== null || nextBoard.every(Boolean)) {
        setPendingResult(result);
        return;
      }
      setCurrentPlayer(computerSymbol);
      setComputerThinking(true);
    },
    [
      gameState,
      pendingResult,
      computerThinking,
      currentPlayer,
      playerSymbol,
      computerSymbol,
      board,
    ],
  );
  const turnText = useMemo(() => {
    if (pendingResult) {
      return "GAME OVER";
    }
    if (computerThinking) {
      return "Computer is thinking...";
    }
    if (currentPlayer === playerSymbol) {
      return `Your turn — ${playerSymbol}`;
    }
    return `Computer — ${computerSymbol}`;
  }, [
    pendingResult,
    computerThinking,
    currentPlayer,
    playerSymbol,
    computerSymbol,
  ]);
  const resultText = useMemo(() => {
    if (winningLine.length > 0) {
      const winner = board[winningLine[0]];
      if (winner === playerSymbol) {
        return "YOU WIN! 🎉";
      }
      return "COMPUTER WINS";
    }
    return "DRAW!";
  }, [winningLine, board, playerSymbol]);
  /*
   * READY SCREEN
   */
  if (gameState === "ready") {
    return (
      <View style={styles.readyScreen}>
        <View style={styles.readyCard}>
          <Text style={styles.readyEmoji}>❌⭕</Text>
          <Text style={styles.readyHeading}>Ready to play?</Text>
          <Text style={styles.readyInfo}>
            Beat the computer in Tic Tac Toe. Your X or O is randomly selected
            every round!
          </Text>
          <View style={styles.readyRules}>
            <Text style={styles.readyRule}>
              🎲 Your X/O is shuffled every round
            </Text>
            <Text style={styles.readyRule}>
              🧠 Computer difficulty changes each round
            </Text>
            <Text style={styles.readyRule}>🔁 Easy → Medium → Hard → Easy</Text>
            <Text style={styles.readyRule}>🏆 Three in a row wins</Text>
            <Text style={styles.readyRule}>⭐ Win = +100 points</Text>
          </View>
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
   * COMPLETED SCREEN
   */
  if (gameState === "completed") {
    return (
      <View style={styles.completedScreen}>
        <View style={styles.completedCard}>
          <Text style={styles.completedEmoji}>
            {winningLine.length > 0 && board[winningLine[0]] === playerSymbol
              ? "🏆"
              : winningLine.length === 0
                ? "🤝"
                : "🤖"}
          </Text>
          <Text style={styles.completedTitle}>{resultText}</Text>
          <Text style={styles.completedSubtitle}>
            Round {roundNumber} • {difficulty}
          </Text>
          <View style={styles.finalBoard}>
            {board.map((cell, index) => {
              const isWinningCell = winningLine.includes(index);
              return (
                <View
                  key={index}
                  style={[
                    styles.finalCell,
                    isWinningCell && styles.finalWinningCell,
                  ]}
                >
                  <Text
                    style={[
                      styles.finalCellText,
                      cell === "X" ? styles.xText : styles.oText,
                    ]}
                  >
                    {cell ?? ""}
                  </Text>
                </View>
              );
            })}
            <WinningLine line={winningLine} />
          </View>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreText}>⭐ Score: {score}</Text>
            <Text style={styles.statsText}>
              Wins {wins} • Losses {losses} • Draws {draws}
            </Text>
          </View>
          <View style={styles.symbolInfo}>
            <Text style={styles.symbolInfoText}>You: {playerSymbol}</Text>
            <Text style={styles.symbolInfoText}>
              Computer: {computerSymbol}
            </Text>
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
   * PLAYING SCREEN
   */
  return (
    <View style={styles.gameScreen}>
      <View style={styles.topBar}>
        <Pressable style={styles.topBackButton} onPress={prepareGame}>
          <Text style={styles.topBackText}>←</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>TIC TAC TOE</Text>
          <Text style={styles.headerDifficulty}>{difficulty}</Text>
        </View>
        <View style={styles.headerScore}>
          <Text style={styles.headerScoreText}>⭐ {score}</Text>
        </View>
      </View>
      <View style={styles.infoArea}>
        <View style={styles.symbolCard}>
          <Text style={styles.symbolLabel}>YOU</Text>
          <Text
            style={[
              styles.symbolValue,
              playerSymbol === "X" ? styles.xText : styles.oText,
            ]}
          >
            {playerSymbol}
          </Text>
        </View>
        <View style={styles.vsArea}>
          <Text style={styles.turnText}>{turnText}</Text>
          <Text style={styles.roundText}>Round {roundNumber}</Text>
        </View>
        <View style={styles.symbolCard}>
          <Text style={styles.symbolLabel}>COMPUTER</Text>
          <Text
            style={[
              styles.symbolValue,
              computerSymbol === "X" ? styles.xText : styles.oText,
            ]}
          >
            {computerSymbol}
          </Text>
        </View>
      </View>
      <View style={styles.difficultyBox}>
        <Text style={styles.difficultyText}>
          {getDifficultyDescription(difficulty)}
        </Text>
      </View>
      <View style={styles.boardWrapper}>
        <View style={styles.board}>
          {board.map((cell, index) => {
            const isWinningCell = winningLine.includes(index);
            return (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.cell,
                  isWinningCell && styles.winningCell,
                  pressed && cell === null && styles.cellPressed,
                ]}
                onPress={() => handlePlayerMove(index)}
                disabled={
                  cell !== null ||
                  computerThinking ||
                  currentPlayer !== playerSymbol ||
                  pendingResult !== null
                }
              >
                <Text
                  style={[
                    styles.cellText,
                    cell === "X" ? styles.xText : styles.oText,
                  ]}
                >
                  {cell ?? ""}
                </Text>
              </Pressable>
            );
          })}
          <WinningLine line={winningLine} />
        </View>
      </View>
      <View style={styles.bottomArea}>
        <Text style={styles.bottomHint}>
          {pendingResult ? resultText : "Get three symbols in a row to win!"}
        </Text>
        <Text style={styles.bottomStats}>
          Wins: {wins} • Losses: {losses} • Draws: {draws}
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  /*
   * READY SCREEN
   */
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
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  readyEmoji: {
    fontSize: 58,
    marginBottom: 8,
  },
  readyHeading: {
    fontSize: 29,
    fontWeight: "900",
    color: "#18242D",
    textAlign: "center",
    marginTop: 5,
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
    transform: [{ scale: 0.97 }],
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
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
  /*
   * PLAYING SCREEN
   */
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
    fontWeight: "700",
  },
  headerCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  headerDifficulty: {
    color: "#F4A261",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 3,
  },
  headerScore: {
    minWidth: 60,
    alignItems: "flex-end",
  },
  headerScoreText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  infoArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  symbolCard: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  symbolLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "#7A8790",
    letterSpacing: 0.6,
  },
  symbolValue: {
    fontSize: 28,
    fontWeight: "900",
    marginTop: 1,
  },
  vsArea: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  turnText: {
    color: "#18242D",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  roundText: {
    color: "#7A8790",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 5,
  },
  difficultyBox: {
    marginHorizontal: 22,
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#EEF5EA",
    alignItems: "center",
  },
  difficultyText: {
    color: "#53635A",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  boardWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  board: {
    width: "88%",
    maxWidth: 390,
    aspectRatio: 1,
    backgroundColor: "#18242D",
    borderRadius: 20,
    overflow: "hidden",
    flexDirection: "row",
    flexWrap: "wrap",
    position: "relative",
    elevation: 8,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  cell: {
    width: "33.3333%",
    height: "33.3333%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D7DEE3",
    alignItems: "center",
    justifyContent: "center",
  },
  cellPressed: {
    backgroundColor: "#F0F6F9",
  },
  winningCell: {
    backgroundColor: "#FFF1D6",
  },
  cellText: {
    fontSize: 55,
    fontWeight: "900",
  },
  xText: {
    color: "#E85D04",
  },
  oText: {
    color: "#277DA1",
  },
  /*
   * Winning line
   */
  winLine: {
    position: "absolute",
    backgroundColor: "#E85D04",
    borderRadius: 10,
    zIndex: 50,
    elevation: 50,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  bottomArea: {
    paddingHorizontal: 20,
    paddingBottom: 25,
    alignItems: "center",
  },
  bottomHint: {
    color: "#34434D",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  bottomStats: {
    color: "#89949B",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
  /*
   * COMPLETED SCREEN
   */
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
    paddingVertical: 24,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  completedEmoji: {
    fontSize: 52,
    marginBottom: 5,
  },
  completedTitle: {
    color: "#18242D",
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
  },
  completedSubtitle: {
    color: "#77838A",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  finalBoard: {
    width: 180,
    height: 180,
    backgroundColor: "#18242D",
    borderRadius: 15,
    overflow: "hidden",
    flexDirection: "row",
    flexWrap: "wrap",
    position: "relative",
    marginTop: 16,
  },
  finalCell: {
    width: "33.3333%",
    height: "33.3333%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7DEE3",
    alignItems: "center",
    justifyContent: "center",
  },
  finalWinningCell: {
    backgroundColor: "#FFF1D6",
  },
  finalCellText: {
    fontSize: 31,
    fontWeight: "900",
  },
  scoreBox: {
    width: "100%",
    backgroundColor: "#F4F8EC",
    borderRadius: 14,
    paddingVertical: 11,
    marginTop: 15,
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
  symbolInfo: {
    flexDirection: "row",
    gap: 25,
    marginTop: 11,
  },
  symbolInfoText: {
    color: "#68757D",
    fontSize: 11,
    fontWeight: "800",
  },
});
