import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { getAllProgress, saveGameProgress } from "../../src/services/storage";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CELL_SIZE = 20;
const HEADER_HEIGHT = 92;
const CONTROLS_HEIGHT = 150;
const BOARD_WIDTH = Math.floor(SCREEN_WIDTH / CELL_SIZE) * CELL_SIZE;
const AVAILABLE_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT - CONTROLS_HEIGHT;
const BOARD_HEIGHT = Math.floor(AVAILABLE_HEIGHT / CELL_SIZE) * CELL_SIZE;
const COLUMNS = Math.max(8, Math.floor(BOARD_WIDTH / CELL_SIZE));
const ROWS = Math.max(8, Math.floor(BOARD_HEIGHT / CELL_SIZE));
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type GameState = "ready" | "playing" | "completed";
type Point = {
  x: number;
  y: number;
};
const INITIAL_SNAKE: Point[] = [
  { x: 8, y: 6 },
  { x: 7, y: 6 },
  { x: 6, y: 6 },
  { x: 5, y: 6 },
];
const INITIAL_DIRECTION: Direction = "RIGHT";
const START_SPEED = 240; // Slow, beginner-friendly movement (milliseconds per cell)
const SPEED_STEP = 12; // Small speed increase at each level
const SCORE_PER_LEVEL = 100;
const MIN_SPEED = 120; // Keep the highest level controllable
function pointsEqual(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}
function getRandomFood(snake: Point[]): Point {
  const available: Point[] = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLUMNS; x += 1) {
      if (!snake.some((segment) => segment.x === x && segment.y === y)) {
        available.push({ x, y });
      }
    }
  }
  if (available.length === 0) {
    return { x: 0, y: 0 };
  }
  return available[Math.floor(Math.random() * available.length)];
}
function getLevel(score: number) {
  return Math.min(1 + Math.floor(score / SCORE_PER_LEVEL), 10);
}
function getSpeed(score: number) {
  // Every 100 points, advance one level and speed up just a little.
  const level = getLevel(score);
  return Math.max(START_SPEED - (level - 1) * SPEED_STEP, MIN_SPEED);
}
const GridCell = React.memo(function GridCell({
  x,
  y,
}: {
  x: number;
  y: number;
}) {
  return (
    <View
      style={[styles.gridCell, { left: x * CELL_SIZE, top: y * CELL_SIZE }]}
    />
  );
});

