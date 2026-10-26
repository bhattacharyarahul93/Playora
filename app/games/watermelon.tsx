import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { router } from "expo-router";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const GAME_WIDTH = SCREEN_WIDTH;

const GAME_HEIGHT = SCREEN_HEIGHT - 170;

const INITIAL_LIVES = 3;

const FRUIT_SCORE = 10;

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

type GameEffect = {
  id: number;
  type: "slice" | "blast";
  x: number;
  y: number;
  emoji: string;
};

const random = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

function AnimatedGameEffect({ effect }: { effect: GameEffect }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: effect.type === "blast" ? 620 : 420,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [effect.type, progress]);

  const scale = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.25, 1.1, 1.65],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.12, 0.72, 1],
    outputRange: [0, 1, 0.85, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.effectBurst,
        effect.type === "blast" ? styles.blastBurst : styles.sliceBurst,
        {
          left: effect.x - (effect.type === "blast" ? 48 : 38),
          top: effect.y - (effect.type === "blast" ? 48 : 38),
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      {effect.type === "blast" ? (
        <>
          <View style={styles.blastCore} />
          <Text style={styles.effectEmoji}>💥</Text>
          <Text style={styles.blastFlame}>🔥</Text>
          <View style={[styles.juiceDrop, styles.dropOne]} />
          <View style={[styles.juiceDrop, styles.dropTwo]} />
          <View style={[styles.juiceDrop, styles.dropThree]} />
        </>
      ) : (
        <>
          {/* <View style={styles.sliceCutLine} /> */}
          <View style={[styles.juiceDrop, styles.dropOne]} />
          <View style={[styles.juiceDrop, styles.dropTwo]} />
          <View style={[styles.juiceDrop, styles.dropThree]} />
          <View style={[styles.juiceDrop, styles.dropFour]} />
          <Text style={styles.effectEmoji}>{effect.emoji}</Text>
        </>
      )}
      {effect.type === "slice" && (
        <>
          <Text style={styles.sliceFruitLeft}>{effect.emoji}</Text>
          <Text style={styles.sliceFruitRight}>{effect.emoji}</Text>
        </>
      )}
      {effect.type === "blast" && <Text style={styles.blastLabel}>BOOM!</Text>}
    </Animated.View>
  );
}

