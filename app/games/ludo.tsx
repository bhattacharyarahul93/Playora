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

type PlayerColor = "red" | "green" | "yellow" | "blue";

type Token = {
  id: number;

  progress: number;
};

type Player = {
  color: PlayerColor;

  name: string;

  tokens: Token[];
};

type Position = {
  row: number;

  col: number;
};

const COLORS: PlayerColor[] = ["red", "blue", "yellow", "green"];

const PLAYER_NAMES: Record<PlayerColor, string> = {
  red: "RED",

  green: "GREEN",

  yellow: "YELLOW",

  blue: "BLUE",
};

const COLOR_HEX: Record<PlayerColor, string> = {
  red: "#ED1C24",

  green: "#0AA34A",

  yellow: "#FFE600",

  blue: "#244A9A",
};

const COLOR_LIGHT: Record<PlayerColor, string> = {
  red: "#ED1C24",

  green: "#0AA34A",

  yellow: "#FFE600",

  blue: "#244A9A",
};

const START_INDEX: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

const FINISH_PROGRESS = 57;

// Start squares and safe squares eight track spaces after each start.
const SAFE_CELLS = new Set<number>([0, 8, 13, 21, 26, 34, 39, 47]);

/*

 * ==========================================================

 * GUTI BASE POSITIONS

 * ==========================================================

 */

const TOKEN_POSITIONS: Record<PlayerColor, Position[]> = {
  // Four starting gutis kept well inside each white home pad.
  // The home pads span approximately cells 0.62–5.38 and 9.62–14.38.
  red: [
    { row: 2, col: 2 },
    { row: 2, col: 3 },
    { row: 3, col: 2 },
    { row: 3, col: 3 },
  ],
  green: [
    { row: 2, col: 11 },
    { row: 2, col: 12 },
    { row: 3, col: 11 },
    { row: 3, col: 12 },
  ],
  blue: [
    { row: 11, col: 2 },
    { row: 11, col: 3 },
    { row: 12, col: 2 },
    { row: 12, col: 3 },
  ],
  yellow: [
    { row: 11, col: 11 },
    { row: 11, col: 12 },
    { row: 12, col: 11 },
    { row: 12, col: 12 },
  ],
};

/*

 * ==========================================================

 * 52-CELL LUDO TRACK

 * ==========================================================

 */

const TRACK: Position[] = [
  { row: 6, col: 1 },
  { row: 6, col: 2 },
  { row: 6, col: 3 },
  { row: 6, col: 4 },
  { row: 6, col: 5 },
  { row: 5, col: 6 },
  { row: 4, col: 6 },
  { row: 3, col: 6 },
  { row: 2, col: 6 },
  { row: 1, col: 6 },
  { row: 0, col: 6 },
  { row: 0, col: 7 },
  { row: 0, col: 8 },
  { row: 1, col: 8 },
  { row: 2, col: 8 },
  { row: 3, col: 8 },
  { row: 4, col: 8 },
  { row: 5, col: 8 },
  { row: 6, col: 9 },
  { row: 6, col: 10 },
  { row: 6, col: 11 },
  { row: 6, col: 12 },
  { row: 6, col: 13 },
  { row: 6, col: 14 },
  { row: 7, col: 14 },
  { row: 8, col: 14 },
  { row: 8, col: 13 },
  { row: 8, col: 12 },
  { row: 8, col: 11 },
  { row: 8, col: 10 },
  { row: 8, col: 9 },
  { row: 9, col: 8 },
  { row: 10, col: 8 },
  { row: 11, col: 8 },
  { row: 12, col: 8 },
  { row: 13, col: 8 },
  { row: 14, col: 8 },
  { row: 14, col: 7 },
  { row: 14, col: 6 },
  { row: 13, col: 6 },
  { row: 12, col: 6 },
  { row: 11, col: 6 },
  { row: 10, col: 6 },
  { row: 9, col: 6 },
  { row: 8, col: 5 },
  { row: 8, col: 4 },
  { row: 8, col: 3 },
  { row: 8, col: 2 },
  { row: 8, col: 1 },
  { row: 8, col: 0 },
  { row: 7, col: 0 },
  { row: 6, col: 0 },
];

/*

 * ==========================================================

 * HOME LANES

 *

 * Yellow and Blue are kept in the swapped positions

 * requested earlier.

 * ==========================================================

 */

const HOME_PATH: Record<PlayerColor, Position[]> = {
  red: [
    { row: 7, col: 1 },

    { row: 7, col: 2 },

    { row: 7, col: 3 },

    { row: 7, col: 4 },

    { row: 7, col: 5 },

    { row: 7, col: 6 },
  ],

  green: [
    { row: 1, col: 7 },

    { row: 2, col: 7 },

    { row: 3, col: 7 },

    { row: 4, col: 7 },

    { row: 5, col: 7 },

    { row: 6, col: 7 },
  ],

  yellow: [
    { row: 7, col: 13 },

    { row: 7, col: 12 },

    { row: 7, col: 11 },

    { row: 7, col: 10 },

    { row: 7, col: 9 },

    { row: 7, col: 8 },
  ],

  blue: [
    { row: 13, col: 7 },

    { row: 12, col: 7 },

    { row: 11, col: 7 },

    { row: 10, col: 7 },

    { row: 9, col: 7 },

    { row: 8, col: 7 },
  ],
};

