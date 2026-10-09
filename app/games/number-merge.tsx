import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  PanResponder,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { getAllProgress, saveGameProgress } from "../../src/services/storage";

const SIZE = 6;
const CELL_GAP = 4;
const BEST_SCORE_KEY = "number-merge-best-score";

type Board = number[][];
type Direction = "left" | "right" | "up" | "down";

const COLORS: Record<
  number,
  { backgroundColor: string; color: string; borderColor: string }
> = {
  0: { backgroundColor: "#DCE4D7", color: "#DCE4D7", borderColor: "#DCE4D7" },
  2: { backgroundColor: "#FFF1D6", color: "#82613A", borderColor: "#FFE0A3" },
  4: { backgroundColor: "#FFE0B2", color: "#81501F", borderColor: "#FFC66F" },
  8: { backgroundColor: "#FFB66D", color: "#FFFFFF", borderColor: "#FF963D" },
  16: { backgroundColor: "#FF9366", color: "#FFFFFF", borderColor: "#FF7447" },
  32: { backgroundColor: "#FF737A", color: "#FFFFFF", borderColor: "#F84D5D" },
  64: { backgroundColor: "#F04F83", color: "#FFFFFF", borderColor: "#D93469" },
  128: { backgroundColor: "#B879F8", color: "#FFFFFF", borderColor: "#9C53E9" },
  256: { backgroundColor: "#9275FF", color: "#FFFFFF", borderColor: "#7555ED" },
  512: { backgroundColor: "#638BFF", color: "#FFFFFF", borderColor: "#4670EA" },
  1024: {
    backgroundColor: "#39BFE8",
    color: "#FFFFFF",
    borderColor: "#1CA2CE",
  },
  2048: {
    backgroundColor: "#35C98B",
    color: "#FFFFFF",
    borderColor: "#1EAA6F",
  },
};

function getTileStyle(value: number) {
  if (COLORS[value]) return COLORS[value];

  return value > 2048
    ? { backgroundColor: "#6B5CA5", color: "#FFFFFF", borderColor: "#51417F" }
    : COLORS[0];
}

function createEmptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function addRandomTile(board: Board): Board {
  const next = board.map((row) => [...row]);
  const empty: { row: number; col: number }[] = [];

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (next[row][col] === 0) empty.push({ row, col });
    }
  }

  if (empty.length === 0) return next;

  const position = empty[Math.floor(Math.random() * empty.length)];
  next[position.row][position.col] = Math.random() < 0.9 ? 2 : 4;

  return next;
}

function createBoard(): Board {
  return addRandomTile(addRandomTile(createEmptyBoard()));
}

function boardsEqual(a: Board, b: Board): boolean {
  return a.every((row, r) => row.every((value, c) => value === b[r][c]));
}

function moveLine(line: number[]) {
  const compacted = line.filter((value) => value !== 0);
  const result: number[] = [];
  let gained = 0;
  let i = 0;

  while (i < compacted.length) {
    if (i + 1 < compacted.length && compacted[i] === compacted[i + 1]) {
      const merged = compacted[i] * 2;
      result.push(merged);
      gained += merged;
      i += 2;
    } else {
      result.push(compacted[i]);
      i++;
    }
  }

  while (result.length < SIZE) result.push(0);

  return { line: result, gained };
}

function moveBoard(board: Board, direction: Direction) {
  const next = createEmptyBoard();
  let gained = 0;

  for (let index = 0; index < SIZE; index++) {
    let line: number[];

    if (direction === "left") {
      line = [...board[index]];
    } else if (direction === "right") {
      line = [...board[index]].reverse();
    } else if (direction === "up") {
      line = board.map((row) => row[index]);
    } else {
      line = board.map((row) => row[index]).reverse();
    }

    const result = moveLine(line);
    gained += result.gained;

    let finalLine = result.line;

    if (direction === "right" || direction === "down") {
      finalLine = [...finalLine].reverse();
    }

    for (let position = 0; position < SIZE; position++) {
      if (direction === "left" || direction === "right") {
        next[index][position] = finalLine[position];
      } else {
        next[position][index] = finalLine[position];
      }
    }
  }

  return { board: next, gained, changed: !boardsEqual(board, next) };
}

