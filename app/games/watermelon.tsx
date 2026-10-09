import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const GAME_WIDTH = SCREEN_WIDTH;
const GAME_HEIGHT = SCREEN_HEIGHT - 170;

const INITIAL_LIVES = 3;
const FRUIT_SCORE = 10;
const MAX_LEVEL = 7;

const FRUITS = ["🍉", "🍎", "🍊", "🍋", "🍓", "🍇", "🍍", "🥝", "🍑"];

type GameObjectType = "fruit" | "bomb";

type GameObject = {
  id: number;
  type: GameObjectType;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  gravity: number;
  rotation: number;
  rotationSpeed: number;
  emoji: string;
};

type GameState = "ready" | "playing" | "completed";

const random = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

export default function WatermelonPop() {
  const [objects, setObjects] = useState<GameObject[]>([]);

  const [score, setScore] = useState(0);

  const [lives, setLives] = useState(INITIAL_LIVES);

  const [combo, setCombo] = useState(0);

  const [difficultyLevel, setDifficultyLevel] = useState(1);

  /*
   * Same flow as Card Match:
   *
   * ready
   *   ↓
   * playing
   *   ↓
   * completed
   */
  const [state, setState] = useState<GameState>("ready");

  const objectsRef = useRef<GameObject[]>([]);

  const animationFrameRef = useRef<number | null>(null);

  const nextObjectIdRef = useRef(1);

  const scoreRef = useRef(0);

  const livesRef = useRef(INITIAL_LIVES);

  const comboRef = useRef(0);

  const stateRef = useRef<GameState>("ready");

  const gameOverRef = useRef(false);

  /*
   * Game speed changes ONLY when
   * the player successfully scores.
   */
  const gameSpeedRef = useRef(1);

  const lastFrameTimeRef = useRef<number | null>(null);

  const spawnTimerRef = useRef(0);

  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
   * ============================================================
   * CREATE OBJECT
   * ============================================================
   */
  const createObject = useCallback((id: number): GameObject => {
    const isBomb = Math.random() < 0.18;

    /*
     * Keep objects between 58 and 75 px.
     */
    const size = random(58, 75);

    const speedMultiplier = gameSpeedRef.current;

    /*
     * Jump height between
     * 55% and 70% of game area.
     */
    const jumpHeight = random(GAME_HEIGHT * 0.55, GAME_HEIGHT * 0.7);

    /*
     * Gravity increases with difficulty.
     */
    const baseGravity = 0.28;

    const gravity = baseGravity * speedMultiplier * speedMultiplier;

    /*
     * Physics:
     *
     * velocity = sqrt(2 * gravity * height)
     */
    const jumpVelocity = Math.sqrt(2 * gravity * jumpHeight);

    const x = random(10, Math.max(10, GAME_WIDTH - size - 10));

    return {
      id,

      type: isBomb ? "bomb" : "fruit",

      x,

      y: GAME_HEIGHT - size - 5,

      size,

      speedX: random(-1.2, 1.2) * speedMultiplier,

      speedY: -jumpVelocity,

      gravity,

      rotation: random(0, 360),

      rotationSpeed: random(-4, 4) * speedMultiplier,

      emoji: isBomb ? "💣" : FRUITS[Math.floor(Math.random() * FRUITS.length)],
    };
  }, []);

  /*
   * ============================================================
   * END GAME
   * ============================================================
   */
  const endGame = useCallback(() => {
    if (stateRef.current === "completed") {
      return;
    }

    stateRef.current = "completed";

    setState("completed");

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);

      animationFrameRef.current = null;
    }

    lastFrameTimeRef.current = null;
  }, []);

  /*
   * ============================================================
   * BOMB HIT
   * ============================================================
   */
  const hitBomb = useCallback(() => {
    if (stateRef.current !== "playing") {
      return;
    }

    const currentLives = livesRef.current;

    const nextLives = Math.max(0, currentLives - 1);

    livesRef.current = nextLives;

    setLives(nextLives);

    /*
     * Bomb resets combo.
     */
    comboRef.current = 0;

    setCombo(0);

    /*
     * IMPORTANT:
     * Bomb does NOT reduce score.
     */
    scoreRef.current = Math.max(0, scoreRef.current);

    setScore(scoreRef.current);

    /*
     * Third bomb = Game Over.
     */
    if (nextLives === 0) {
      endGame();
    }
  }, [endGame]);

  /*
   * ============================================================
   * FRUIT / BOMB TAP
   * ============================================================
   */
  const handleObjectPress = useCallback(
    (object: GameObject) => {
      if (stateRef.current !== "playing") {
        return;
      }

      /*
       * Remove tapped object immediately.
       */
      objectsRef.current = objectsRef.current.filter(
        (item) => item.id !== object.id,
      );

      setObjects([...objectsRef.current]);

      /*
       * BOMB
       */
      if (object.type === "bomb") {
        hitBomb();
        return;
      }

      /*
       * FRUIT
       */
      const newCombo = comboRef.current + 1;

      comboRef.current = newCombo;

      setCombo(newCombo);

      /*
       * Every 5 combo hits:
       * +5 extra points.
       */
      const comboBonus = newCombo > 1 ? Math.floor(newCombo / 5) * 5 : 0;

      const pointsEarned = FRUIT_SCORE + comboBonus;

      /*
       * Update score.
       */
      scoreRef.current = Math.max(0, scoreRef.current + pointsEarned);

      setScore(scoreRef.current);

      /*
       * ======================================================
       * SCORE-DRIVEN LEVEL SYSTEM
       * ======================================================
       *
       * Level 1 : 0 - 99
       * Level 2 : 100 - 199
       * Level 3 : 200 - 299
       * Level 4 : 300 - 399
       * Level 5 : 400 - 499
       * Level 6 : 500 - 599
       * Level 7 : 600+
       *
       * Level changes ONLY after scoring.
       */
      const newLevel = Math.min(
        1 + Math.floor(scoreRef.current / 100),
        MAX_LEVEL,
      );

      if (newLevel !== difficultyLevel) {
        setDifficultyLevel(newLevel);
      }

      /*
       * Increase game speed
       * based on level.
       */
      gameSpeedRef.current = Math.min(1 + (newLevel - 1) * 0.15, 1.9);

      /*
       * Reset combo timeout.
       */
      if (comboTimerRef.current) {
        clearTimeout(comboTimerRef.current);
      }

      comboTimerRef.current = setTimeout(() => {
        comboRef.current = 0;

        setCombo(0);
      }, 1200);
    },
    [difficultyLevel, hitBomb],
  );

  /*
   * ============================================================
   * SPAWN OBJECT
   * ============================================================
   */
  const spawnObject = useCallback(() => {
    if (stateRef.current !== "playing") {
      return;
    }

    const id = nextObjectIdRef.current++;

    const object = createObject(id);

    objectsRef.current = [...objectsRef.current, object];

    setObjects([...objectsRef.current]);
  }, [createObject]);

  /*
   * ============================================================
   * MAIN GAME LOOP
   * ============================================================
   */
  const gameLoop = useCallback(
    (timestamp: number) => {
      if (stateRef.current !== "playing") {
        return;
      }

      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
      }

      const delta = timestamp - lastFrameTimeRef.current;

      lastFrameTimeRef.current = timestamp;

      /*
       * Prevent huge jumps when
       * the app is paused.
       */
      const frameScale = Math.min(delta / 16.67, 2);

      /*
       * Spawn speed is based on
       * current level.
       *
       * Level only changes after
       * successful fruit scoring.
       */
      spawnTimerRef.current += delta;

      const spawnInterval = Math.max(450, 950 / gameSpeedRef.current);

      if (spawnTimerRef.current >= spawnInterval) {
        spawnTimerRef.current = 0;

        spawnObject();
      }

      /*
       * Update objects.
       */
      const updatedObjects = objectsRef.current
        .map((object) => {
          let nextY = object.y + object.speedY * frameScale;

          let nextSpeedY = object.speedY + object.gravity * frameScale;

          let nextX = object.x + object.speedX * frameScale;

          let nextRotation =
            object.rotation + object.rotationSpeed * frameScale;

          /*
           * Keep object horizontally
           * inside game.
           */
          if (nextX <= 5 || nextX >= GAME_WIDTH - object.size - 5) {
            object.speedX = -object.speedX;

            nextX = Math.max(5, Math.min(nextX, GAME_WIDTH - object.size - 5));
          }

          /*
           * Never allow object
           * above game area.
           */
          if (nextY < 5) {
            nextY = 5;

            /*
             * Reverse upward velocity.
             */
            nextSpeedY = Math.abs(nextSpeedY) * 0.35;
          }

          /*
           * Object reached bottom.
           *
           * Missing a fruit does NOT
           * cost a life.
           */
          if (nextY > GAME_HEIGHT + object.size) {
            return null;
          }

          return {
            ...object,
            x: nextX,
            y: nextY,
            speedY: nextSpeedY,
            rotation: nextRotation,
          };
        })
        .filter((item): item is GameObject => item !== null);

      objectsRef.current = updatedObjects;

      setObjects(updatedObjects);

      /*
       * Continue ONLY while playing.
       */
      if (stateRef.current === "playing") {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
      }
    },
    [spawnObject],
  );

  /*
   * ============================================================
   * PREPARE GAME
   * ============================================================
   *
   * This resets everything but DOES NOT
   * start the game.
   *
   * This is what we need for the
   * "Ready to pop?" screen.
   */
  const prepareGame = useCallback(() => {
    /*
     * Stop old animation.
     */
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);

      animationFrameRef.current = null;
    }

    /*
     * Clear combo timer.
     */
    if (comboTimerRef.current) {
      clearTimeout(comboTimerRef.current);

      comboTimerRef.current = null;
    }

    /*
     * Reset refs.
     */
    stateRef.current = "ready";

    gameOverRef.current = false;

    scoreRef.current = 0;

    livesRef.current = INITIAL_LIVES;

    comboRef.current = 0;

    gameSpeedRef.current = 1;

    lastFrameTimeRef.current = null;

    spawnTimerRef.current = 0;

    nextObjectIdRef.current = 1;

    /*
     * Reset React state.
     */
    setState("ready");

    setScore(0);

    setLives(INITIAL_LIVES);

    setCombo(0);

    setDifficultyLevel(1);

    /*
     * Remove old objects.
     */
    objectsRef.current = [];

    setObjects([]);
  }, []);

  /*
   * ============================================================
   * START GAME
   * ============================================================
   *
   * This is the ONLY place where
   * actual gameplay begins.
   */
  const startGame = useCallback(() => {
    /*
     * Stop anything old.
     */
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);

      animationFrameRef.current = null;
    }

    /*
     * Clear old combo timer.
     */
    if (comboTimerRef.current) {
      clearTimeout(comboTimerRef.current);

      comboTimerRef.current = null;
    }

    /*
     * Reset refs.
     */
    stateRef.current = "playing";

    scoreRef.current = 0;

    livesRef.current = INITIAL_LIVES;

    comboRef.current = 0;

    gameSpeedRef.current = 1;

    lastFrameTimeRef.current = null;

    spawnTimerRef.current = 0;

    nextObjectIdRef.current = 1;

    /*
     * Reset React state.
     */
    setState("playing");

    setScore(0);

    setLives(INITIAL_LIVES);

    setCombo(0);

    setDifficultyLevel(1);

    /*
     * Clear old objects.
     */
    objectsRef.current = [];

    setObjects([]);

    /*
     * Create initial objects.
     */
    const initialObjects: GameObject[] = [];

    for (let i = 0; i < 3; i++) {
      const id = nextObjectIdRef.current++;

      initialObjects.push(createObject(id));
    }

    objectsRef.current = initialObjects;

    setObjects(initialObjects);

    /*
     * START ACTUAL GAME LOOP.
     */
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [createObject, gameLoop]);

  /*
   * ============================================================
   * INITIAL SCREEN
   * ============================================================
   *
   * IMPORTANT:
   * Do NOT call startGame().
   *
   * The player must press START GAME.
   */
  useEffect(() => {
    prepareGame();

    return () => {
      stateRef.current = "completed";

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);

        animationFrameRef.current = null;
      }

      if (comboTimerRef.current) {
        clearTimeout(comboTimerRef.current);

        comboTimerRef.current = null;
      }
    };
  }, [prepareGame]);

  /*
   * ============================================================
   * READY SCREEN
   * ============================================================
   */
  if (state === "ready") {
    return (
      <View style={styles.readyScreen}>
        <View style={styles.readyCard}>
          <Text style={styles.readyEmoji}>🍉</Text>

          <Text style={styles.readyHeading}>Ready to pop?</Text>

          <Text style={styles.readyInfo}>
            Tap the fruits to score points. Avoid bombs because each bomb costs
            one life!
          </Text>

          <View style={styles.readyRules}>
            <Text style={styles.readyRule}>🍉 Tap fruit = +10 points</Text>

            <Text style={styles.readyRule}>
              🔥 Build combos for bonus points
            </Text>

            <Text style={styles.readyRule}>💣 Bomb = lose 1 life</Text>

            <Text style={styles.readyRule}>❤️ You have 3 lives</Text>

            <Text style={styles.readyRule}>
              🚀 Keep scoring to increase level
            </Text>
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
   * ============================================================
   * MAIN GAME
   * ============================================================
   */
  return (
    <View style={styles.container}>
      {/* ================= HEADER ================= */}

      <View style={styles.header}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>SCORE</Text>

          <Text style={styles.statValue}>{score}</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>LIVES</Text>

          <Text style={styles.statValue}>{"❤️".repeat(lives)}</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>COMBO</Text>

          <Text style={styles.statValue}>{combo}</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>LEVEL</Text>

          <Text style={styles.statValue}>{difficultyLevel}</Text>
        </View>
      </View>

      {/* ================= GAME AREA ================= */}

      <View style={styles.gameArea}>
        {objects.map((object) => {
          const rotation = `${object.rotation}deg`;

          return (
            <Pressable
              key={object.id}
              onPress={() => handleObjectPress(object)}
              style={[
                styles.gameObject,
                {
                  left: object.x,
                  top: object.y,
                  width: object.size,
                  height: object.size,
                  transform: [
                    {
                      rotate: rotation,
                    },
                  ],
                },
              ]}
            >
              <Text
                style={[
                  styles.objectEmoji,
                  {
                    fontSize: object.size * 0.72,
                  },
                ]}
              >
                {object.emoji}
              </Text>
            </Pressable>
          );
        })}

        {/* ================= GAME OVER ================= */}

        {state === "completed" && (
          <View style={styles.gameOverOverlay}>
            <View style={styles.gameOverCard}>
              <Text style={styles.gameOverEmoji}>🍉</Text>

              <Text style={styles.gameOverTitle}>GAME OVER</Text>

              <Text style={styles.finalScoreLabel}>FINAL SCORE</Text>

              <Text style={styles.finalScore}>{score}</Text>

              <Text style={styles.gameOverMessage}>You ran out of lives!</Text>

              <Pressable onPress={prepareGame} style={styles.playAgainButton}>
                <Text style={styles.playAgainText}>PLAY AGAIN</Text>
              </Pressable>

              <Pressable
                onPress={() => router.replace("/")}
                style={styles.tryAnotherButton}
              >
                <Text style={styles.tryAnotherText}>TRY ANOTHER GAME</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* ================= FOOTER ================= */}

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>🍉 TAP THE FRUITS!</Text>

        <Text style={styles.footerText}>Tap fruits to score points</Text>

        <Text style={styles.footerText}>
          💣 Avoid bombs — each bomb costs one life
        </Text>

        <Text style={styles.footerText}>
          🚀 Keep scoring to increase the level
        </Text>
      </View>
    </View>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

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
    fontSize: 68,
    marginBottom: 8,
  },

  readyHeading: {
    fontSize: 29,
    fontWeight: "900",
    color: "#18242d",
    textAlign: "center",
    marginTop: 5,
  },

  readyInfo: {
    textAlign: "center",
    color: "#66727b",
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
    backgroundColor: "#e85d04",
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
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  backButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#eef2f4",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  backButtonText: {
    color: "#27343d",
    fontSize: 14,
    fontWeight: "800",
  },

  /*
   * MAIN GAME
   */
  container: {
    flex: 1,
    backgroundColor: "#F4F8EC",
  },

  header: {
    height: 82,
    backgroundColor: "#18242d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#33424d",
  },

  statBox: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
  },

  statLabel: {
    color: "#9fb0bc",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 3,
  },

  statValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },

  gameArea: {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    overflow: "hidden",
    backgroundColor: "#DFF7D8",
    position: "relative",
  },

  gameObject: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  objectEmoji: {
    textAlign: "center",
    includeFontPadding: false,
  },

  /*
   * GAME OVER
   */
  gameOverOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.60)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    elevation: 100,
  },

  gameOverCard: {
    width: "84%",
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 30,
    alignItems: "center",
    elevation: 10,

    shadowColor: "#000000",

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.3,

    shadowRadius: 10,
  },

  gameOverEmoji: {
    fontSize: 52,
  },

  gameOverTitle: {
    fontSize: 30,
    fontWeight: "900",
    color: "#18242d",
    marginBottom: 15,
  },

  finalScoreLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#75818a",
    letterSpacing: 1,
  },

  finalScore: {
    fontSize: 48,
    fontWeight: "900",
    color: "#e85d04",
    marginTop: 2,
  },

  gameOverMessage: {
    fontSize: 14,
    color: "#66727b",
    marginTop: 4,
    marginBottom: 24,
  },

  playAgainButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#e85d04",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  playAgainText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  tryAnotherButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: "#eef2f4",
    alignItems: "center",
    justifyContent: "center",
  },

  tryAnotherText: {
    color: "#27343d",
    fontSize: 14,
    fontWeight: "800",
  },

  /*
   * FOOTER
   */
  footer: {
    flex: 1,
    backgroundColor: "#101820",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  footerTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 8,
  },

  footerText: {
    color: "#93a2ac",
    fontSize: 12,
    textAlign: "center",
    marginTop: 3,
  },
});