/*

 * ==========================================================

 * CREATE PLAYERS

 * ==========================================================

 */

function createPlayers(): Player[] {
  return COLORS.map((color) => ({
    color,

    name: PLAYER_NAMES[color],

    tokens: [
      {
        id: 0,

        progress: -1,
      },

      {
        id: 1,

        progress: -1,
      },

      {
        id: 2,

        progress: -1,
      },

      {
        id: 3,

        progress: -1,
      },
    ],
  }));
}

/*

 * ==========================================================

 * GLOBAL TRACK POSITION

 * ==========================================================

 */

function getGlobalPosition(
  color: PlayerColor,

  progress: number,
): number | null {
  if (progress < 0 || progress >= 52) {
    return null;
  }

  return (START_INDEX[color] + progress) % 52;
}

/*

 * ==========================================================

 * CAN MOVE TOKEN

 * ==========================================================

 */

function canMoveToken(token: Token, dice: number): boolean {
  if (token.progress === FINISH_PROGRESS) {
    return false;
  }

  if (token.progress === -1) {
    return dice === 6;
  }

  return token.progress + dice <= FINISH_PROGRESS;
}

/*

 * ==========================================================

 * MAIN SCREEN

 * ==========================================================

 */

export default function LudoGame() {
  const router = useRouter();

  const { width, height } = useWindowDimensions();

  /*

   * Responsive board.

   */

  const boardSize = Math.min(width - 8, Math.max(280, height - 174));

  const cellSize = boardSize / 15;

  const gutiSize = cellSize * 0.72;

  /*

   * ========================================================

   * GAME STATE

   * ========================================================

   */

  const [gameState, setGameState] = useState<GameState>("ready");

  const [players, setPlayers] = useState<Player[]>(createPlayers);

  const [currentPlayer, setCurrentPlayer] = useState(0);

  const [dice, setDice] = useState(0);

  const [rolling, setRolling] = useState(false);

  const [message, setMessage] = useState("Press START GAME to begin.");

  const [winner, setWinner] = useState<PlayerColor | null>(null);
  const [totalWins, setTotalWins] = useState(0);

  const activePlayer = players[currentPlayer];

  /*

   * ========================================================

   * PREPARE GAME

   * ========================================================

   */

  useEffect(() => {
    let active = true;

    getAllProgress()
      .then((allProgress) => {
        if (active) setTotalWins(allProgress.ludo.highScore);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const prepareGame = useCallback(() => {
    setGameState("ready");

    setPlayers(createPlayers());

    setCurrentPlayer(0);

    setDice(0);

    setRolling(false);

    setWinner(null);

    setMessage("Press START GAME to begin.");
  }, []);

  /*

   * ========================================================

   * START GAME

   * ========================================================

   */

  const startGame = useCallback(() => {
    setGameState("playing");

    setPlayers(createPlayers());

    setCurrentPlayer(0);

    setDice(0);

    setRolling(false);

    setWinner(null);

    setMessage("RED player: roll the dice.");
  }, []);

  /*

   * ========================================================

   * NEXT PLAYER

   * ========================================================

   */

  const nextPlayer = useCallback((playerIndex: number) => {
    const next = (playerIndex + 1) % 4;

    setCurrentPlayer(next);

    setDice(0);

    setMessage(`${PLAYER_NAMES[COLORS[next]]} player: roll the dice.`);
  }, []);

  /*

   * ========================================================

   * GET TOKEN POSITION

   * ========================================================

   */

  const getTokenPosition = useCallback(
    (color: PlayerColor, token: Token): Position => {
      /*

       * Base.

       */

      if (token.progress === -1) {
        return TOKEN_POSITIONS[color][token.id];
      }

      /*

       * Finished.

       */

      if (token.progress >= FINISH_PROGRESS) {
        return {
          row: 7,

          col: 7,
        };
      }

      /*

       * Colored home lane.

       */

      if (token.progress >= 52) {
        return HOME_PATH[color][token.progress - 52];
      }

      /*

       * Common track.

       */

      const globalPosition = getGlobalPosition(color, token.progress);

      if (globalPosition === null) {
        return {
          row: 7,

          col: 7,
        };
      }

      return TRACK[globalPosition];
    },

    [],
  );

  /*

   * ========================================================

   * TOKEN MOVABLE

   * ========================================================

   */

  const isTokenMovable = useCallback(
    (token: Token) => {
      if (gameState !== "playing") {
        return false;
      }

      if (dice === 0) {
        return false;
      }

      return canMoveToken(token, dice);
    },

    [dice, gameState],
  );

  /*

   * ========================================================

   * MOVE TOKEN

   * ========================================================

   */

  const moveToken = useCallback(
    (tokenId: number, diceValue: number) => {
      if (gameState !== "playing") {
        return;
      }

      if (rolling) {
        return;
      }

      if (diceValue <= 0) {
        return;
      }

      const current = players[currentPlayer];

      const selectedToken = current.tokens.find(
        (token) => token.id === tokenId,
      );

      if (!selectedToken) {
        return;
      }

      if (!canMoveToken(selectedToken, diceValue)) {
        return;
      }

      let newProgress = selectedToken.progress;

      /*

       * Guti leaves base on 6.

       */

      if (selectedToken.progress === -1) {
        newProgress = 0;
      } else {
        newProgress += diceValue;
      }

      /*

       * Clone players.

       */

      const updatedPlayers = players.map((player) => ({
        ...player,

        tokens: player.tokens.map((token) => ({
          ...token,
        })),
      }));

      const movingPlayer = updatedPlayers[currentPlayer];

      const movingToken = movingPlayer.tokens.find(
        (token) => token.id === tokenId,
      );

      if (!movingToken) {
        return;
      }

      movingToken.progress = newProgress;

      /*

       * ======================================================

       * CAPTURE

       * ======================================================

       */

      let captured = false;

      const globalPosition = getGlobalPosition(movingPlayer.color, newProgress);

      if (globalPosition !== null && !SAFE_CELLS.has(globalPosition)) {
        updatedPlayers.forEach((opponent, index) => {
          if (index === currentPlayer) {
            return;
          }

          opponent.tokens.forEach((opponentToken) => {
            const opponentPosition = getGlobalPosition(
              opponent.color,

              opponentToken.progress,
            );

            if (
              opponentPosition !== null &&
              opponentPosition === globalPosition
            ) {
              opponentToken.progress = -1;

              captured = true;
            }
          });
        });
      }

      /*

       * ======================================================

       * WIN

       * ======================================================

       */

      const playerWon = movingPlayer.tokens.every(
        (token) => token.progress === FINISH_PROGRESS,
      );

      setPlayers(updatedPlayers);

      setRolling(false);

      if (playerWon) {
        setWinner(movingPlayer.color);

        setDice(0);

        setGameState("completed");

        setMessage(`${movingPlayer.name} wins!`);

        getAllProgress()
          .then(async (allProgress) => {
            const previous = allProgress.ludo;
            const updatedProgress = {
              ...previous,
              // For Ludo, highScore tracks the number of completed wins.
              highScore: previous.highScore + 1,
              stars: Math.max(previous.stars, 3),
            };

            await saveGameProgress("ludo", updatedProgress);
            setTotalWins(updatedProgress.highScore);
          })
          .catch((error) => {
            console.warn("Unable to save Ludo progress:", error);
          });

        return;
      }

      /*

       * ======================================================

       * EXTRA TURN

       * ======================================================

       *

       * 6 OR capture = extra turn.

       *

       * If both happen together,

       * there is still only one extra turn.

       */

      if (diceValue === 6 || captured) {
        setDice(0);

        if (diceValue === 6 && captured) {
          setMessage(`${movingPlayer.name} rolled 6 and captured! Extra turn!`);
        } else if (captured) {
          setMessage(`${movingPlayer.name} captured a guti! Extra turn!`);
        } else {
          setMessage(`${movingPlayer.name} rolled 6! Extra turn!`);
        }

        return;
      }

      /*

       * Normal next turn.

       */

      nextPlayer(currentPlayer);
    },

    [currentPlayer, gameState, nextPlayer, players, rolling],
  );

  /*

   * ========================================================

   * ROLL DICE

   * ========================================================

   */

  const rollDice = useCallback(() => {
    if (gameState !== "playing") {
      return;
    }

    if (rolling) {
      return;
    }

    if (dice !== 0) {
      return;
    }

    setRolling(true);

    let count = 0;

    const timer = setInterval(() => {
      const random = Math.floor(Math.random() * 6) + 1;

      setDice(random);

      count++;

      if (count >= 8) {
        clearInterval(timer);

        const finalDice = Math.floor(Math.random() * 6) + 1;

        setDice(finalDice);

        setRolling(false);

        const current = players[currentPlayer];

        const movable = current.tokens.filter((token) =>
          canMoveToken(token, finalDice),
        );

        /*

         * No legal move.

         */

        if (movable.length === 0) {
          if (finalDice === 6) {
            setDice(0);

            setMessage(`${current.name} rolled 6. Extra turn!`);

            return;
          }

          setMessage(`${current.name} has no valid move.`);

          setTimeout(() => {
            nextPlayer(currentPlayer);
          }, 600);

          return;
        }

        /*

         * One legal token.

         */

        if (movable.length === 1) {
          setTimeout(() => {
            moveToken(movable[0].id, finalDice);
          }, 250);

          return;
        }

        /*

         * Multiple legal tokens.

         */

        setMessage(`${current.name}: choose a highlighted guti.`);
      }
    }, 70);
  }, [currentPlayer, dice, gameState, moveToken, nextPlayer, players, rolling]);

  /*

   * ========================================================

   * BOARD CELLS

   * ========================================================

   */

  const boardCells = useMemo(() => {
    return Array.from(
      {
        length: 225,
      },

      (_, index) => {
        const row = Math.floor(index / 15);

        const col = index % 15;

        let background = "#FFFFFF";

        /*

         * Red home.

         */

        if (row <= 5 && col <= 5) {
          background = COLOR_HEX.red;
        }

        /*

         * Green home.

         */

        if (row <= 5 && col >= 9) {
          background = COLOR_HEX.green;
        }

        /*

         * Blue home (bottom-left).

         */

        if (row >= 9 && col <= 5) {
          background = COLOR_HEX.blue;
        }

        /*

         * Yellow home (bottom-right).

         */

        if (row >= 9 && col >= 9) {
          background = COLOR_HEX.yellow;
        }

        /*

         * Home lanes.

         */

        COLORS.forEach((color) => {
          const exists = HOME_PATH[color].some(
            (position) => position.row === row && position.col === col,
          );

          if (exists) {
            background = COLOR_HEX[color];
          }
        });

        // Arrow squares stay white. These are the four outer middle squares.
        const isArrowSquare =
          (row === 0 && col === 7) ||
          (row === 7 && col === 14) ||
          (row === 14 && col === 7) ||
          (row === 7 && col === 0);

        if (isArrowSquare) {
          background = "#FFFFFF";
        }

        // Colour only each player's real starting track square, where its guti enters the track.
        COLORS.forEach((color) => {
          const startSquare = TRACK[START_INDEX[color]];
          if (startSquare.row === row && startSquare.col === col) {
            background = COLOR_HEX[color];
          }
        });

        // Keep the 3x3 centre white.
        if (row >= 6 && row <= 8 && col >= 6 && col <= 8) {
          background = "#FFFFFF";
        }

        return {
          row,

          col,

          background,
        };
      },
    );
  }, []);

  /*

   * ========================================================

   * GUTI OFFSET

   * ========================================================

   */

  const getGutiOffset = (_playerIndex: number, tokenId: number) => {
    const offsets = [
      {
        x: 0,

        y: 0,
      },

      {
        x: 0.13,

        y: 0,
      },

      {
        x: 0,

        y: 0.13,
      },

      {
        x: 0.13,

        y: 0.13,
      },
    ];

    const offset = offsets[tokenId % offsets.length];

    return {
      x: offset.x,
      y: offset.y,
    };
  };

  /*

   * ========================================================

   * INITIAL READY STATE

   * ========================================================

   */

  useEffect(() => {
    prepareGame();
  }, [prepareGame]);

  /*

   * ========================================================

   * RENDER

   * ========================================================

   */

  return (
    <View style={styles.fullScreen}>
      <StatusBar hidden />

      {/* ==================================================

          READY SCREEN

          ================================================== */}

      {gameState === "ready" && (
        <View style={styles.readyBackground}>
          {/* SETTINGS */}

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
              {/* LUDO ICON */}

              <View style={styles.ludoIconContainer}>
                <Text style={styles.ludoIcon}>🎲</Text>
              </View>

              {/* GAME NAME */}

              <Text style={styles.readyTitle}>LUDO</Text>

              {/* HEADING */}

              <Text style={styles.readyHeading}>Ready to play?</Text>

              {/* DESCRIPTION */}

              <Text style={styles.readyDescription}>
                Roll the dice, move your gutis around the board and capture your
                opponents!
              </Text>

              <Text style={styles.savedWinsText}>
                🏆 Total wins: {totalWins}
              </Text>

              {/* RULES */}

              <View style={styles.rulesCard}>
                <View style={styles.ruleRow}>
                  <Text style={styles.ruleEmoji}>🎲</Text>

                  <Text style={styles.ruleText}>
                    Roll 6 to bring a guti out
                  </Text>
                </View>

                <View style={styles.ruleRow}>
                  <Text style={styles.ruleEmoji}>🏃</Text>

                  <Text style={styles.ruleText}>
                    Move your gutis around the board
                  </Text>
                </View>

                <View style={styles.ruleRow}>
                  <Text style={styles.ruleEmoji}>💥</Text>

                  <Text style={styles.ruleText}>
                    Capture an opponent for +1 turn
                  </Text>
                </View>

                <View style={styles.ruleRow}>
                  <Text style={styles.ruleEmoji}>🏆</Text>

                  <Text style={styles.ruleText}>
                    Get all 4 gutis home to win
                  </Text>
                </View>
              </View>

              {/* START GAME */}

              <Pressable
                style={({ pressed }) => [
                  styles.readyStartButton,

                  pressed && styles.buttonPressed,
                ]}
                onPress={startGame}
              >
                <Text style={styles.readyStartText}>START GAME</Text>
              </Pressable>

              {/* BACK */}

              <Pressable
                style={({ pressed }) => [
                  styles.readyBackButton,

                  pressed && styles.buttonPressed,
                ]}
                onPress={() => router.back()}
              >
                <Text style={styles.readyBackText}>BACK TO GAMES</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      )}

      {/* ==================================================

          GAMEPLAY

          ================================================== */}

      {gameState === "playing" && (
        <View style={styles.gameScreen}>
          {/* HEADER */}

          <View style={styles.topBar}>
            <Pressable
              style={styles.smallBackButton}
              onPress={() => router.back()}
            >
              <Text style={styles.smallBackText}>‹</Text>
            </Pressable>

            <View style={styles.turnContainer}>
              <View
                style={[
                  styles.turnDot,

                  {
                    backgroundColor: COLOR_HEX[activePlayer.color],
                  },
                ]}
              />

              <Text style={styles.turnText}>
                {activePlayer.name}
                'S TURN
              </Text>
            </View>

            <View style={styles.diceSmall}>
              <Text style={styles.diceSmallText}>{dice || "?"}</Text>
            </View>
          </View>

          {/* MESSAGE */}

          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>{message}</Text>
          </View>

          {/* BOARD */}

          <View style={styles.boardContainer}>
            <View
              style={[
                styles.board,

                {
                  width: boardSize,

                  height: boardSize,
                },
              ]}
            >
              {/* CELLS */}

              {boardCells.map((cell) => {
                const trackIndex = TRACK.findIndex(
                  (position) =>
                    position.row === cell.row && position.col === cell.col,
                );

                const isSafe = trackIndex >= 0 && SAFE_CELLS.has(trackIndex);
                const isHomeCorner =
                  (cell.row <= 5 && cell.col <= 5) ||
                  (cell.row <= 5 && cell.col >= 9) ||
                  (cell.row >= 9 && cell.col <= 5) ||
                  (cell.row >= 9 && cell.col >= 9);

                return (
                  <View
                    key={`${cell.row}-${cell.col}`}
                    style={[
                      styles.cell,
                      {
                        width: cellSize,
                        height: cellSize,
                        left: cell.col * cellSize,
                        top: cell.row * cellSize,
                        backgroundColor: cell.background,
                        borderWidth: isHomeCorner ? 0 : 0.7,
                        borderColor: isHomeCorner ? cell.background : "#202020",
                      },
                    ]}
                  >
                    {isSafe && (
                      <Text
                        style={[
                          styles.safeIcon,

                          {
                            fontSize: cellSize * 0.55,
                          },
                        ]}
                      >
                        ★
                      </Text>
                    )}
                  </View>
                );
              })}

              {/* WHITE HOME PADS WITH COLOURED DOUBLE OUTLINES */}

              {[
                { color: "red" as PlayerColor, row: 0, col: 0 },

                { color: "green" as PlayerColor, row: 0, col: 9 },

                { color: "blue" as PlayerColor, row: 9, col: 0 },
                { color: "yellow" as PlayerColor, row: 9, col: 9 },
              ].map((home) => (
                <View
                  key={`home-${home.color}`}
                  pointerEvents="none"
                  style={{
                    position: "absolute",

                    left: home.col * cellSize + cellSize * 0.62,

                    top: home.row * cellSize + cellSize * 0.62,

                    width: cellSize * 4.76,

                    height: cellSize * 4.76,

                    borderRadius: cellSize * 0.48,

                    borderWidth: cellSize * 0.28,

                    borderColor: COLOR_HEX[home.color],

                    backgroundColor: "#FFFFFF",

                    zIndex: 2,
                  }}
                ></View>
              ))}

              {/* CENTER: FOUR TRIANGLES LIKE THE REFERENCE BOARD */}

              <View
                style={[
                  styles.centerHome,

                  {
                    width: cellSize * 3,

                    height: cellSize * 3,

                    left: cellSize * 6,

                    top: cellSize * 6,
                  },
                ]}
              >
                <View
                  style={{
                    position: "absolute",

                    left: cellSize * 0.75,

                    top: 0,

                    width: 0,

                    height: 0,

                    borderLeftWidth: cellSize * 0.75,

                    borderRightWidth: cellSize * 0.75,

                    borderBottomWidth: cellSize * 1.5,

                    borderLeftColor: "transparent",

                    borderRightColor: "transparent",

                    borderBottomColor: COLOR_HEX.green,
                  }}
                />

                <View
                  style={{
                    position: "absolute",

                    right: 0,

                    top: cellSize * 0.75,

                    width: 0,

                    height: 0,

                    borderTopWidth: cellSize * 0.75,

                    borderBottomWidth: cellSize * 0.75,

                    borderLeftWidth: cellSize * 1.5,

                    borderTopColor: "transparent",

                    borderBottomColor: "transparent",

                    borderLeftColor: COLOR_HEX.yellow,
                  }}
                />

                <View
                  style={{
                    position: "absolute",

                    left: cellSize * 0.75,

                    bottom: 0,

                    width: 0,

                    height: 0,

                    borderLeftWidth: cellSize * 0.75,

                    borderRightWidth: cellSize * 0.75,

                    borderTopWidth: cellSize * 1.5,

                    borderLeftColor: "transparent",

                    borderRightColor: "transparent",

                    borderTopColor: COLOR_HEX.blue,
                  }}
                />

                <View
                  style={{
                    position: "absolute",

                    left: 0,

                    top: cellSize * 0.75,

                    width: 0,

                    height: 0,

                    borderTopWidth: cellSize * 0.75,

                    borderBottomWidth: cellSize * 0.75,

                    borderRightWidth: cellSize * 1.5,

                    borderTopColor: "transparent",

                    borderBottomColor: "transparent",

                    borderRightColor: COLOR_HEX.red,
                  }}
                />

                <View style={styles.centerCircle}>
                  <Text
                    style={[styles.centerStar, { fontSize: cellSize * 0.65 }]}
                  >
                    ★
                  </Text>
                </View>
              </View>

              {/* ARROWS */}

              <Text
                style={[
                  styles.arrow,

                  {
                    left: cellSize * 7 + (cellSize - cellSize * 0.65) / 2,

                    top: (cellSize - cellSize * 0.65) / 2,

                    fontSize: cellSize * 0.65,
                  },
                ]}
              >
                ↓
              </Text>

              <Text
                style={[
                  styles.arrow,

                  {
                    right: (cellSize - cellSize * 0.65) / 2,

                    top: cellSize * 7 + (cellSize - cellSize * 0.65) / 2,

                    fontSize: cellSize * 0.65,
                  },
                ]}
              >
                ←
              </Text>

              <Text
                style={[
                  styles.arrow,

                  {
                    left: cellSize * 7 + (cellSize - cellSize * 0.65) / 2,

                    bottom: (cellSize - cellSize * 0.65) / 2,

                    fontSize: cellSize * 0.65,
                  },
                ]}
              >
                ↑
              </Text>

              <Text
                style={[
                  styles.arrow,

                  {
                    left: (cellSize - cellSize * 0.65) / 2,

                    top: cellSize * 7 + (cellSize - cellSize * 0.65) / 2,

                    fontSize: cellSize * 0.65,
                  },
                ]}
              >
                →
              </Text>

              {/* GUTIS */}

              {players.map((player, playerIndex) =>
                player.tokens.map((token) => {
                  const position = getTokenPosition(player.color, token);

                  const movable =
                    player.color === activePlayer.color &&
                    isTokenMovable(token);

                  const offset =
                    token.progress === -1
                      ? { x: 0, y: 0 }
                      : getGutiOffset(playerIndex, token.id);

                  const left =
                    position.col * cellSize +
                    (cellSize - gutiSize) / 2 +
                    offset.x * cellSize;

                  const top =
                    position.row * cellSize +
                    (cellSize - gutiSize) / 2 +
                    offset.y * cellSize;

                  return (
                    <Pressable
                      key={`${player.color}-${token.id}`}
                      disabled={!movable}
                      onPress={() => moveToken(token.id, dice)}
                      style={[
                        styles.guti,

                        {
                          width: gutiSize,

                          height: gutiSize,

                          left,

                          top,

                          borderRadius: gutiSize / 2,
                        },

                        movable && styles.movableGuti,
                      ]}
                    >
                      <View
                        style={[
                          styles.gutiOuter,

                          {
                            width: gutiSize * 0.94,

                            height: gutiSize * 0.94,

                            borderRadius: (gutiSize * 0.94) / 2,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.gutiInner,

                            {
                              width: gutiSize * 0.64,

                              height: gutiSize * 0.64,

                              borderRadius: (gutiSize * 0.64) / 2,

                              backgroundColor: COLOR_HEX[player.color],
                            },
                          ]}
                        />

                        <View
                          style={[
                            styles.gutiHighlight,

                            {
                              width: gutiSize * 0.18,

                              height: gutiSize * 0.18,

                              borderRadius: (gutiSize * 0.18) / 2,
                            },
                          ]}
                        />
                      </View>
                    </Pressable>
                  );
                }),
              )}
            </View>
          </View>

          {/* DICE CONTROLS */}

          <View style={styles.bottomBar}>
            <View style={styles.diceLarge}>
              <Text style={styles.diceLargeText}>{dice || "?"}</Text>
            </View>

            <Pressable
              disabled={rolling || dice !== 0}
              onPress={rollDice}
              style={({ pressed }) => [
                styles.rollButton,

                {
                  backgroundColor: COLOR_HEX[activePlayer.color],
                  borderColor:
                    activePlayer.color === "yellow"
                      ? "#D4A900"
                      : COLOR_HEX[activePlayer.color],
                },

                (rolling || dice !== 0) && styles.rollButtonDisabled,

                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.rollButtonText,
                  {
                    color:
                      activePlayer.color === "yellow" ? "#18242D" : "#FFFFFF",
                  },
                ]}
              >
                {rolling
                  ? "ROLLING..."
                  : dice !== 0
                    ? "SELECT GUTI"
                    : "ROLL DICE"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* ==================================================

          WINNER

          ================================================== */}

      {gameState === "completed" && winner && (
        <View style={styles.winnerScreen}>
          <Text style={styles.winnerTrophy}>🏆</Text>

          <Text style={styles.winnerTitle}>{PLAYER_NAMES[winner]}</Text>

          <Text style={styles.winnerSubtitle}>WINS THE GAME!</Text>

          <View
            style={[
              styles.winnerLine,

              {
                backgroundColor: COLOR_HEX[winner],
              },
            ]}
          />

          <Text style={styles.winnerInfo}>All 4 gutis reached home.</Text>

          <Pressable
            style={({ pressed }) => [
              styles.playAgainButton,

              {
                backgroundColor: COLOR_HEX[winner],
              },

              pressed && styles.buttonPressed,
            ]}
            onPress={prepareGame}
          >
            <Text style={styles.playAgainText}>PLAY AGAIN</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.homeButton,

              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.homeButtonText}>TRY ANOTHER GAME</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/*

 * ==========================================================

 * STYLES

 * ==========================================================

 */

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,

    backgroundColor: "#FFFFFF",
  },

  /*

   * ========================================================

   * READY SCREEN

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

  /*

   * SETTINGS BUTTON

   */

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

  /*

   * WHITE READY CARD

   */

  readyCard: {
    width: "100%",

    maxWidth: 650,

    backgroundColor: "#FFFFFF",

    borderRadius: 34,

    paddingHorizontal: 46,

    paddingTop: 62,

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

  /*

   * LUDO ICON

   */

  ludoIconContainer: {
    width: 112,

    height: 112,

    alignItems: "center",

    justifyContent: "center",

    marginBottom: 5,
  },

  ludoIcon: {
    fontSize: 76,
  },

  /*

   * TITLE

   */

  readyTitle: {
    color: "#25202D",

    fontSize: 32,

    fontWeight: "900",

    letterSpacing: 2,

    marginTop: 2,
  },

  readyHeading: {
    color: "#25202D",

    fontSize: 31,

    fontWeight: "900",

    marginTop: 16,

    textAlign: "center",
  },

  /*

   * DESCRIPTION

   */

  savedWinsText: {
    color: "#199A4A",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 10,
  },

  readyDescription: {
    color: "#68717A",

    fontSize: 17,

    lineHeight: 26,

    textAlign: "center",

    marginTop: 10,

    maxWidth: 520,
  },

  /*

   * RULE CARD

   */

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

  /*

   * START GAME

   */

  readyStartButton: {
    width: "100%",

    height: 66,

    borderRadius: 20,

    backgroundColor: "#19A950",

    alignItems: "center",

    justifyContent: "center",

    marginTop: 28,
  },

  readyStartText: {
    color: "#FFFFFF",

    fontSize: 22,

    fontWeight: "900",

    letterSpacing: 1,
  },

  /*

   * BACK TO GAMES

   */

  readyBackButton: {
    width: "100%",

    height: 66,

    borderRadius: 20,

    backgroundColor: "#F4F7EA",

    alignItems: "center",

    justifyContent: "center",

    marginTop: 12,
  },

  readyBackText: {
    color: "#199A4A",

    fontSize: 15,

    fontWeight: "900",

    letterSpacing: 0.5,
  },

  /*

   * ========================================================

   * GAME SCREEN

   * ========================================================

   */

  gameScreen: {
    flex: 1,

    backgroundColor: "#FFFFFF",

    alignItems: "center",

    overflow: "hidden",
  },

  topBar: {
    width: "100%",

    height: 72,

    backgroundColor: "#18242D",

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    paddingHorizontal: 10,

    paddingTop: 55,

    paddingBottom: 8,
  },

  smallBackButton: {
    width: 36,

    height: 36,

    borderRadius: 18,

    backgroundColor: "rgba(255,255,255,0.12)",

    alignItems: "center",

    justifyContent: "center",
  },

  smallBackText: {
    color: "#FFFFFF",

    fontSize: 29,

    lineHeight: 33,

    marginTop: -3,
  },

  turnContainer: {
    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "rgba(255,255,255,0.14)",

    paddingHorizontal: 16,

    paddingVertical: 11,

    borderRadius: 22,

    borderWidth: 2,

    borderColor: "rgba(255,255,255,0.75)",

    elevation: 5,
  },

  turnDot: {
    width: 16,

    height: 16,

    borderRadius: 8,

    marginRight: 7,

    borderWidth: 1,

    borderColor: "#FFFFFF",
  },

  turnText: {
    color: "#FFFFFF",

    fontSize: 15,

    fontWeight: "900",

    letterSpacing: 0.8,
  },

  diceSmall: {
    width: 44,

    height: 44,

    borderRadius: 12,

    backgroundColor: "#FFFFFF",

    borderWidth: 2,

    borderColor: "#F6C453",

    alignItems: "center",

    justifyContent: "center",

    elevation: 6,
  },

  diceSmallText: {
    color: "#18242D",

    fontSize: 17,

    fontWeight: "900",
  },

  /*

   * MESSAGE

   */

  messageContainer: {
    width: "100%",

    minHeight: 29,

    backgroundColor: "#F4F8EC",

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 8,
  },

  messageText: {
    color: "#536258",

    fontSize: 10,

    fontWeight: "800",

    textAlign: "center",
  },

  /*

   * BOARD

   */

  boardContainer: {
    flex: 1,

    width: "100%",

    alignItems: "center",

    justifyContent: "center",
  },

  board: {
    position: "relative",

    backgroundColor: "#FFFFFF",

    borderWidth: 2,

    borderColor: "#111111",

    overflow: "hidden",
  },

  cell: {
    position: "absolute",

    alignItems: "center",

    justifyContent: "center",

    borderWidth: 0.7,

    borderColor: "#202020",
  },

  safeIcon: {
    color: "#777777",

    fontWeight: "900",
  },

  /*

   * CENTER

   */

  centerHome: {
    position: "absolute",

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#18242D",

    overflow: "hidden",

    zIndex: 10,
  },

  centerPart: {
    position: "absolute",
  },

  centerCircle: {
    position: "absolute",

    width: "40%",

    height: "40%",

    left: "30%",

    top: "30%",

    borderRadius: 999,

    backgroundColor: "#FFFFFF",

    alignItems: "center",

    justifyContent: "center",

    zIndex: 20,

    borderWidth: 1,

    borderColor: "rgba(0,0,0,0.15)",
  },

  centerStar: {
    color: "#18242D",

    fontWeight: "900",
  },

  /*

   * ARROWS

   */

  arrow: {
    position: "absolute",

    color: "#777777",

    fontWeight: "900",

    zIndex: 12,
  },

  /*

   * GUTI

   */

  guti: {
    position: "absolute",

    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#FFFFFF",

    borderWidth: 1.5,

    borderColor: "#6F6F6F",

    shadowColor: "#000000",

    shadowOpacity: 0.3,

    shadowRadius: 3,

    shadowOffset: {
      width: 0,

      height: 2,
    },

    elevation: 8,

    zIndex: 50,
  },

  gutiOuter: {
    alignItems: "center",

    justifyContent: "center",

    backgroundColor: "#FFFFFF",

    borderWidth: 1,

    borderColor: "#B9B9B9",

    shadowColor: "#000000",

    shadowOpacity: 0.2,

    shadowRadius: 2,

    shadowOffset: {
      width: 0,

      height: 1,
    },

    elevation: 5,
  },

  gutiInner: {
    position: "absolute",

    borderWidth: 1.5,

    borderColor: "rgba(0,0,0,0.25)",

    shadowColor: "#000000",

    shadowOpacity: 0.3,

    shadowRadius: 2,

    shadowOffset: {
      width: 0,

      height: 1,
    },

    elevation: 4,
  },

  gutiHighlight: {
    position: "absolute",

    top: "20%",

    left: "20%",

    backgroundColor: "rgba(255,255,255,0.72)",
  },

  movableGuti: {
    borderColor: "#18242D",

    borderWidth: 3,

    shadowColor: "#18242D",

    shadowOpacity: 0.65,

    shadowRadius: 7,

    shadowOffset: {
      width: 0,

      height: 2,
    },

    elevation: 16,

    transform: [
      {
        scale: 1.12,
      },
    ],
  },

  /*

   * BOTTOM BAR

   */

  bottomBar: {
    width: "100%",

    height: 72,

    backgroundColor: "#18242D",

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 14,
  },

  diceLarge: {
    width: 66,

    height: 66,

    borderRadius: 17,

    backgroundColor: "#FFFFFF",

    borderWidth: 3,

    borderColor: "#F6C453",

    alignItems: "center",

    justifyContent: "center",

    elevation: 9,

    shadowColor: "#000000",

    shadowOffset: { width: 0, height: 4 },

    shadowOpacity: 0.3,

    shadowRadius: 5,
  },

  diceLargeText: {
    color: "#18242D",

    fontSize: 23,

    fontWeight: "900",
  },

  rollButton: {
    height: 58,

    minWidth: 180,

    paddingHorizontal: 24,

    borderRadius: 18,

    backgroundColor: "#F6C453",

    borderWidth: 2,

    borderColor: "#FFFFFF",

    alignItems: "center",

    justifyContent: "center",

    elevation: 7,

    shadowColor: "#000000",

    shadowOffset: { width: 0, height: 3 },

    shadowOpacity: 0.25,

    shadowRadius: 4,
  },

  rollButtonDisabled: {
    opacity: 0.45,
  },

  rollButtonText: {
    color: "#18242D",

    fontSize: 15,

    fontWeight: "900",

    letterSpacing: 0.8,
  },

  /*

   * ========================================================

   * WINNER

   * ========================================================

   */

  winnerScreen: {
    flex: 1,

    backgroundColor: "#DFF7D8",

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 25,
  },

  winnerTrophy: {
    fontSize: 75,
  },

  winnerTitle: {
    color: "#18242D",

    fontSize: 38,

    fontWeight: "900",

    marginTop: 8,

    letterSpacing: 1,
  },

  winnerSubtitle: {
    color: "#536258",

    fontSize: 14,

    fontWeight: "900",

    letterSpacing: 2,

    marginTop: 2,
  },

  winnerLine: {
    width: 65,

    height: 8,

    borderRadius: 4,

    marginTop: 14,
  },

  winnerInfo: {
    color: "#68756A",

    fontSize: 14,

    fontWeight: "700",

    marginTop: 15,

    marginBottom: 25,
  },

  playAgainButton: {
    width: "100%",

    maxWidth: 350,

    height: 54,

    borderRadius: 17,

    alignItems: "center",

    justifyContent: "center",
  },

  playAgainText: {
    color: "#FFFFFF",

    fontSize: 15,

    fontWeight: "900",

    letterSpacing: 0.8,
  },

  homeButton: {
    width: "100%",

    maxWidth: 350,

    height: 54,

    borderRadius: 17,

    backgroundColor: "#18242D",

    alignItems: "center",

    justifyContent: "center",

    marginTop: 11,
  },

  homeButtonText: {
    color: "#FFFFFF",

    fontSize: 13,

    fontWeight: "900",

    letterSpacing: 0.7,
  },

  /*

   * PRESS EFFECT

   */

  buttonPressed: {
    opacity: 0.78,

    transform: [
      {
        scale: 0.98,
      },
    ],
  },
});