export default function WatermelonPop() {
  const [objects, setObjects] = useState<GameObject[]>([]);

  const [score, setScore] = useState(0);

  const [lives, setLives] = useState(INITIAL_LIVES);

  const [combo, setCombo] = useState(0);

  const [difficultyLevel, setDifficultyLevel] = useState(1);

  const [effects, setEffects] = useState<GameEffect[]>([]);

  const [slash, setSlash] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  const previousTouchRef = useRef<{ x: number; y: number } | null>(null);

  const touchedObjectsRef = useRef<Set<number>>(new Set());

  const effectIdRef = useRef(1);

  const slashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const objectActionRef = useRef<(object: GameObject) => void>(() => {});

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

  const showEffect = useCallback(
    (type: GameEffect["type"], object: GameObject) => {
      const effect: GameEffect = {
        id: effectIdRef.current++,
        type,
        x: object.x + object.size / 2,
        y: object.y + object.size / 2,
        emoji: object.emoji,
      };
      setEffects((current) => [...current, effect]);
      setTimeout(
        () => {
          setEffects((current) =>
            current.filter((item) => item.id !== effect.id),
          );
        },
        type === "blast" ? 650 : 420,
      );
    },
    [],
  );

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

      /* A swipe slices fruit or detonates a bomb with a visual effect. */
      showEffect(object.type === "bomb" ? "blast" : "slice", object);

      /* Remove the hit object immediately. */
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

      // Levels continue forever: every 100 points advances the level.
      const newLevel = 1 + Math.floor(scoreRef.current / 100);

      if (newLevel !== difficultyLevel) {
        setDifficultyLevel(newLevel);
      }

      /*

       * Increase game speed

       * based on level.

       */

      // Speed ramps up as score grows, with a cap to keep the game playable.
      gameSpeedRef.current = Math.min(1 + (newLevel - 1) * 0.12, 3.5);

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

  const distanceToSegment = useCallback(
    (
      px: number,
      py: number,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
    ) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lengthSquared = dx * dx + dy * dy;
      const t =
        lengthSquared === 0
          ? 0
          : Math.max(
              0,
              Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared),
            );
      return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    },
    [],
  );

  // Gesture-based cutting: a quick finger swipe intersects fruit/bombs.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => stateRef.current === "playing",
      onMoveShouldSetPanResponder: () => stateRef.current === "playing",
      onPanResponderGrant: (event) => {
        const point = {
          x: event.nativeEvent.locationX,
          y: event.nativeEvent.locationY,
        };
        previousTouchRef.current = point;
        touchedObjectsRef.current.clear();
        setSlash({
          x1: point.x,
          y1: point.y,
          x2: point.x + 1,
          y2: point.y + 1,
        });
      },
      onPanResponderMove: (event) => {
        if (stateRef.current !== "playing") return;
        const point = {
          x: event.nativeEvent.locationX,
          y: event.nativeEvent.locationY,
        };
        const previous = previousTouchRef.current ?? point;
        setSlash({ x1: previous.x, y1: previous.y, x2: point.x, y2: point.y });
        if (slashTimerRef.current) clearTimeout(slashTimerRef.current);
        // slashTimerRef.current = setTimeout(() => setSlash(null), 100);

        const hits = objectsRef.current.filter((object) => {
          if (touchedObjectsRef.current.has(object.id)) return false;
          const centerX = object.x + object.size / 2;
          const centerY = object.y + object.size / 2;
          return (
            distanceToSegment(
              centerX,
              centerY,
              previous.x,
              previous.y,
              point.x,
              point.y,
            ) <=
            object.size * 0.58
          );
        });

        hits.forEach((object) => {
          touchedObjectsRef.current.add(object.id);

          // Remove the slicing line immediately when an object is hit.
          setSlash(null);

          objectActionRef.current(object);
        });

        previousTouchRef.current = point;
      },
      onPanResponderRelease: () => {
        previousTouchRef.current = null;
        touchedObjectsRef.current.clear();
        if (slashTimerRef.current) {
          clearTimeout(slashTimerRef.current);
          slashTimerRef.current = null;
        }

        setSlash(null);
      },
      onPanResponderTerminate: () => {
        previousTouchRef.current = null;
        touchedObjectsRef.current.clear();
        setSlash(null);
      },
    }),
  ).current;

  objectActionRef.current = handleObjectPress;

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

      const spawnInterval = Math.max(280, 950 / gameSpeedRef.current);

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

    setEffects([]);

    setSlash(null);

    previousTouchRef.current = null;

    touchedObjectsRef.current.clear();
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

    setEffects([]);

    setSlash(null);

    previousTouchRef.current = null;

    touchedObjectsRef.current.clear();

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
            Swipe through fruits to slice them. Avoid bombs because each bomb
            costs one life!
          </Text>

          <View style={styles.readyRules}>
            <Text style={styles.readyRule}>🍉 Slice fruit = +10 points</Text>

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

      <View style={styles.gameArea} {...panResponder.panHandlers}>
        <View pointerEvents="none" style={styles.woodTexture}>
          {Array.from({ length: 9 }, (_, index) => (
            <View key={index} style={[styles.woodPlank, { top: index * 82 }]}>
              <View style={styles.woodGrain} />
              <View style={styles.woodSeam} />
            </View>
          ))}
        </View>

        {objects.map((object) => {
          const rotation = `${object.rotation}deg`;

          return (
            <View
              key={object.id}
              pointerEvents="none"
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
            </View>
          );
        })}

        {/* Bright blade trail follows the finger swipe. */}
        {slash && (
          <View
            pointerEvents="none"
            style={[
              styles.slashTrail,
              {
                left: slash.x1,
                top: slash.y1,
                width: Math.max(
                  1,
                  Math.hypot(slash.x2 - slash.x1, slash.y2 - slash.y1),
                ),
                transform: [
                  {
                    rotate: `${Math.atan2(
                      slash.y2 - slash.y1,
                      slash.x2 - slash.x1,
                    )}rad`,
                  },
                ],
              },
            ]}
          >
            <View style={styles.slashOuter} />
            <View style={styles.slashWhite} />
          </View>
        )}

        {/* Short-lived fruit slice splashes and bomb explosions. */}
        {effects.map((effect) => (
          <AnimatedGameEffect key={effect.id} effect={effect} />
        ))}

        {/* ================= GAME OVER ================= */}

        {state === "completed" && (
          <View style={styles.gameOverOverlay}>
            <View style={styles.gameOverCard}>
              <Text style={styles.gameOverEmoji}>🍉</Text>

              <Text style={styles.gameOverTitle}>GAME OVER</Text>

              <Text style={styles.finalScoreLabel}>FINAL SCORE</Text>

              <Text style={styles.finalScore}>{score}</Text>

              <Text style={styles.gameOverMessage}>You ran out of lives!</Text>

              <Pressable onPress={startGame} style={styles.playAgainButton}>
                <Text style={styles.playAgainText}>PLAY AGAIN ↻</Text>
              </Pressable>

              <Pressable onPress={prepareGame} style={styles.tryAnotherButton}>
                <Text style={styles.tryAnotherText}>BACK TO MENU</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* ================= FOOTER ================= */}

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>🍉 SWIPE TO SLICE!</Text>

        <Text style={styles.footerText}>
          Swipe across fruits to slice and score points
        </Text>

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

  // gameArea: {
  //   width: GAME_WIDTH,

  //   height: GAME_HEIGHT,

  //   overflow: "hidden",

  //   backgroundColor: "#DFF7D8",

  //   position: "relative",
  // },

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

  // slashTrail: {
  //   position: "absolute",
  //   height: 4,
  //   borderRadius: 8,
  //   backgroundColor: "#FFF7D6",
  //   borderWidth: 1,
  //   borderColor: "#E7F6FF",
  //   shadowColor: "#D9F5FF",
  //   shadowOpacity: 0.75,
  //   shadowRadius: 5,
  //   elevation: 8,
  //   zIndex: 60,
  // },

  effectBurst: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 100,
    zIndex: 70,
  },

  sliceBurst: {
    width: 76,
    height: 76,
    backgroundColor: "rgba(210,35,24,0.10)",
    borderWidth: 0,
  },

  blastBurst: {
    width: 104,
    height: 104,
    backgroundColor: "rgba(255,92,12,0.20)",
    borderWidth: 2,
    borderColor: "rgba(255,210,95,0.9)",
  },

  blastCore: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,170,35,0.72)",
  },

  blastFlame: {
    position: "absolute",
    fontSize: 38,
    top: -20,
    right: -8,
  },

  // sliceCutLine: {
  //   position: "absolute",
  //   width: 58,
  //   height: 3,
  //   backgroundColor: "#FFF2D4",
  //   borderRadius: 3,
  //   transform: [{ rotate: "-42deg" }],
  //   shadowColor: "#FF3D22",
  //   shadowOpacity: 0.8,
  //   shadowRadius: 5,
  // },

  juiceDrop: {
    position: "absolute",
    width: 7,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#E52335",
    borderWidth: 1,
    borderColor: "#FF9C8A",
  },

  dropOne: { top: 7, left: 12, transform: [{ rotate: "25deg" }] },
  dropTwo: { top: 18, right: 7, transform: [{ rotate: "-20deg" }] },
  dropThree: { bottom: 8, left: 9, transform: [{ rotate: "-35deg" }] },
  dropFour: { bottom: 13, right: 10, transform: [{ rotate: "35deg" }] },

  effectEmoji: {
    fontSize: 34,
    textAlign: "center",
    textShadowColor: "rgba(255,210,80,0.65)",
    textShadowRadius: 8,
  },

  sliceFruitLeft: {
    position: "absolute",
    fontSize: 23,
    left: 2,
    bottom: 0,
    transform: [{ rotate: "-28deg" }, { translateX: -9 }, { translateY: 5 }],
  },

  sliceFruitRight: {
    position: "absolute",
    fontSize: 23,
    right: 2,
    bottom: 0,
    transform: [{ rotate: "28deg" }, { translateX: 9 }, { translateY: -5 }],
  },

  blastLabel: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 11,
    textShadowColor: "#B00000",
    textShadowRadius: 4,
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

    backgroundColor: "rgba(26,42,30,0.45)",

    alignItems: "center",

    justifyContent: "center",

    zIndex: 100,

    elevation: 100,
  },

  gameOverCard: {
    width: "100%",
    maxWidth: 360,

    backgroundColor: "#ffffff",

    borderRadius: 26,

    padding: 24,

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
    fontSize: 44,
  },

  gameOverTitle: {
    fontSize: 25,

    fontWeight: "900",

    color: "#263D2A",

    marginBottom: 8,
  },

  finalScoreLabel: {
    fontSize: 12,

    fontWeight: "800",

    color: "#75818a",

    letterSpacing: 1,
  },

  finalScore: {
    fontSize: 32,

    fontWeight: "900",

    color: "#e85d04",

    marginTop: 6,
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

  gameArea: {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    overflow: "hidden",
    backgroundColor: "#382015",
    position: "relative",
  },

  woodTexture: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    zIndex: 0,
    backgroundColor: "#3B2418",
  },

  woodPlank: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 82,
    backgroundColor: "#563321",
    borderTopWidth: 2,
    borderTopColor: "#74492D",
    borderBottomWidth: 3,
    borderBottomColor: "#24140E",
  },

  woodGrain: {
    position: "absolute",
    left: "8%",
    top: 20,
    width: "68%",
    height: 2,
    backgroundColor: "rgba(25, 12, 7, 0.28)",
    borderRadius: 2,
  },

  woodSeam: {
    position: "absolute",
    right: "13%",
    top: 42,
    width: "24%",
    height: 1,
    backgroundColor: "rgba(205, 145, 91, 0.18)",
  },

  slashGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -16,
    height: 32,
    borderRadius: 20,
    backgroundColor: "rgba(0, 255, 190, 0.28)",
    shadowColor: "#00FFD1",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 12,
  },

  slashColorEdge: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -7,
    height: 14,
    borderRadius: 10,
    backgroundColor: "#00E6B8",
    shadowColor: "#00FFE0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },

  slashCore: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -3,
    height: 6,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
  },

  slashHighlight: {
    position: "absolute",
    left: "15%",
    right: "15%",
    top: -1,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#E8FFFC",
  },

  slashLine: {
    position: "absolute",
    height: 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 1,
    zIndex: 999,
  },

  slashTrail: {
    position: "absolute",
    height: 0,
    zIndex: 999,
    overflow: "visible",
  },

  slashOuter: {
    position: "absolute",
    left: 0,
    top: -5,
    width: "100%",
    height: 10,
    backgroundColor: "rgba(180, 255, 255, 0.5)",
    borderRadius: 10,
  },

  slashWhite: {
    position: "absolute",
    left: 0,
    top: -2,
    width: "100%",
    height: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
  },
});
