import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { getAllProgress, saveGameProgress } from "../../src/services/storage";
type GameState = "ready" | "playing" | "completed";
type CellValue = number | null;
type Board = CellValue[][];
const SIZE = 9;
const BOX_SIZE = 3;
const MAX_MISTAKES = 3;
const EMPTY_BOARD: Board = Array.from({ length: SIZE }, () =>
  Array(SIZE).fill(null),
);
/*
 * ==========================================================
 * SUDOKU GENERATOR
 * ==========================================================
 */
function shuffleNumbers(values: number[]): number[] {
  return [...values].sort(() => Math.random() - 0.5);
}
function isSafe(
  board: number[][],
  row: number,
  col: number,
  value: number,
): boolean {
  for (let x = 0; x < SIZE; x++) {
    if (board[row][x] === value) {
      return false;
    }
    if (board[x][col] === value) {
      return false;
    }
  }
  const startRow = row - (row % BOX_SIZE);
  const startCol = col - (col % BOX_SIZE);
  for (let r = 0; r < BOX_SIZE; r++) {
    for (let c = 0; c < BOX_SIZE; c++) {
      if (board[startRow + r][startCol + c] === value) {
        return false;
      }
    }
  }
  return true;
}
function fillBoard(board: number[][]): boolean {
  let row = -1;
  let col = -1;
  let foundEmpty = false;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) {
        row = r;
        col = c;
        foundEmpty = true;
        break;
      }
    }
    if (foundEmpty) {
      break;
    }
  }
  if (!foundEmpty) {
    return true;
  }
  const numbers = shuffleNumbers([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const number of numbers) {
    if (isSafe(board, row, col, number)) {
      board[row][col] = number;
      if (fillBoard(board)) {
        return true;
      }
      board[row][col] = 0;
    }
  }
  return false;
}
function generateSolvedBoard(): number[][] {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  fillBoard(board);
  return board;
}
function createPuzzle(solved: number[][]): Board {
  const puzzle: Board = solved.map((row) => [...row]);
  const positions: Array<{
    row: number;
    col: number;
  }> = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      positions.push({
        row,
        col,
      });
    }
  }
  const shuffled = shufflePositions(positions);
  let removed = 0;
  for (const position of shuffled) {
    if (removed >= 45) {
      break;
    }
    const row = position.row;
    const col = position.col;
    const backup = puzzle[row][col];
    puzzle[row][col] = null;
    if (countFilled(puzzle) < 36) {
      puzzle[row][col] = backup;
      continue;
    }
    removed++;
  }
  return puzzle;
}
function shufflePositions<T>(values: T[]): T[] {
  return [...values].sort(() => Math.random() - 0.5);
}
function countFilled(board: Board): number {
  return board.reduce(
    (total, row) => total + row.filter((value) => value !== null).length,
    0,
  );
}
function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}
function boardsEqual(first: Board, second: number[][]): boolean {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (first[row][col] !== second[row][col]) {
        return false;
      }
    }
  }
  return true;
}
/*
 * ==========================================================
 * MAIN GAME
 * ==========================================================
 */