function hasMoves(board: Board): boolean {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] === 0) return true;

      if (col + 1 < SIZE && board[row][col] === board[row][col + 1]) {
        return true;
      }

      if (row + 1 < SIZE && board[row][col] === board[row + 1][col]) {
        return true;
      }
    }
  }

  return false;
}

export default function NumberMerge() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const [board, setBoard] = useState<Board>(createEmptyBoard);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const boardRef = useRef(board);
  const scoreRef = useRef(score);
  const startedRef = useRef(started);
  const gameOverRef = useRef(gameOver);

  const compactLayout = height < 740;
  const veryCompact = height < 680;
  const horizontalPadding = width < 360 ? 10 : 14;

  const boardSize = Math.max(
    0,
    Math.min(
      width - horizontalPadding * 2,
      height * (compactLayout ? 0.39 : 0.43),
      440,
    ),
  );

  const cellSize = (boardSize - 12 - CELL_GAP * (SIZE - 1)) / SIZE;

  useEffect(() => {
    AsyncStorage.getItem(BEST_SCORE_KEY)
      .then((saved) => {
        if (saved !== null && Number.isFinite(Number(saved))) {
          setBestScore(Number(saved));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    startedRef.current = started;
  }, [started]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  const updateBestScore = useCallback((value: number) => {
    setBestScore((previous) => {
      const nextBest = Math.max(previous, value);

      if (nextBest > previous) {
        AsyncStorage.setItem(BEST_SCORE_KEY, String(nextBest)).catch(() => {});
      }

      return nextBest;
    });

    getAllProgress()
      .then(async (allProgress) => {
        const current = allProgress["number-merge"];

        await saveGameProgress("number-merge", {
          ...current,
          highScore: Math.max(current.highScore, value),
        });
      })
      .catch(() => {});
  }, []);

  const startGame = useCallback(() => {
    const newBoard = createBoard();

    boardRef.current = newBoard;
    scoreRef.current = 0;
    startedRef.current = true;
    gameOverRef.current = false;

    setBoard(newBoard);
    setScore(0);
    setStarted(true);
    setGameOver(false);
  }, []);

  const move = useCallback(
    (direction: Direction) => {
      if (!startedRef.current || gameOverRef.current) return;

      const result = moveBoard(boardRef.current, direction);
      if (!result.changed) return;

      const nextBoard = addRandomTile(result.board);
      const nextScore = scoreRef.current + result.gained;
      const ended = !hasMoves(nextBoard);

      boardRef.current = nextBoard;
      scoreRef.current = nextScore;
      gameOverRef.current = ended;

      setBoard(nextBoard);
      setScore(nextScore);
      setGameOver(ended);
      updateBestScore(nextScore);
    },
    [updateBestScore],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          startedRef.current && !gameOverRef.current,
        onMoveShouldSetPanResponder: (_, gesture) =>
          startedRef.current &&
          !gameOverRef.current &&
          (Math.abs(gesture.dx) > 12 || Math.abs(gesture.dy) > 12),
        onPanResponderRelease: (_, gesture) => {
          const { dx, dy } = gesture;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return;

          if (Math.abs(dx) > Math.abs(dy)) {
            move(dx > 0 ? "right" : "left");
          } else {
            move(dy > 0 ? "down" : "up");
          }
        },
      }),
    [move],
  );

  const renderBoard = () => (
    <View
      style={[styles.board, { width: boardSize, height: boardSize }]}
      {...panResponder.panHandlers}
    >
      {board.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.boardRow}>
          {row.map((value, colIndex) => {
            const tile = getTileStyle(value);

            return (
              <View
                key={`${rowIndex}-${colIndex}`}
                style={[
                  styles.tile,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: tile.backgroundColor,
                    borderColor: tile.borderColor,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[
                    styles.tileNumber,
                    {
                      color: tile.color,
                      fontSize:
                        value >= 10000
                          ? 9
                          : value >= 1000
                            ? 11
                            : value >= 100
                              ? 13
                              : 16,
                    },
                  ]}
                >
                  {value === 0 ? "" : value}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );

  const renderArrow = (direction: Direction, symbol: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Move ${direction}`}
      disabled={!started || gameOver}
      onPress={() => move(direction)}
      style={({ pressed }) => [
        styles.arrowButton,
        pressed && styles.arrowPressed,
        (!started || gameOver) && styles.arrowDisabled,
      ]}
    >
      <Text style={styles.arrowText}>{symbol}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F0F7EC" />

      <View
        style={[
          styles.pageContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: compactLayout ? 2 : 6,
            paddingBottom: compactLayout ? 2 : 6,
          },
        ]}
      >
        {!started ? (
          <View style={styles.readyScreen}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Game information"
              style={[
                styles.settingsButton,
                veryCompact && styles.settingsButtonCompact,
              ]}
              onPress={() =>
                Alert.alert(
                  "Number Merge",
                  "Merge matching numbers and keep playing until no moves remain.",
                )
              }
            >
              <Text style={styles.settingsText}>⚙</Text>
            </Pressable>

            <View
              style={[styles.readyCard, veryCompact && styles.readyCardCompact]}
            >
              <View style={styles.readyHeader}>
                <View
                  style={[
                    styles.readyIcon,
                    veryCompact && styles.readyIconCompact,
                  ]}
                >
                  <Text style={styles.readyIconText}>🔢</Text>
                </View>

                <Text
                  style={[
                    styles.readyTitle,
                    veryCompact && styles.readyTitleCompact,
                  ]}
                >
                  Number Merge
                </Text>

                <Text
                  style={[
                    styles.readyDescription,
                    veryCompact && styles.readyDescriptionCompact,
                  ]}
                >
                  Merge matching numbers, create bigger tiles, and beat your
                  highest score!
                </Text>
              </View>

              <View
                style={[
                  styles.previewGrid,
                  veryCompact && styles.previewGridCompact,
                ]}
              >
                {[2, 4, 8, 16, 32, 64, 128, 256, 512].map((value) => {
                  const tile = getTileStyle(value);

                  return (
                    <View
                      key={value}
                      style={[
                        styles.previewTile,
                        veryCompact && styles.previewTileCompact,
                        {
                          backgroundColor: tile.backgroundColor,
                          borderColor: tile.borderColor,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.previewNumber, { color: tile.color }]}
                      >
                        {value}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <Text
                style={[
                  styles.howToTitle,
                  veryCompact && styles.howToTitleCompact,
                ]}
              >
                How to Play
              </Text>

              <Text
                style={[
                  styles.howToDescription,
                  veryCompact && styles.howToDescriptionCompact,
                ]}
              >
                Swipe up, down, left, or right. Matching numbers merge into one
                larger number. Keep playing until no moves remain.
              </Text>

              <View style={styles.featureRow}>
                <View
                  style={[
                    styles.featureCard,
                    veryCompact && styles.featureCardCompact,
                  ]}
                >
                  <Text style={styles.featureIcon}>▦</Text>
                  <Text style={styles.featureText}>36 Boxes</Text>
                </View>

                <View
                  style={[
                    styles.featureCard,
                    veryCompact && styles.featureCardCompact,
                  ]}
                >
                  <Text style={styles.featureIcon}>∞</Text>
                  <Text style={styles.featureText}>Endless</Text>
                </View>

                <View
                  style={[
                    styles.featureCard,
                    veryCompact && styles.featureCardCompact,
                  ]}
                >
                  <Text style={styles.featureIcon}>🏆</Text>
                  <Text style={styles.featureText}>High Score</Text>
                </View>
              </View>

              <View style={styles.readyButtons}>
                <Pressable
                  onPress={startGame}
                  style={({ pressed }) => [
                    styles.startButton,
                    veryCompact && styles.startButtonCompact,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.startButtonText}>START GAME</Text>
                  <Text style={styles.startButtonArrow}>→</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => [
                    styles.backButton,
                    veryCompact && styles.backButtonCompact,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.backButtonText}>BACK TO GAMES</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <>
            <View
              style={[styles.header, compactLayout && styles.headerCompact]}
            >
              <View
                style={[
                  styles.headerIcon,
                  compactLayout && styles.headerIconCompact,
                ]}
              >
                <Text style={styles.headerIconText}>🔢</Text>
              </View>

              <View style={styles.headerText}>
                <Text
                  style={[styles.title, compactLayout && styles.titleCompact]}
                >
                  Number Merge
                </Text>
                <Text style={styles.subtitle}>
                  Merge numbers. Beat your best!
                </Text>
              </View>
            </View>

            <View
              style={[styles.statsRow, compactLayout && styles.statsRowCompact]}
            >
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>SCORE</Text>
                <Text style={styles.statValue}>{score}</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statLabel}>BEST SCORE</Text>
                <Text style={styles.statValue}>{bestScore}</Text>
              </View>
            </View>

            <View style={styles.gameInfoRow}>
              <Text style={styles.gameInfoText}>6 × 6 BOARD</Text>
              <Text style={styles.gameInfoText}>ENDLESS MODE</Text>
            </View>

            <View style={styles.boardWrapper}>
              {renderBoard()}

              {gameOver && (
                <View style={styles.gameOverOverlay}>
                  <Text style={styles.gameOverEmoji}>🎉</Text>
                  <Text style={styles.gameOverTitle}>No More Moves!</Text>
                  <Text style={styles.gameOverDescription}>
                    Final score: {score}
                  </Text>

                  <Pressable
                    onPress={startGame}
                    style={({ pressed }) => [
                      styles.startButton,
                      styles.overlayButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.startButtonText}>PLAY AGAIN</Text>
                  </Pressable>
                </View>
              )}
            </View>

            <Text style={styles.instruction}>
              Swipe the board or use the arrows below.
            </Text>

            <View style={styles.controls}>
              <View style={styles.controlSpacer} />
              {renderArrow("up", "↑")}
              <View style={styles.controlSpacer} />

              {renderArrow("left", "←")}
              {renderArrow("down", "↓")}
              {renderArrow("right", "→")}
            </View>

            <Pressable
              onPress={() =>
                Alert.alert(
                  "Restart game?",
                  "Your current game will be lost.",
                  [
                    { text: "CANCEL", style: "cancel" },
                    { text: "RESTART", onPress: startGame },
                  ],
                )
              }
              style={({ pressed }) => [
                styles.restartButton,
                compactLayout && styles.restartButtonCompact,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.restartButtonText}>↻ RESTART GAME</Text>
            </Pressable>

            <Text style={styles.gameFooter}>
              Keep merging and beat your best!
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F0F7EC",
  },
  pageContent: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "space-evenly",
  },

  // Ready screen: all content and buttons inside one white card.
  readyScreen: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  settingsButton: {
    position: "absolute",
    top: 8,
    right: 4,
    width: 52,
    height: 52,
    borderRadius: 28,
    backgroundColor: "#1685F8",
    borderWidth: 5,
    borderColor: "#C7E2FF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  settingsButtonCompact: {
    width: 44,
    height: 44,
  },
  settingsText: {
    fontSize: 24,
    color: "#FFFFFF",
  },
  readyCard: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2EBDD",
    elevation: 6,
    shadowColor: "#38543A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 9,
  },
  readyCardCompact: {
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readyHeader: {
    width: "100%",
    alignItems: "center",
    marginBottom: 15,
    paddingTop: 3,
  },
  readyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: "#DFF7D8",
    borderWidth: 1,
    borderColor: "#CDEBC5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },
  readyIconCompact: {
    width: 48,
    height: 48,
    borderRadius: 17,
    marginBottom: 5,
  },
  readyIconText: {
    fontSize: 34,
  },
  readyTitle: {
    color: "#273D2B",
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  readyTitleCompact: {
    fontSize: 22,
    marginBottom: 4,
  },
  readyDescription: {
    color: "#7B8479",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  readyDescriptionCompact: {
    fontSize: 11,
    lineHeight: 15,
  },
  previewGrid: {
    width: 174,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 4,
    marginBottom: 15,
  },
  previewGridCompact: {
    width: 159,
    gap: 3,
    marginBottom: 8,
  },
  previewTile: {
    width: 54,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  previewTileCompact: {
    width: 51,
    height: 35,
    borderRadius: 8,
  },
  previewNumber: {
    fontSize: 15,
    fontWeight: "900",
  },
  howToTitle: {
    color: "#2B452D",
    fontSize: 21,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  howToTitleCompact: {
    fontSize: 17,
    marginBottom: 4,
  },
  howToDescription: {
    color: "#7B8479",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 15,
  },
  howToDescriptionCompact: {
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 8,
  },
  featureRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 7,
    marginBottom: 18,
  },
  featureCard: {
    flex: 1,
    minHeight: 76,
    borderRadius: 15,
    backgroundColor: "#E8F6E4",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    paddingVertical: 7,
  },
  featureCardCompact: {
    minHeight: 52,
    borderRadius: 11,
    paddingVertical: 4,
  },
  featureIcon: {
    color: "#527451",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },
  featureText: {
    color: "#4C704A",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
  },
  readyButtons: {
    width: "100%",
    gap: 9,
  },
  startButton: {
    width: "100%",
    height: 54,
    borderRadius: 19,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  startButtonCompact: {
    height: 43,
    borderRadius: 14,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1,
  },
  startButtonArrow: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
    position: "absolute",
    right: 18,
  },
  backButton: {
    width: "100%",
    height: 48,
    borderRadius: 18,
    backgroundColor: "#F3F7EC",
    borderWidth: 1,
    borderColor: "#DFE7D9",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonCompact: {
    height: 38,
    borderRadius: 13,
  },
  backButtonText: {
    color: "#219653",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },

  // Gameplay screen.
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  headerCompact: {
    marginBottom: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#DFF7D8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerIconCompact: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  headerIconText: {
    fontSize: 25,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 23,
    fontWeight: "900",
    color: "#273D2B",
  },
  titleCompact: {
    fontSize: 20,
  },
  subtitle: {
    fontSize: 11,
    color: "#73816E",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
    marginBottom: 6,
  },
  statsRowCompact: {
    marginBottom: 2,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E5EBDD",
    alignItems: "center",
  },
  statLabel: {
    color: "#82907B",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  statValue: {
    color: "#2B452D",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 1,
  },
  gameInfoRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  gameInfoText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: "#73816E",
  },
  boardWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  board: {
    backgroundColor: "#B8C7B0",
    padding: 6,
    borderRadius: 13,
    gap: CELL_GAP,
    overflow: "hidden",
  },
  boardRow: {
    flex: 1,
    flexDirection: "row",
    gap: CELL_GAP,
  },
  tile: {
    flex: 1,
    minWidth: 0,
    borderRadius: 6,
    borderWidth: 1.5,
    borderBottomWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
  },
  tileNumber: {
    fontWeight: "900",
    textAlign: "center",
    includeFontPadding: false,
  },
  instruction: {
    fontSize: 11,
    color: "#74816F",
    marginTop: 3,
    marginBottom: 3,
    textAlign: "center",
  },
  controls: {
    width: 160,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 5,
  },
  controlSpacer: {
    width: 48,
    height: 39,
  },
  arrowButton: {
    width: 48,
    height: 39,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE6D5",
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
  },
  arrowPressed: {
    backgroundColor: "#DFF7D8",
    transform: [{ scale: 0.94 }],
  },
  arrowDisabled: {
    opacity: 0.45,
  },
  arrowText: {
    fontSize: 23,
    fontWeight: "900",
    color: "#38563A",
    lineHeight: 29,
  },
  restartButton: {
    marginTop: 5,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E8D9",
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: "center",
  },
  restartButtonCompact: {
    marginTop: 2,
    paddingVertical: 7,
  },
  restartButtonText: {
    color: "#496448",
    fontSize: 12,
    fontWeight: "900",
  },
  gameFooter: {
    color: "#82907B",
    fontSize: 10,
    textAlign: "center",
    marginTop: 3,
  },
  gameOverOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 13,
    backgroundColor: "rgba(243,248,238,0.95)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  gameOverEmoji: {
    fontSize: 34,
    marginBottom: 5,
  },
  gameOverTitle: {
    color: "#2B452D",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  gameOverDescription: {
    color: "#73816E",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 7,
    marginBottom: 15,
  },
  overlayButton: {
    maxWidth: 220,
  },
});