export default function SnakeGame() {
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>(() => getRandomFood(INITIAL_SNAKE));
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [bestScore, setBestScore] = useState(0);
  const [state, setState] = useState<GameState>("ready");
  const [paused, setPaused] = useState(false);
  const snakeRef = useRef<Point[]>(INITIAL_SNAKE);
  const foodRef = useRef<Point>(food);
  const directionRef = useRef<Direction>(INITIAL_DIRECTION);
  const stateRef = useRef<GameState>("ready");
  const pausedRef = useRef(false);
  const scoreRef = useRef(0);
  const speedRef = useRef(START_SPEED);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<() => void>(() => {});
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const gestureHandledRef = useRef(false);
  const endingRef = useRef(false);
  const clearGameLoop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  // Load the saved high score from shared progress.
  useEffect(() => {
    let active = true;
    getAllProgress()
      .then((allProgress) => {
        if (active) {
          setBestScore(allProgress.snake.highScore);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const prepareGame = useCallback(() => {
    clearGameLoop();
    const initialSnake = [...INITIAL_SNAKE];
    const initialFood = getRandomFood(initialSnake);
    snakeRef.current = initialSnake;
    foodRef.current = initialFood;
    directionRef.current = INITIAL_DIRECTION;
    scoreRef.current = 0;
    speedRef.current = START_SPEED;
    pausedRef.current = false;
    stateRef.current = "ready";
    endingRef.current = false;
    setSnake(initialSnake);
    setFood(initialFood);
    setScore(0);
    setLevel(1);
    setPaused(false);
    setState("ready");
  }, [clearGameLoop]);
  // Save the completed game to shared progress.
  const endGame = useCallback(() => {
    if (stateRef.current !== "playing" || endingRef.current) {
      return;
    }
    endingRef.current = true;
    clearGameLoop();
    pausedRef.current = false;
    stateRef.current = "completed";
    setPaused(false);
    setState("completed");
    const finalScore = scoreRef.current;
    const finalLevel = getLevel(finalScore);
    const earnedStars = Math.min(3, Math.floor(finalScore / 100));
    getAllProgress()
      .then(async (allProgress) => {
        const previous = allProgress.snake;
        const updatedProgress = {
          ...previous,
          highScore: Math.max(previous.highScore, finalScore),
          currentLevel: Math.max(previous.currentLevel, finalLevel),
          unlockedLevels: Math.max(
            previous.unlockedLevels,
            Math.min(10, finalLevel + 1),
          ),
          stars: Math.max(previous.stars, earnedStars),
        };
        await saveGameProgress("snake", updatedProgress);
        setBestScore(updatedProgress.highScore);
      })
      .catch((error) => {
        console.warn("Unable to save Snake progress:", error);
      });
  }, [clearGameLoop]);
  const changeDirection = useCallback((newDirection: Direction) => {
    if (stateRef.current !== "playing" || pausedRef.current) {
      return;
    }
    const current = directionRef.current;
    const opposite =
      (current === "UP" && newDirection === "DOWN") ||
      (current === "DOWN" && newDirection === "UP") ||
      (current === "LEFT" && newDirection === "RIGHT") ||
      (current === "RIGHT" && newDirection === "LEFT");
    if (opposite) {
      return;
    }
    if (current === newDirection) return;

    directionRef.current = newDirection;

    // Wake the game loop immediately after an accepted input instead of
    // waiting for the remainder of the current movement interval.
    if (intervalRef.current !== null) {
      clearTimeout(intervalRef.current);
    }
    intervalRef.current = setTimeout(() => tickRef.current(), 16);
  }, []);
  const moveSnake = useCallback(() => {
    if (stateRef.current !== "playing" || pausedRef.current) {
      return;
    }
    const currentSnake = snakeRef.current;
    const currentFood = foodRef.current;
    const currentDirection = directionRef.current;
    const head = currentSnake[0];
    const nextHead: Point = {
      x: head.x,
      y: head.y,
    };
    switch (currentDirection) {
      case "UP":
        nextHead.y -= 1;
        break;
      case "DOWN":
        nextHead.y += 1;
        break;
      case "LEFT":
        nextHead.x -= 1;
        break;
      case "RIGHT":
        nextHead.x += 1;
        break;
    }
    const hitWall =
      nextHead.x < 0 ||
      nextHead.x >= COLUMNS ||
      nextHead.y < 0 ||
      nextHead.y >= ROWS;
    if (hitWall) {
      endGame();
      return;
    }
    const eatingFood = pointsEqual(nextHead, currentFood);
    const collisionBody = eatingFood ? currentSnake : currentSnake.slice(0, -1);
    const hitSelf = collisionBody.some((segment) =>
      pointsEqual(segment, nextHead),
    );
    if (hitSelf) {
      endGame();
      return;
    }
    const newSnake = [nextHead, ...currentSnake];
    if (!eatingFood) {
      newSnake.pop();
    }
    snakeRef.current = newSnake;
    setSnake(newSnake);
    if (eatingFood) {
      const newScore = scoreRef.current + 10;
      scoreRef.current = newScore;
      speedRef.current = getSpeed(newScore);
      setScore(newScore);
      setLevel(getLevel(newScore));
      const newFood = getRandomFood(newSnake);
      foodRef.current = newFood;
      setFood(newFood);
      if (newSnake.length >= COLUMNS * ROWS) {
        endGame();
      }
    }
  }, [endGame]);
  const start = useCallback(() => {
    clearGameLoop();
    const initialSnake = [...INITIAL_SNAKE];
    const initialFood = getRandomFood(initialSnake);
    snakeRef.current = initialSnake;
    foodRef.current = initialFood;
    directionRef.current = INITIAL_DIRECTION;
    scoreRef.current = 0;
    speedRef.current = START_SPEED;
    pausedRef.current = false;
    stateRef.current = "playing";
    endingRef.current = false;
    setSnake(initialSnake);
    setFood(initialFood);
    setScore(0);
    setLevel(1);
    setPaused(false);
    setState("playing");
  }, [clearGameLoop]);
  const playAgain = useCallback(() => {
    prepareGame();
  }, [prepareGame]);
  // A stable recursive timeout avoids restarting the loop on every score change.
  useEffect(() => {
    if (state !== "playing" || paused) {
      clearGameLoop();
      return;
    }

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      moveSnake();
      if (!cancelled && stateRef.current === "playing" && !pausedRef.current) {
        intervalRef.current = setTimeout(tick, speedRef.current);
      }
    };

    tickRef.current = tick;
    intervalRef.current = setTimeout(tick, speedRef.current);
    return () => {
      cancelled = true;
      clearGameLoop();
    };
  }, [state, paused, moveSnake, clearGameLoop]);
  useEffect(() => {
    prepareGame();
    return () => {
      clearGameLoop();
    };
  }, [prepareGame, clearGameLoop]);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Capture the gesture at the start so the board responds without
        // waiting for a release event or competing child responder.
        onStartShouldSetPanResponder: () => stateRef.current === "playing",
        onMoveShouldSetPanResponder: () => stateRef.current === "playing",
        onPanResponderGrant: (event) => {
          touchStartRef.current = {
            x: event.nativeEvent.pageX,
            y: event.nativeEvent.pageY,
          };
          gestureHandledRef.current = false;
        },
        onPanResponderMove: (event) => {
          if (
            !touchStartRef.current ||
            gestureHandledRef.current ||
            stateRef.current !== "playing"
          ) {
            return;
          }
          const dx = event.nativeEvent.pageX - touchStartRef.current.x;
          const dy = event.nativeEvent.pageY - touchStartRef.current.y;
          // Detect the swipe as soon as it crosses the threshold, not on release.
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
          gestureHandledRef.current = true;
          if (Math.abs(dx) > Math.abs(dy)) {
            changeDirection(dx > 0 ? "RIGHT" : "LEFT");
          } else {
            changeDirection(dy > 0 ? "DOWN" : "UP");
          }
        },
        onPanResponderRelease: () => {
          touchStartRef.current = null;
          gestureHandledRef.current = false;
        },
        onPanResponderTerminate: () => {
          touchStartRef.current = null;
          gestureHandledRef.current = false;
        },
      }),
    [changeDirection],
  );
  const togglePause = useCallback(() => {
    if (stateRef.current !== "playing") {
      return;
    }
    const newPaused = !pausedRef.current;
    pausedRef.current = newPaused;
    setPaused(newPaused);
  }, []);
  const snakeCells = useMemo(
    () =>
      snake.map((segment, index) => ({
        ...segment,
        isHead: index === 0,
      })),
    [snake],
  );
  if (state === "ready") {
    return (
      <View style={styles.readyScreen}>
        <View style={styles.readyCard}>
          <Text style={styles.readyEmoji}>🐍</Text>
          <Text style={styles.readyHeading}>Ready to snake?</Text>
          <Text style={styles.readyInfo}>
            Eat the apples and grow your snake. Don't hit the wall or your own
            body!
          </Text>
          <View style={styles.readyRules}>
            <Text style={styles.readyRule}>🍎 Eat fruit = +1 segment</Text>
            <Text style={styles.readyRule}>💯 Eat fruit = +10 points</Text>
            <Text style={styles.readyRule}>🧱 Don't hit the boundary</Text>
            <Text style={styles.readyRule}>🐍 Don't hit yourself</Text>
            <Text style={styles.readyRule}>🏆 Best score: {bestScore}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.startButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={start}
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
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.gameLabel}>MINI GAME</Text>
          <Text style={styles.title}>SNAKE</Text>
        </View>
        <View style={styles.headerStats}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>SCORE</Text>
            <Text style={styles.statValue}>{score}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>LEVEL</Text>
            <Text style={styles.levelValue}>{level}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>BEST</Text>
            <Text style={styles.statValue}>{Math.max(bestScore, score)}</Text>
          </View>
        </View>
      </View>
      <View style={styles.boardWrapper}>
        <View
          {...panResponder.panHandlers}
          style={[styles.board, { width: BOARD_WIDTH, height: BOARD_HEIGHT }]}
        >
          {Array.from({ length: COLUMNS * ROWS }, (_, index) => (
            <GridCell
              key={index}
              x={index % COLUMNS}
              y={Math.floor(index / COLUMNS)}
            />
          ))}
          <View
            style={[
              styles.food,
              {
                left: food.x * CELL_SIZE,
                top: food.y * CELL_SIZE,
              },
            ]}
          >
            <Text style={styles.foodEmoji}>🍎</Text>
          </View>
          {snakeCells.map((segment, index) => (
            <View
              key={`${segment.x}-${segment.y}-${index}`}
              style={[
                styles.snakeSegment,
                {
                  left: segment.x * CELL_SIZE + 1,
                  top: segment.y * CELL_SIZE + 1,
                },
                segment.isHead && styles.snakeHead,
              ]}
            >
              {segment.isHead && <Text style={styles.headEyes}>••</Text>}
            </View>
          ))}
          {paused && (
            <View style={styles.pauseOverlay}>
              <View style={styles.pauseCard}>
                <Text style={styles.pauseEmoji}>⏸️</Text>
                <Text style={styles.pauseTitle}>PAUSED</Text>
                <Pressable onPress={togglePause} style={styles.resumeButton}>
                  <Text style={styles.resumeText}>RESUME</Text>
                </Pressable>
              </View>
            </View>
          )}
          {state === "completed" && (
            <View style={styles.gameOverOverlay}>
              <View style={styles.gameOverCard}>
                <Text style={styles.gameOverEmoji}>🐍</Text>
                <Text style={styles.gameOverTitle}>GAME OVER</Text>
                <Text style={styles.finalScoreLabel}>SCORE</Text>
                <Text style={styles.finalScore}>{score}</Text>
                <Text style={styles.finalLevel}>Level {level}</Text>
                <Text style={styles.bestScoreText}>
                  Best score: {Math.max(bestScore, score)}
                </Text>
                <Pressable onPress={playAgain} style={styles.playAgainButton}>
                  <Text style={styles.playAgainText}>PLAY AGAIN</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.replace("/")}
                  style={styles.anotherGameButton}
                >
                  <Text style={styles.anotherGameText}>TRY ANOTHER GAME</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
      <View style={styles.controlsArea}>
        <View style={styles.controlTopRow}>
          <Pressable
            onPress={() => changeDirection("UP")}
            style={({ pressed }) => [
              styles.controlButton,
              pressed && styles.controlPressed,
            ]}
          >
            <Text style={styles.controlText}>↑</Text>
          </Pressable>
        </View>
        <View style={styles.controlMiddleRow}>
          <Pressable
            onPress={() => changeDirection("LEFT")}
            style={({ pressed }) => [
              styles.controlButton,
              pressed && styles.controlPressed,
            ]}
          >
            <Text style={styles.controlText}>←</Text>
          </Pressable>
          <Pressable
            onPress={togglePause}
            style={({ pressed }) => [
              styles.pauseButton,
              pressed && styles.controlPressed,
            ]}
          >
            <Text style={styles.pauseButtonText}>{paused ? "▶" : "Ⅱ"}</Text>
          </Pressable>
          <Pressable
            onPress={() => changeDirection("RIGHT")}
            style={({ pressed }) => [
              styles.controlButton,
              pressed && styles.controlPressed,
            ]}
          >
            <Text style={styles.controlText}>→</Text>
          </Pressable>
        </View>
        <View style={styles.controlBottomRow}>
          <Pressable
            onPress={() => changeDirection("DOWN")}
            style={({ pressed }) => [
              styles.controlButton,
              pressed && styles.controlPressed,
            ]}
          >
            <Text style={styles.controlText}>↓</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          SWIPE OR USE THE BUTTONS • EAT 🍎 • DON'T HIT THE WALL
        </Text>
      </View>
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
    width: "100%",
    maxWidth: 390,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  readyEmoji: { fontSize: 68, marginBottom: 8 },
  readyHeading: {
    fontSize: 28,
    fontWeight: "900",
    color: "#241C2A",
    textAlign: "center",
    marginTop: 4,
  },
  readyInfo: {
    textAlign: "center",
    color: "#6B7280",
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
    backgroundColor: "#16A34A",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 22,
  },
  buttonPressed: { transform: [{ scale: 0.97 }] },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1,
  },
  backButton: {
    width: "100%",
    backgroundColor: "#F4F8EC",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  backButtonText: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  screen: { flex: 1, backgroundColor: "#F4F8EC" },
  header: {
    height: HEADER_HEIGHT,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(36, 28, 42, 0.06)",
  },
  gameLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#16A34A",
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#241C2A",
    marginTop: 2,
  },
  headerStats: { flexDirection: "row", gap: 5 },
  statBox: {
    minWidth: 54,
    backgroundColor: "#F4F8EC",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 7,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#6B7280",
  },
  statValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#16A34A",
    marginTop: 1,
  },
  levelValue: {
    fontSize: 17,
    fontWeight: "900",
    color: "#7C3AED",
    marginTop: 1,
  },
  boardWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DFF7D8",
  },
  board: {
    backgroundColor: "#DFF7D8",
    overflow: "hidden",
    position: "relative",
    borderWidth: 2,
    borderColor: "#A7D99D",
  },
  gridCell: {
    position: "absolute",
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 0.5,
    borderColor: "rgba(22, 163, 74, 0.035)",
  },
  snakeSegment: {
    position: "absolute",
    width: CELL_SIZE - 2,
    height: CELL_SIZE - 2,
    borderRadius: 5,
    backgroundColor: "#16A34A",
  },
  snakeHead: {
    backgroundColor: "#15803D",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  headEyes: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
    transform: [{ rotate: "90deg" }],
  },
  food: {
    position: "absolute",
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  foodEmoji: { fontSize: 17 },
  controlsArea: {
    height: CONTROLS_HEIGHT,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
  },
  controlTopRow: { height: 42, justifyContent: "center" },
  controlMiddleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  controlBottomRow: { height: 42, justifyContent: "center" },
  controlButton: {
    width: 44,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EAF7E7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#C8E8C2",
  },
  controlPressed: { transform: [{ scale: 0.92 }] },
  controlText: {
    fontSize: 25,
    fontWeight: "900",
    color: "#15803D",
    lineHeight: 28,
  },
  pauseButton: {
    width: 44,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  pauseButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  footer: {
    minHeight: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingBottom: 5,
  },
  footerText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: "#6B7280",
    textAlign: "center",
  },
  pauseOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.32)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    elevation: 20,
  },
  pauseCard: {
    width: "70%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
  },
  pauseEmoji: { fontSize: 38 },
  pauseTitle: {
    fontSize: 25,
    fontWeight: "900",
    color: "#241C2A",
    marginTop: 8,
  },
  resumeButton: {
    marginTop: 18,
    width: "100%",
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  resumeText: {
    color: "#FFFFFF",
    fontWeight: "900",
    letterSpacing: 1,
  },
  gameOverOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    elevation: 30,
  },
  gameOverCard: {
    width: "82%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  gameOverEmoji: { fontSize: 48 },
  gameOverTitle: {
    fontSize: 27,
    fontWeight: "900",
    color: "#241C2A",
    marginTop: 7,
  },
  finalScoreLabel: {
    marginTop: 12,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#6B7280",
  },
  finalScore: {
    fontSize: 42,
    fontWeight: "900",
    color: "#16A34A",
    marginTop: 1,
  },
  finalLevel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#7C3AED",
    marginTop: 2,
  },
  bestScoreText: {
    marginTop: 5,
    fontSize: 12,
    fontWeight: "800",
    color: "#16A34A",
  },
  playAgainButton: {
    width: "100%",
    backgroundColor: "#16A34A",
    borderRadius: 15,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
  },
  playAgainText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },
  anotherGameButton: {
    width: "100%",
    backgroundColor: "#F4F8EC",
    borderRadius: 15,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 9,
  },
  anotherGameText: {
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