export default function SudokuClassicGame() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 28, 390);
  const cellSize = boardSize / 9;
  const [gameState, setGameState] = useState<GameState>("ready");
  const [solution, setSolution] = useState<number[][]>([]);
  const [puzzle, setPuzzle] = useState<Board>(EMPTY_BOARD);
  const [board, setBoard] = useState<Board>(EMPTY_BOARD);
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [hints, setHints] = useState(3);
  const [seconds, setSeconds] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [message, setMessage] = useState("Select a cell and enter a number.");

  useEffect(() => {
    getAllProgress()
      .then((allProgress) => {
        setBestScore(allProgress["sudoku-classic"].highScore);
      })
      .catch((error) => {
        console.warn("Unable to load Sudoku progress:", error);
      });
  }, []);
  /*
   * ========================================================
   * START GAME
   * ========================================================
   */
  const startGame = useCallback(() => {
    const newSolution = generateSolvedBoard();
    const newPuzzle = createPuzzle(newSolution);
    setSolution(newSolution);
    setPuzzle(newPuzzle);
    setBoard(cloneBoard(newPuzzle));
    setSelectedCell(null);
    setMistakes(0);
    setHints(3);
    setSeconds(0);
    setScore(1000);
    setMessage("Select a cell and enter a number.");
    setGameState("playing");
  }, []);
  /*
   * ========================================================
   * TIMER
   * ========================================================
   */
  useEffect(() => {
    if (gameState !== "playing") {
      return;
    }
    const timer = setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [gameState]);
  /*
   * ========================================================
   * FORMAT TIME
   * ========================================================
   */
  const formattedTime = useMemo(() => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(
      2,
      "0",
    )}`;
  }, [seconds]);
  /*
   * ========================================================
   * SELECT CELL
   * ========================================================
   */
  const selectCell = useCallback(
    (row: number, col: number) => {
      if (gameState !== "playing") {
        return;
      }
      /*
       * Original clue cannot be
       * edited.
       */
      if (puzzle[row][col] !== null) {
        setSelectedCell({
          row,
          col,
        });
        setMessage("This is a fixed clue.");
        return;
      }
      setSelectedCell({
        row,
        col,
      });
      setMessage("Choose a number.");
    },
    [gameState, puzzle],
  );
  /*
   * ========================================================
   * CHECK COMPLETE
   * ========================================================
   */
  const checkComplete = useCallback(
    (updatedBoard: Board, currentScore = score) => {
      if (boardsEqual(updatedBoard, solution)) {
        const timeBonus = Math.max(0, 500 - seconds * 2);
        const mistakePenalty = mistakes * 50;
        const finalScore = Math.max(
          100,
          currentScore + timeBonus - mistakePenalty,
        );
        setScore(finalScore);
        setBestScore((previous) => Math.max(previous, finalScore));
        setGameState("completed");
        setMessage("Sudoku completed!");

        const earnedStars = finalScore >= 1400 ? 3 : finalScore >= 1000 ? 2 : 1;
        getAllProgress()
          .then(async (allProgress) => {
            const previous = allProgress["sudoku-classic"];
            await saveGameProgress("sudoku-classic", {
              ...previous,
              highScore: Math.max(previous.highScore, finalScore),
              currentLevel: previous.currentLevel + 1,
              unlockedLevels: Math.max(
                previous.unlockedLevels,
                previous.currentLevel + 2,
              ),
              stars: Math.max(previous.stars, earnedStars),
            });
          })
          .catch((error) => {
            console.warn("Unable to save Sudoku progress:", error);
          });

        return true;
      }
      return false;
    },
    [mistakes, score, seconds, solution],
  );
  /*
   * ========================================================
   * ENTER NUMBER
   * ========================================================
   */
  const enterNumber = useCallback(
    (number: number) => {
      if (gameState !== "playing") {
        return;
      }
      if (!selectedCell) {
        setMessage("Select an empty cell first.");
        return;
      }
      const { row, col } = selectedCell;
      /*
       * Fixed clue.
       */
      if (puzzle[row][col] !== null) {
        setMessage("You cannot change a fixed clue.");
        return;
      }
      /*
       * Correct answer.
       */
      if (solution[row][col] === number) {
        const updatedBoard = cloneBoard(board);
        updatedBoard[row][col] = number;
        setBoard(updatedBoard);
        setScore((current) => current + 20);
        setMessage("✓ Correct!");
        const completed = checkComplete(updatedBoard, score + 20);
        if (!completed) {
          setSelectedCell(null);
        }
        return;
      }
      /*
       * Wrong answer.
       */
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      setScore((current) => Math.max(0, current - 30));
      if (newMistakes >= MAX_MISTAKES) {
        setMessage("3 mistakes! Try the puzzle again.");
        /*
         * Give the player a short
         * penalty state, then reset
         * mistakes so the game remains
         * playable.
         */
        setTimeout(() => {
          setMistakes(0);
          setMessage("Mistakes reset. Keep solving!");
        }, 900);
        return;
      }
      setMessage(
        `✗ Wrong number. ${MAX_MISTAKES - newMistakes} mistakes left.`,
      );
    },
    [board, checkComplete, gameState, mistakes, puzzle, selectedCell, solution],
  );
  /*
   * ========================================================
   * ERASE
   * ========================================================
   */
  const eraseNumber = useCallback(() => {
    if (gameState !== "playing") {
      return;
    }
    if (!selectedCell) {
      return;
    }
    const { row, col } = selectedCell;
    if (puzzle[row][col] !== null) {
      setMessage("Fixed clues cannot be erased.");
      return;
    }
    if (board[row][col] === null) {
      return;
    }
    const updatedBoard = cloneBoard(board);
    updatedBoard[row][col] = null;
    setBoard(updatedBoard);
    setMessage("Number erased.");
  }, [board, gameState, puzzle, selectedCell]);
  /*
   * ========================================================
   * HINT
   * ========================================================
   */
  const useHint = useCallback(() => {
    if (gameState !== "playing") {
      return;
    }
    if (hints <= 0) {
      setMessage("No hints remaining.");
      return;
    }
    let target = selectedCell;
    /*
     * If no cell is selected,
     * find an empty cell.
     */
    if (!target || puzzle[target.row][target.col] !== null) {
      const emptyCells: Array<{
        row: number;
        col: number;
      }> = [];
      for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {
          if (board[row][col] === null) {
            emptyCells.push({
              row,
              col,
            });
          }
        }
      }
      if (emptyCells.length === 0) {
        return;
      }
      target = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }
    const { row, col } = target;
    const updatedBoard = cloneBoard(board);
    updatedBoard[row][col] = solution[row][col];
    setBoard(updatedBoard);
    setHints((current) => current - 1);
    setScore((current) => Math.max(0, current - 50));
    setSelectedCell(null);
    setMessage("💡 Hint used!");
    checkComplete(updatedBoard, Math.max(0, score - 50));
  }, [
    board,
    checkComplete,
    gameState,
    hints,
    puzzle,
    score,
    selectedCell,
    solution,
  ]);
  /*
   * ========================================================
   * CELL COLORS
   * ========================================================
   */
  const getCellBackground = (row: number, col: number) => {
    if (!selectedCell) {
      return "#FFFFFF";
    }
    const sameRow = selectedCell.row === row;
    const sameColumn = selectedCell.col === col;
    const sameBox =
      Math.floor(selectedCell.row / 3) === Math.floor(row / 3) &&
      Math.floor(selectedCell.col / 3) === Math.floor(col / 3);
    const sameNumber =
      selectedCell &&
      board[selectedCell.row][selectedCell.col] !== null &&
      board[selectedCell.row][selectedCell.col] === board[row][col];
    if (selectedCell.row === row && selectedCell.col === col) {
      return "#BDEFCF";
    }
    if (sameNumber) {
      return "#CFEFDC";
    }
    if (sameRow || sameColumn || sameBox) {
      return "#EEF7EF";
    }
    return "#FFFFFF";
  };
  /*
   * ========================================================
   * COMPLETED
   * ========================================================
   */
  if (gameState === "completed") {
    return (
      <View style={styles.completedScreen}>
        <StatusBar hidden />
        <Text style={styles.completedIcon}>🧩</Text>
        <Text style={styles.completedTitle}>SUDOKU COMPLETE!</Text>
        <Text style={styles.completedScore}>{score}</Text>
        <Text style={styles.completedScoreLabel}>POINTS</Text>
        <View style={styles.resultCard}>
          <View style={styles.resultItem}>
            <Text style={styles.resultValue}>{formattedTime}</Text>
            <Text style={styles.resultLabel}>TIME</Text>
          </View>
          <View style={styles.resultDivider} />
          <View style={styles.resultItem}>
            <Text style={styles.resultValue}>{mistakes}</Text>
            <Text style={styles.resultLabel}>MISTAKES</Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.completedButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => {
            setGameState("ready");
          }}
        >
          <Text style={styles.completedButtonText}>PLAY AGAIN</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.completedBackButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.completedBackText}>TRY ANOTHER GAME</Text>
        </Pressable>
      </View>
    );
  }
  /*
   * ========================================================
   * READY
   * ========================================================
   */
  if (gameState === "ready") {
    return (
      <View style={styles.readyBackground}>
        <StatusBar hidden />
        <Pressable
          style={({ pressed }) => [
            styles.settingsButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => {}}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
        <ScrollView
          contentContainerStyle={styles.readyScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.readyCard}>
            <Text style={styles.readyIcon}>🧩</Text>
            <Text style={styles.readyTitle}>SUDOKU</Text>
            <Text style={styles.readyHeading}>Ready to solve?</Text>
            <Text style={styles.readyDescription}>
              Fill every row, column and 3×3 box with numbers 1 to 9. Every
              number can appear only once in each group.
            </Text>
            <View style={styles.rulesCard}>
              <View style={styles.ruleRow}>
                <Text style={styles.ruleEmoji}>🔢</Text>
                <Text style={styles.ruleText}>Fill the grid with 1 to 9</Text>
              </View>
              <View style={styles.ruleRow}>
                <Text style={styles.ruleEmoji}>↔️</Text>
                <Text style={styles.ruleText}>
                  No repeated number in a row or column
                </Text>
              </View>
              <View style={styles.ruleRow}>
                <Text style={styles.ruleEmoji}>◻️</Text>
                <Text style={styles.ruleText}>Keep every 3×3 box unique</Text>
              </View>
              <View style={styles.ruleRow}>
                <Text style={styles.ruleEmoji}>💡</Text>
                <Text style={styles.ruleText}>
                  Use 3 hints if you get stuck
                </Text>
              </View>
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
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>BACK TO GAMES</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }
  /*
   * ========================================================
   * GAMEPLAY
   * ========================================================
   */
  return (
    <View style={styles.gameScreen}>
      <StatusBar hidden />
      {/* HEADER */}
      <View style={styles.gameHeader}>
        <Pressable style={styles.headerBack} onPress={() => router.back()}>
          <Text style={styles.headerBackText}>‹</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>SUDOKU CLASSIC</Text>
          <Text style={styles.headerTimer}>⏱ {formattedTime}</Text>
        </View>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreBadgeText}>{score}</Text>
        </View>
      </View>
      {/* STATUS */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>MISTAKES</Text>
          <View style={styles.mistakeDots}>
            {Array.from(
              {
                length: MAX_MISTAKES,
              },
              (_, index) => (
                <View
                  key={index}
                  style={[
                    styles.mistakeDot,
                    {
                      backgroundColor: index < mistakes ? "#E85D5D" : "#DCE5D9",
                    },
                  ]}
                />
              ),
            )}
          </View>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>HINTS</Text>
          <Text style={styles.hintValue}>💡 {hints}</Text>
        </View>
      </View>
      {/* MESSAGE */}
      <View style={styles.messageBar}>
        <Text style={styles.messageText}>{message}</Text>
      </View>
      {/* SUDOKU BOARD */}
      <View
        style={[
          styles.sudokuBoard,
          {
            width: boardSize,
            height: boardSize,
          },
        ]}
      >
        {board.map((row, rowIndex) =>
          row.map((value, colIndex) => {
            const fixed = puzzle[rowIndex][colIndex] !== null;
            const selected =
              selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
            return (
              <Pressable
                key={`${rowIndex}-${colIndex}`}
                onPress={() => selectCell(rowIndex, colIndex)}
                style={[
                  styles.sudokuCell,
                  {
                    width: cellSize,
                    height: cellSize,
                    left: colIndex * cellSize,
                    top: rowIndex * cellSize,
                    backgroundColor: getCellBackground(rowIndex, colIndex),
                  },
                  rowIndex % 3 === 0 && styles.boxTopBorder,
                  colIndex % 3 === 0 && styles.boxLeftBorder,
                  rowIndex === 8 && styles.boxBottomBorder,
                  colIndex === 8 && styles.boxRightBorder,
                  selected && styles.selectedCell,
                ]}
              >
                {value !== null && (
                  <Text
                    style={[
                      styles.cellNumber,
                      {
                        fontSize: cellSize * 0.48,
                      },
                      fixed && styles.fixedNumber,
                      !fixed && styles.userNumber,
                    ]}
                  >
                    {value}
                  </Text>
                )}
              </Pressable>
            );
          }),
        )}
      </View>
      {/* NUMBER PAD */}
      <View style={styles.numberPad}>
        <View style={styles.numberRow}>
          {[1, 2, 3, 4, 5].map((number) => (
            <Pressable
              key={number}
              style={({ pressed }) => [
                styles.numberButton,
                pressed && styles.numberButtonPressed,
              ]}
              onPress={() => enterNumber(number)}
            >
              <Text style={styles.numberButtonText}>{number}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.numberRow}>
          {[6, 7, 8, 9].map((number) => (
            <Pressable
              key={number}
              style={({ pressed }) => [
                styles.numberButton,
                pressed && styles.numberButtonPressed,
              ]}
              onPress={() => enterNumber(number)}
            >
              <Text style={styles.numberButtonText}>{number}</Text>
            </Pressable>
          ))}
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.numberButtonPressed,
            ]}
            onPress={eraseNumber}
          >
            <Text style={styles.actionButtonText}>⌫</Text>
          </Pressable>
        </View>
        <View style={styles.bottomActions}>
          <Pressable
            style={({ pressed }) => [
              styles.hintButton,
              pressed && styles.numberButtonPressed,
            ]}
            onPress={useHint}
          >
            <Text style={styles.hintButtonText}>💡 HINT ({hints})</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.clearButton,
              pressed && styles.numberButtonPressed,
            ]}
            onPress={() => setSelectedCell(null)}
          >
            <Text style={styles.clearButtonText}>CLEAR</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
/*
 * ==========================================================
 * STYLES
 * ==========================================================
 */
const styles = StyleSheet.create({
  /*
   * ========================================================
   * READY
   * ========================================================
   */
  readyBackground: {
    flex: 1,
    backgroundColor: "#DFF7D8",
  },
  readyScrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 85,
    paddingBottom: 45,
  },
  settingsButton: {
    position: "absolute",
    top: 105,
    right: 28,
    width: 58,
    height: 58,
    borderRadius: 30,
    backgroundColor: "#B9C7B7",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 5,
  },
  settingsIcon: {
    fontSize: 31,
    color: "#F7FFF4",
  },
  readyCard: {
    width: "100%",
    maxWidth: 650,
    backgroundColor: "#FFFFFF",
    borderRadius: 34,
    paddingHorizontal: 46,
    paddingTop: 48,
    paddingBottom: 34,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 9,
  },
  readyIcon: {
    fontSize: 76,
    marginBottom: 8,
  },
  readyTitle: {
    color: "#25202D",
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
  },
  readyHeading: {
    color: "#25202D",
    fontSize: 31,
    fontWeight: "900",
    marginTop: 16,
    textAlign: "center",
  },
  readyDescription: {
    color: "#68717A",
    fontSize: 17,
    lineHeight: 26,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 520,
  },
  rulesCard: {
    width: "100%",
    backgroundColor: "#F4F7EA",
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 14,
    marginTop: 24,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 46,
  },
  ruleEmoji: {
    width: 38,
    fontSize: 23,
    textAlign: "center",
    marginRight: 10,
  },
  ruleText: {
    flex: 1,
    color: "#36404A",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
  },
  startButton: {
    width: "100%",
    height: 66,
    borderRadius: 20,
    backgroundColor: "#19A950",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 1,
  },
  backButton: {
    width: "100%",
    height: 66,
    borderRadius: 20,
    backgroundColor: "#F4F7EA",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  backButtonText: {
    color: "#199A4A",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  buttonPressed: {
    opacity: 0.78,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },
  /*
   * ========================================================
   * GAME HEADER
   * ========================================================
   */
  gameScreen: {
    flex: 1,
    backgroundColor: "#F7FAF4",
    alignItems: "center",
  },
  gameHeader: {
    width: "100%",
    height: 92,
    backgroundColor: "#18242D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 30,
    paddingBottom: 10,
  },
  headerBack: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBackText: {
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 34,
    marginTop: -3,
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  headerTimer: {
    color: "#B9C9BD",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  scoreBadge: {
    minWidth: 48,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
  },
  scoreBadgeText: {
    color: "#18242D",
    fontSize: 15,
    fontWeight: "900",
  },
  /*
   * ========================================================
   * STATUS
   * ========================================================
   */
  statusBar: {
    width: "100%",
    height: 45,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusLabel: {
    color: "#68717A",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginRight: 8,
  },
  mistakeDots: {
    flexDirection: "row",
    gap: 5,
  },
  mistakeDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  hintValue: {
    color: "#19A950",
    fontSize: 12,
    fontWeight: "900",
  },
  /*
   * ========================================================
   * MESSAGE
   * ========================================================
   */
  messageBar: {
    minHeight: 25,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  messageText: {
    color: "#536258",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  /*
   * ========================================================
   * SUDOKU BOARD
   * ========================================================
   */
  sudokuBoard: {
    position: "relative",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#18242D",
    borderRadius: 5,
    overflow: "hidden",
    marginTop: 5,
  },
  sudokuCell: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#C8D4C9",
  },
  boxTopBorder: {
    borderTopWidth: 2,
    borderTopColor: "#18242D",
  },
  boxLeftBorder: {
    borderLeftWidth: 2,
    borderLeftColor: "#18242D",
  },
  boxBottomBorder: {
    borderBottomWidth: 2,
    borderBottomColor: "#18242D",
  },
  boxRightBorder: {
    borderRightWidth: 2,
    borderRightColor: "#18242D",
  },
  selectedCell: {
    borderColor: "#19A950",
    borderWidth: 2,
  },
  cellNumber: {
    fontWeight: "800",
  },
  fixedNumber: {
    color: "#18242D",
  },
  userNumber: {
    color: "#19A950",
  },
  /*
   * ========================================================
   * NUMBER PAD
   * ========================================================
   */
  numberPad: {
    width: "100%",
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 7,
  },
  numberRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
    marginBottom: 7,
  },
  numberButton: {
    width: 49,
    height: 43,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(36,28,42,0.1)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    elevation: 1,
  },
  numberButtonPressed: {
    opacity: 0.7,
    transform: [
      {
        scale: 0.95,
      },
    ],
  },
  numberButtonText: {
    color: "#18242D",
    fontSize: 19,
    fontWeight: "900",
  },
  actionButton: {
    width: 49,
    height: 43,
    borderRadius: 12,
    backgroundColor: "#F4F7EA",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#536258",
    fontSize: 21,
    fontWeight: "900",
  },
  bottomActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  hintButton: {
    height: 42,
    flex: 1,
    maxWidth: 180,
    borderRadius: 12,
    backgroundColor: "#E5F6E8",
    alignItems: "center",
    justifyContent: "center",
  },
  hintButtonText: {
    color: "#199A4A",
    fontSize: 11,
    fontWeight: "900",
  },
  clearButton: {
    height: 42,
    flex: 1,
    maxWidth: 130,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(36,28,42,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  clearButtonText: {
    color: "#536258",
    fontSize: 11,
    fontWeight: "900",
  },
  /*
   * ========================================================
   * COMPLETED
   * ========================================================
   */
  completedScreen: {
    flex: 1,
    backgroundColor: "#DFF7D8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 25,
  },
  completedIcon: {
    fontSize: 72,
  },
  completedTitle: {
    color: "#18242D",
    fontSize: 29,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 10,
  },
  completedScore: {
    color: "#19A950",
    fontSize: 58,
    fontWeight: "900",
    marginTop: 8,
  },
  completedScoreLabel: {
    color: "#68756A",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
  },
  resultCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    paddingVertical: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 4,
  },
  resultItem: {
    flex: 1,
    alignItems: "center",
  },
  resultValue: {
    color: "#25202D",
    fontSize: 22,
    fontWeight: "900",
  },
  resultLabel: {
    color: "#68717A",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 3,
  },
  resultDivider: {
    width: 1,
    height: 38,
    backgroundColor: "#DCE5D9",
  },
  completedButton: {
    width: "100%",
    maxWidth: 350,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#19A950",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
  },
  completedButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  completedBackButton: {
    width: "100%",
    maxWidth: 350,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#F4F7EA",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 11,
  },
  completedBackText: {
    color: "#199A4A",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
