import React, { useCallback, useMemo, useRef, useState } from "react";

import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { useRouter } from "expo-router";
import { getAllProgress, saveGameProgress } from "../../src/services/storage";

const GRID_SIZE = 10;

const WORD_COUNT = 10;

const HINT_COUNT = 3;

type GameState = "ready" | "playing" | "completed";

type Cell = {
  row: number;

  col: number;
};

type FoundWord = {
  answer: string;

  cells: Cell[];
};

type WordEntry = {
  answer: string;

  clue: string;

  category: string;
};

type PlacedWord = WordEntry & {
  cells: Cell[];
};

const WORD_BANK: WordEntry[] = [
  {
    answer: "DIAMOND",

    clue: "Precious gem found in many engagement rings",

    category: "GEMS",
  },

  {
    answer: "ELEPHANT",

    clue: "The largest land animal",

    category: "ANIMALS",
  },

  {
    answer: "RAINBOW",

    clue: "Colorful arc seen after rain",

    category: "NATURE",
  },

  {
    answer: "PYRAMID",

    clue: "Ancient triangular monument",

    category: "HISTORY",
  },

  {
    answer: "GUITAR",

    clue: "String instrument often used in rock music",

    category: "MUSIC",
  },

  {
    answer: "VOLCANO",

    clue: "Mountain that can erupt with lava",

    category: "NATURE",
  },

  {
    answer: "SUNFLOWER",

    clue: "Tall yellow flower that follows the sun",

    category: "PLANTS",
  },

  {
    answer: "OCTOPUS",

    clue: "Sea creature with eight arms",

    category: "ANIMALS",
  },

  {
    answer: "CASTLE",

    clue: "Fortified home of a king or queen",

    category: "HISTORY",
  },

  {
    answer: "ROCKET",

    clue: "Vehicle used to travel into space",

    category: "SPACE",
  },

  {
    answer: "TIGER",

    clue: "Large striped wild cat",

    category: "ANIMALS",
  },

  {
    answer: "PLANET",

    clue: "Large object that orbits a star",

    category: "SPACE",
  },

  {
    answer: "PIANO",

    clue: "Musical instrument with black and white keys",

    category: "MUSIC",
  },

  {
    answer: "FOREST",

    clue: "Large area filled with trees",

    category: "NATURE",
  },

  {
    answer: "CAMERA",

    clue: "Device used to take photographs",

    category: "OBJECTS",
  },

  {
    answer: "BUTTERFLY",

    clue: "Insect with colorful wings",

    category: "ANIMALS",
  },

  {
    answer: "LIBRARY",

    clue: "Place where many books are kept",

    category: "PLACES",
  },

  {
    answer: "GALAXY",

    clue: "Huge collection of stars",

    category: "SPACE",
  },

  {
    answer: "TREASURE",

    clue: "Valuable collection of hidden riches",

    category: "ADVENTURE",
  },

  {
    answer: "MOUNTAIN",

    clue: "A very high natural elevation of land",

    category: "NATURE",
  },
];

const DIRECTIONS = [
  { dr: 0, dc: 1 },

  { dr: 0, dc: -1 },

  { dr: 1, dc: 0 },

  { dr: -1, dc: 0 },

  { dr: 1, dc: 1 },

  { dr: -1, dc: -1 },

  { dr: 1, dc: -1 },

  { dr: -1, dc: 1 },
];

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const FOUND_COLORS = [
  "#FFD166",

  "#7BDFF2",

  "#B8F2A6",

  "#FF9F9F",

  "#CDB4DB",

  "#A0C4FF",

  "#FFB4A2",

  "#90DBF4",

  "#D0F4DE",

  "#FDE2E4",
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));

    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function cellKey(cell: Cell) {
  return `${cell.row}-${cell.col}`;
}

function sameCellSet(first: Cell[], second: Cell[]) {
  if (first.length !== second.length) {
    return false;
  }

  const firstSet = new Set(first.map(cellKey));

  const secondSet = new Set(second.map(cellKey));

  if (firstSet.size !== secondSet.size) {
    return false;
  }

  for (const key of firstSet) {
    if (!secondSet.has(key)) {
      return false;
    }
  }

  return true;
}

function getLineCells(start: Cell, end: Cell): Cell[] {
  const rowDiff = end.row - start.row;

  const colDiff = end.col - start.col;

  const sameRow = rowDiff === 0;

  const sameColumn = colDiff === 0;

  const diagonal = Math.abs(rowDiff) === Math.abs(colDiff);

  if (!sameRow && !sameColumn && !diagonal) {
    return [];
  }

  const rowStep = rowDiff === 0 ? 0 : rowDiff > 0 ? 1 : -1;

  const colStep = colDiff === 0 ? 0 : colDiff > 0 ? 1 : -1;

  const length = Math.max(Math.abs(rowDiff), Math.abs(colDiff));

  const cells: Cell[] = [];

  for (let i = 0; i <= length; i += 1) {
    cells.push({
      row: start.row + rowStep * i,

      col: start.col + colStep * i,
    });
  }

  return cells;
}

function createEmptyGrid(): string[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(""));
}

function canPlaceWord(
  grid: string[][],

  word: string,

  row: number,

  col: number,

  dr: number,

  dc: number,
) {
  for (let i = 0; i < word.length; i += 1) {
    const r = row + dr * i;

    const c = col + dc * i;

    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
      return false;
    }

    const current = grid[r][c];

    if (current !== "" && current !== word[i]) {
      return false;
    }
  }

  return true;
}

function placeWord(grid: string[][], entry: WordEntry): Cell[] | null {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];

    const row = Math.floor(Math.random() * GRID_SIZE);

    const col = Math.floor(Math.random() * GRID_SIZE);

    if (
      !canPlaceWord(grid, entry.answer, row, col, direction.dr, direction.dc)
    ) {
      continue;
    }

    const cells: Cell[] = [];

    for (let i = 0; i < entry.answer.length; i += 1) {
      const r = row + direction.dr * i;

      const c = col + direction.dc * i;

      grid[r][c] = entry.answer[i];

      cells.push({
        row: r,

        col: c,
      });
    }

    return cells;
  }

  return null;
}

function createPuzzle() {
  const grid = createEmptyGrid();

  const placed: PlacedWord[] = [];

  const uniqueWords = WORD_BANK.filter(
    (word, index, array) =>
      array.findIndex((item) => item.answer === word.answer) === index,
  );

  const candidates = shuffle(uniqueWords);

  for (const word of candidates) {
    if (placed.length >= WORD_COUNT) {
      break;
    }

    const cells = placeWord(grid, word);

    if (cells) {
      placed.push({
        ...word,

        cells,
      });
    }
  }

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (!grid[row][col]) {
        grid[row][col] = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      }
    }
  }

  return {
    grid,

    placed,
  };
}

export default function CrosswordMasterScreen() {
  const router = useRouter();

  const { width, height } = useWindowDimensions();

  const boardSize = Math.min(width - 32, Math.max(280, height * 0.52));

  const cellSize = boardSize / GRID_SIZE;

  const [gameState, setGameState] = useState<GameState>("ready");

  const [grid, setGrid] = useState<string[][]>(createEmptyGrid());

  const [placedWords, setPlacedWords] = useState<PlacedWord[]>([]);

  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);

  /*

   * This is ONLY the temporary selection

   * while the finger is touching the grid.

   */

  const [selection, setSelection] = useState<Cell[]>([]);

  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);

  const [hintsLeft, setHintsLeft] = useState(HINT_COUNT);

  const [hintCells, setHintCells] = useState<Cell[]>([]);

  /*

   * ============================================================

   * REFS

   * ============================================================

   */

  const gridRef = useRef<View>(null);

  const gridPositionRef = useRef({
    x: 0,

    y: 0,
  });

  const selectionStartRef = useRef<Cell | null>(null);

  const selectionRef = useRef<Cell[]>([]);

  const selectingRef = useRef(false);

  const foundWordsRef = useRef<FoundWord[]>([]);

  const placedWordsRef = useRef<PlacedWord[]>([]);

  const currentWordIndexRef = useRef(0);

  const gameStateRef = useRef<GameState>("ready");

  /*

   * ============================================================

   * MEASURE GRID

   * ============================================================

   */

  const measureGrid = useCallback(() => {
    requestAnimationFrame(() => {
      gridRef.current?.measureInWindow((x, y) => {
        gridPositionRef.current = {
          x,

          y,
        };
      });
    });
  }, []);

  /*

   * ============================================================

   * GET EXACT CELL FROM SCREEN TOUCH

   * ============================================================

   */

  const getCellFromScreenPosition = useCallback(
    (pageX: number, pageY: number): Cell | null => {
      const gridX = gridPositionRef.current.x;

      const gridY = gridPositionRef.current.y;

      const localX = pageX - gridX;

      const localY = pageY - gridY;

      if (
        localX < 0 ||
        localY < 0 ||
        localX >= boardSize ||
        localY >= boardSize
      ) {
        return null;
      }

      const col = Math.floor(localX / cellSize);

      const row = Math.floor(localY / cellSize);

      if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
        return null;
      }

      return {
        row,

        col,
      };
    },

    [boardSize, cellSize],
  );

  /*

   * ============================================================

   * PREPARE NEW GAME

   * ============================================================

   */

  const prepareGame = useCallback(() => {
    const puzzle = createPuzzle();

    setGrid(puzzle.grid);

    setPlacedWords(puzzle.placed);

    placedWordsRef.current = puzzle.placed;

    setCurrentWordIndex(0);

    currentWordIndexRef.current = 0;

    setFoundWords([]);

    foundWordsRef.current = [];

    setSelection([]);

    selectionRef.current = [];

    selectionStartRef.current = null;

    selectingRef.current = false;

    setScore(0);

    setHintsLeft(HINT_COUNT);

    setHintCells([]);

    gameStateRef.current = "ready";

    setGameState("ready");

    requestAnimationFrame(() => {
      measureGrid();
    });
  }, [measureGrid]);

  /*

   * ============================================================

   * START GAME

   * ============================================================

   */

  const startGame = useCallback(() => {
    gameStateRef.current = "playing";

    setGameState("playing");

    setSelection([]);

    selectionRef.current = [];

    selectionStartRef.current = null;

    selectingRef.current = false;

    setHintCells([]);

    requestAnimationFrame(() => {
      measureGrid();
    });
  }, [measureGrid]);

  /*

   * ============================================================

   * FINISH SELECTION

   * ============================================================

   *

   * IMPORTANT:

   *

   * The current clue has exactly ONE valid answer.

   *

   * If the player selects another hidden word,

   * it is INVALID.

   *

   * If the player selects only part of the answer,

   * it is INVALID.

   *

   * Only the complete current answer is highlighted.

   */

  const finishSelection = useCallback((cells: Cell[]) => {
    if (gameStateRef.current !== "playing") {
      return;
    }

    /*

     * Always remove temporary

     * selection first.

     */

    const clearTemporarySelection = () => {
      selectionRef.current = [];

      selectionStartRef.current = null;

      setSelection([]);
    };

    if (cells.length === 0) {
      clearTemporarySelection();

      return;
    }

    const currentIndex = currentWordIndexRef.current;

    const currentWord = placedWordsRef.current[currentIndex];

    if (!currentWord) {
      clearTemporarySelection();

      return;
    }

    /*

     * ======================================================

     * CHECK COMPLETE WORD LENGTH

     * ======================================================

     *

     * DIAMOND = 7 letters

     *

     * Selecting:

     *

     * D-I-A

     *

     * is NOT valid.

     */

    if (cells.length !== currentWord.answer.length) {
      clearTemporarySelection();

      return;
    }

    /*

     * ======================================================

     * CHECK EXACT CURRENT ANSWER

     * ======================================================

     *

     * This compares the selected cells

     * with the cells belonging to the

     * CURRENT clue's answer.

     *

     * Reverse selection is allowed.

     */

    const isCorrect = sameCellSet(cells, currentWord.cells);

    /*

     * ======================================================

     * WRONG ANSWER

     * ======================================================

     *

     * Even if the selected word is another

     * valid hidden word in the puzzle,

     * it is INVALID because it does not

     * answer the current clue.

     */

    if (!isCorrect) {
      clearTemporarySelection();

      return;
    }

    /*

     * ======================================================

     * ALREADY FOUND

     * ======================================================

     */

    const alreadyFound = foundWordsRef.current.some(
      (word) => word.answer === currentWord.answer,
    );

    if (alreadyFound) {
      clearTemporarySelection();

      return;
    }

    /*

     * ======================================================

     * CORRECT ANSWER

     * ======================================================

     */

    const nextFound: FoundWord[] = [
      ...foundWordsRef.current,

      {
        answer: currentWord.answer,

        cells: currentWord.cells,
      },
    ];

    /*

     * Store permanently.

     */

    foundWordsRef.current = nextFound;

    setFoundWords(nextFound);

    /*

     * Score ONLY for correct answer.

     */

    setScore((previousScore) => previousScore + 100);

    /*

     * Remove temporary selection.

     *

     * The permanent highlight now

     * comes from foundWords.

     */

    clearTemporarySelection();

    setHintCells([]);

    /*

     * ======================================================

     * NEXT QUESTION

     * ======================================================

     */

    const nextIndex = currentIndex + 1;

    if (nextIndex >= placedWordsRef.current.length) {
      gameStateRef.current = "completed";
      setGameState("completed");

      const finalScore = nextFound.length * 100;
      setBestScore((previous) => Math.max(previous, finalScore));
      const earnedStars = finalScore >= 1000 ? 3 : finalScore >= 700 ? 2 : 1;
      getAllProgress()
        .then(async (allProgress) => {
          const previous = allProgress["crossword-master"];
          await saveGameProgress("crossword-master", {
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
        .catch((error) =>
          console.warn("Unable to save Crossword progress:", error),
        );
      return;
    }

    currentWordIndexRef.current = nextIndex;

    setCurrentWordIndex(nextIndex);
  }, []);

  /*

   * ============================================================

   * PAN RESPONDER

   * ============================================================

   */

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        /*

         * Take control immediately when

         * the finger touches the grid.

         */

        onStartShouldSetPanResponderCapture: () =>
          gameStateRef.current === "playing",

        onMoveShouldSetPanResponderCapture: () =>
          gameStateRef.current === "playing",

        /*

         * ====================================================

         * TOUCH START

         * ====================================================

         */

        onPanResponderGrant: (_event, gestureState) => {
          if (gameStateRef.current !== "playing") {
            return;
          }

          /*

           * x0/y0 = EXACT place where

           * finger initially touched.

           */

          const startCell = getCellFromScreenPosition(
            gestureState.x0,

            gestureState.y0,
          );

          if (!startCell) {
            selectingRef.current = false;

            return;
          }

          selectingRef.current = true;

          selectionStartRef.current = startCell;

          selectionRef.current = [startCell];

          /*

           * Temporary highlight while

           * finger is dragging.

           */

          setSelection([startCell]);
        },

        /*

         * ====================================================

         * TOUCH MOVE

         * ====================================================

         */

        onPanResponderMove: (_event, gestureState) => {
          if (!selectingRef.current) {
            return;
          }

          const startCell = selectionStartRef.current;

          if (!startCell) {
            return;
          }

          /*

           * moveX/moveY = current finger

           * screen position.

           */

          const currentCell = getCellFromScreenPosition(
            gestureState.moveX,

            gestureState.moveY,
          );

          if (!currentCell) {
            return;
          }

          /*

           * Only straight lines and

           * diagonals are accepted.

           */

          const line = getLineCells(startCell, currentCell);

          if (line.length === 0) {
            return;
          }

          selectionRef.current = line;

          setSelection(line);
        },

        /*

         * ====================================================

         * TOUCH RELEASE

         * ====================================================

         */

        onPanResponderRelease: () => {
          if (!selectingRef.current) {
            return;
          }

          selectingRef.current = false;

          /*

           * Validate the COMPLETE

           * selected word.

           */

          finishSelection(selectionRef.current);
        },

        /*

         * ====================================================

         * TOUCH CANCEL

         * ====================================================

         */

        onPanResponderTerminate: () => {
          selectingRef.current = false;

          selectionStartRef.current = null;

          selectionRef.current = [];

          setSelection([]);
        },

        onPanResponderTerminationRequest: () => false,

        onShouldBlockNativeResponder: () => true,
      }),

    [finishSelection, getCellFromScreenPosition],
  );

  /*

   * ============================================================

   * HINT

   * ============================================================

   */

  const useHint = useCallback(() => {
    if (gameStateRef.current !== "playing") {
      return;
    }

    if (hintsLeft <= 0) {
      return;
    }

    const currentWord = placedWordsRef.current[currentWordIndexRef.current];

    if (!currentWord) {
      return;
    }

    setHintsLeft((value) => value - 1);

    setHintCells(currentWord.cells);

    setTimeout(() => {
      setHintCells([]);
    }, 1400);
  }, [hintsLeft]);

  /*

   * ============================================================

   * INITIALIZE

   * ============================================================

   */

  React.useEffect(() => {
    prepareGame();
    getAllProgress()
      .then((allProgress) =>
        setBestScore(allProgress["crossword-master"].highScore),
      )
      .catch((error) =>
        console.warn("Unable to load Crossword progress:", error),
      );
  }, [prepareGame]);

  /*

   * ============================================================

   * FOUND CELL MAP

   * ============================================================

   */

  const foundCellMap = useMemo(() => {
    const map = new Map<string, number>();

    foundWords.forEach((word, wordIndex) => {
      word.cells.forEach((cell) => {
        map.set(cellKey(cell), wordIndex);
      });
    });

    return map;
  }, [foundWords]);

  const currentWord = placedWords[currentWordIndex];

  /*

   * ============================================================

   * READY SCREEN

   * ============================================================

   */

  if (gameState === "ready") {
    return (
      <View style={styles.readyScreen}>
        <View style={styles.readyCard}>
          <Text style={styles.readyEmoji}>🔎</Text>

          <Text style={styles.readyHeading}>Ready to search?</Text>

          <Text style={styles.readyInfo}>
            Find the hidden words from the clues. Drag across the letters to
            select the correct word!
          </Text>

          <View style={styles.readyRules}>
            <Text style={styles.readyRule}>🔎 Find the word from the clue</Text>

            <Text style={styles.readyRule}>
              ↔️ Words can be horizontal, vertical or diagonal
            </Text>

            <Text style={styles.readyRule}>
              💡 Use hints when you get stuck
            </Text>

            <Text style={styles.readyRule}>
              🏆 Find all the hidden words to win
            </Text>

            <Text style={styles.readyRule}>
              ⭐ Score +100 for every correct word
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

   * COMPLETED SCREEN

   * ============================================================

   */

  if (gameState === "completed") {
    return (
      <View style={styles.completedScreen}>
        <View style={styles.completedCard}>
          <Text style={styles.completedIcon}>🎉</Text>

          <Text style={styles.completedTitle}>WORD MASTER!</Text>

          <Text style={styles.completedSubtitle}>You found every answer.</Text>

          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>SCORE</Text>

            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.completedSubtitle}>
              BEST SCORE: {bestScore}
            </Text>
          </View>

          <View style={styles.completedStats}>
            <View style={styles.completedStat}>
              <Text style={styles.completedStatValue}>{foundWords.length}</Text>

              <Text style={styles.completedStatLabel}>WORDS</Text>
            </View>

            <View style={styles.completedStat}>
              <Text style={styles.completedStatValue}>
                {HINT_COUNT - hintsLeft}
              </Text>

              <Text style={styles.completedStatLabel}>HINTS USED</Text>
            </View>
          </View>

          <Pressable style={styles.startButton} onPress={prepareGame}>
            <Text style={styles.startButtonText}>PLAY AGAIN</Text>
          </Pressable>

          <Pressable
            style={styles.backHomeButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backHomeText}>← TRY ANOTHER GAME</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  /*

   * ============================================================

   * PLAYING SCREEN

   * ============================================================

   */

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.headerBack} onPress={() => router.back()}>
          <Text style={styles.headerBackText}>←</Text>
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>WORD SEARCH</Text>

          <Text style={styles.headerProgress}>
            {foundWords.length}/{placedWords.length}
          </Text>
        </View>

        <Pressable style={styles.hintButton} onPress={useHint}>
          <Text style={styles.hintText}>💡 {hintsLeft}</Text>
        </Pressable>
      </View>

      <View style={styles.gameContent}>
        <View style={styles.clueCard}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>
              {currentWord?.category ?? "WORD"}
            </Text>
          </View>

          <Text style={styles.clueLabel}>FIND THIS WORD</Text>

          <Text style={styles.clueText}>
            {currentWord?.clue ?? "Find the hidden word"}
          </Text>

          <View style={styles.clueBottom}>
            <Text style={styles.clueLength}>
              {currentWord?.answer.length ?? 0} LETTERS
            </Text>

            <Text style={styles.pointsText}>+100 POINTS</Text>
          </View>
        </View>

        {/*

         * IMPORTANT:

         *

         * This View has NO padding.

         *

         * Its exact screen position is measured

         * and used for touch calculations.

         */}

        <View
          ref={gridRef}
          style={[
            styles.gridOuter,

            {
              width: boardSize,

              height: boardSize,
            },
          ]}
          onLayout={measureGrid}
          {...panResponder.panHandlers}
        >
          {grid.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.gridRow}>
              {row.map((letter, colIndex) => {
                const key = `${rowIndex}-${colIndex}`;

                /*

                 * Temporary finger selection.

                 */

                const isSelected = selection.some(
                  (cell) => cell.row === rowIndex && cell.col === colIndex,
                );

                /*

                 * Permanent correct-answer

                 * highlight.

                 */

                const foundIndex = foundCellMap.get(key);

                const isFound = foundIndex !== undefined;

                /*

                 * Hint highlight.

                 */

                const isHint = hintCells.some(
                  (cell) => cell.row === rowIndex && cell.col === colIndex,
                );

                return (
                  <View
                    key={key}
                    pointerEvents="none"
                    style={[
                      styles.cell,

                      {
                        width: cellSize,

                        height: cellSize,
                      },

                      /*

                       * ONLY CORRECT ANSWERS

                       * become permanent.

                       */

                      isFound && {
                        backgroundColor:
                          FOUND_COLORS[foundIndex % FOUND_COLORS.length],
                      },

                      /*

                       * Temporary while

                       * finger is down.

                       */

                      isSelected && styles.selectedCell,

                      isHint && styles.hintCell,
                    ]}
                  >
                    <Text
                      style={[
                        styles.letter,

                        {
                          fontSize: Math.max(12, cellSize * 0.38),
                        },

                        isSelected && styles.selectedLetter,

                        isFound && styles.foundLetter,
                      ]}
                    >
                      {letter}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.bottomInfo}>
          <View style={styles.scoreBox}>
            <Text style={styles.bottomLabel}>SCORE</Text>

            <Text style={styles.bottomValue}>{score}</Text>
          </View>

          <View style={styles.instructionBox}>
            <Text style={styles.instructionIcon}>👆</Text>

            <Text style={styles.instructionText}>Drag the complete answer</Text>
          </View>
        </View>
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

  readyContent: {
    width: "100%",

    maxWidth: 380,

    alignItems: "center",
  },

  readyIcon: {
    fontSize: 58,

    marginBottom: 6,
  },

  readyTitle: {
    color: "#18242D",

    fontSize: 36,

    fontWeight: "900",

    letterSpacing: 2,
  },

  readyHeading: {
    color: "#18242D",

    fontSize: 23,

    fontWeight: "900",

    marginTop: 18,
  },

  readyInfo: {
    color: "#68756A",

    fontSize: 14,

    lineHeight: 21,

    textAlign: "center",

    maxWidth: 330,

    marginTop: 8,
  },

  rulesCard: {
    width: "100%",

    backgroundColor: "#FFFFFF",

    borderRadius: 20,

    paddingHorizontal: 18,

    paddingVertical: 14,

    marginTop: 22,

    borderWidth: 1,

    borderColor: "rgba(36,28,42,0.08)",

    shadowColor: "#000000",

    shadowOpacity: 0.08,

    shadowRadius: 8,

    shadowOffset: {
      width: 0,

      height: 3,
    },

    elevation: 3,
  },

  ruleRow: {
    flexDirection: "row",

    alignItems: "center",

    minHeight: 42,
  },

  ruleIcon: {
    width: 34,

    fontSize: 20,

    textAlign: "center",
  },

  ruleText: {
    flex: 1,

    color: "#536258",

    fontSize: 13,

    fontWeight: "700",

    marginLeft: 8,
  },

  startButton: {
    width: "100%",

    height: 56,

    borderRadius: 18,

    backgroundColor: "#18242D",

    alignItems: "center",

    justifyContent: "center",

    marginTop: 22,
  },

  startButtonText: {
    color: "#FFFFFF",

    fontSize: 16,

    fontWeight: "900",

    letterSpacing: 1,
  },

  buttonPressed: {
    opacity: 0.75,

    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  backHomeButton: {
    marginTop: 12,

    padding: 10,
  },

  backHomeText: {
    color: "#536258",

    fontSize: 12,

    fontWeight: "900",
  },

  screen: {
    flex: 1,

    backgroundColor: "#DFF7D8",
  },

  header: {
    width: "100%",

    minHeight: 78,

    backgroundColor: "#18242D",

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    paddingHorizontal: 14,

    paddingTop: 18,

    paddingBottom: 10,
  },

  headerBack: {
    width: 42,

    height: 42,

    borderRadius: 14,

    backgroundColor: "rgba(255,255,255,0.10)",

    alignItems: "center",

    justifyContent: "center",
  },

  headerBackText: {
    color: "#FFFFFF",

    fontSize: 25,

    fontWeight: "700",
  },

  headerCenter: {
    alignItems: "center",

    justifyContent: "center",
  },

  headerTitle: {
    color: "#FFFFFF",

    fontSize: 17,

    fontWeight: "900",

    letterSpacing: 1,
  },

  headerProgress: {
    color: "#AAB7AF",

    fontSize: 12,

    fontWeight: "700",

    marginTop: 2,
  },

  hintButton: {
    minWidth: 60,

    height: 40,

    borderRadius: 14,

    backgroundColor: "#FFFFFF",

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 10,
  },

  hintText: {
    color: "#18242D",

    fontSize: 13,

    fontWeight: "900",
  },

  gameContent: {
    flex: 1,

    alignItems: "center",

    paddingHorizontal: 16,

    paddingTop: 12,
  },

  clueCard: {
    width: "100%",

    maxWidth: 500,

    backgroundColor: "#FFFFFF",

    borderRadius: 18,

    paddingHorizontal: 16,

    paddingVertical: 12,

    marginBottom: 12,

    borderWidth: 1,

    borderColor: "rgba(36,28,42,0.08)",

    shadowColor: "#000000",

    shadowOpacity: 0.06,

    shadowRadius: 6,

    shadowOffset: {
      width: 0,

      height: 2,
    },

    elevation: 2,
  },

  categoryPill: {
    alignSelf: "flex-start",

    backgroundColor: "#EAF6E5",

    paddingHorizontal: 10,

    paddingVertical: 5,

    borderRadius: 8,
  },

  categoryText: {
    color: "#52705A",

    fontSize: 10,

    fontWeight: "900",

    letterSpacing: 1,
  },

  clueLabel: {
    color: "#8A958C",

    fontSize: 10,

    fontWeight: "900",

    letterSpacing: 1.2,

    marginTop: 8,
  },

  clueText: {
    color: "#18242D",

    fontSize: 16,

    lineHeight: 21,

    fontWeight: "800",

    marginTop: 3,
  },

  clueBottom: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginTop: 8,
  },

  clueLength: {
    color: "#829087",

    fontSize: 10,

    fontWeight: "900",

    letterSpacing: 0.8,
  },

  pointsText: {
    color: "#557A5D",

    fontSize: 10,

    fontWeight: "900",
  },

  gridOuter: {
    backgroundColor: "#FFFFFF",

    borderRadius: 18,

    overflow: "hidden",

    borderWidth: 2,

    borderColor: "rgba(36,28,42,0.08)",

    shadowColor: "#000000",

    shadowOpacity: 0.08,

    shadowRadius: 8,

    shadowOffset: {
      width: 0,

      height: 3,
    },

    elevation: 4,
  },

  gridRow: {
    flexDirection: "row",
  },

  cell: {
    alignItems: "center",

    justifyContent: "center",

    borderRightWidth: 1,

    borderBottomWidth: 1,

    borderColor: "rgba(36,28,42,0.055)",
  },

  letter: {
    color: "#4D5951",

    fontWeight: "900",
  },

  selectedCell: {
    backgroundColor: "#A8E6A0",

    transform: [
      {
        scale: 0.9,
      },
    ],

    borderRadius: 50,
  },

  selectedLetter: {
    color: "#18242D",
  },

  foundLetter: {
    color: "#18242D",
  },

  hintCell: {
    backgroundColor: "#FFF0A8",
  },

  bottomInfo: {
    width: "100%",

    maxWidth: 500,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    marginTop: 12,

    paddingBottom: 16,
  },

  scoreBox: {
    minWidth: 90,

    backgroundColor: "#FFFFFF",

    borderRadius: 15,

    paddingHorizontal: 14,

    paddingVertical: 8,

    alignItems: "center",
  },

  bottomLabel: {
    color: "#8A958C",

    fontSize: 9,

    fontWeight: "900",

    letterSpacing: 1,
  },

  bottomValue: {
    color: "#18242D",

    fontSize: 18,

    fontWeight: "900",

    marginTop: 1,
  },

  instructionBox: {
    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "rgba(255,255,255,0.72)",

    borderRadius: 15,

    paddingHorizontal: 12,

    paddingVertical: 9,
  },

  instructionIcon: {
    fontSize: 18,

    marginRight: 7,
  },

  instructionText: {
    color: "#536258",

    fontSize: 11,

    fontWeight: "800",
  },

  completedScreen: {
    flex: 1,

    backgroundColor: "#DFF7D8",

    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 22,
  },

  completedCard: {
    width: "100%",

    maxWidth: 380,

    backgroundColor: "#FFFFFF",

    borderRadius: 28,

    padding: 24,

    alignItems: "center",

    borderWidth: 1,

    borderColor: "rgba(36,28,42,0.08)",

    shadowColor: "#000000",

    shadowOpacity: 0.1,

    shadowRadius: 14,

    shadowOffset: {
      width: 0,

      height: 5,
    },

    elevation: 5,
  },

  completedIcon: {
    fontSize: 58,
  },

  completedTitle: {
    color: "#18242D",

    fontSize: 30,

    fontWeight: "900",

    letterSpacing: 1,

    marginTop: 8,
  },

  completedSubtitle: {
    color: "#68756A",

    fontSize: 14,

    marginTop: 5,

    textAlign: "center",
  },

  scoreCard: {
    width: "100%",

    backgroundColor: "#EAF6E5",

    borderRadius: 18,

    alignItems: "center",

    paddingVertical: 14,

    marginTop: 20,
  },

  scoreLabel: {
    color: "#6B806E",

    fontSize: 10,

    fontWeight: "900",

    letterSpacing: 1,
  },

  scoreValue: {
    color: "#18242D",

    fontSize: 36,

    fontWeight: "900",

    marginTop: 2,
  },

  completedStats: {
    width: "100%",

    flexDirection: "row",

    gap: 10,

    marginTop: 12,
  },

  completedStat: {
    flex: 1,

    backgroundColor: "#F4F7F3",

    borderRadius: 15,

    alignItems: "center",

    paddingVertical: 11,
  },

  completedStatValue: {
    color: "#18242D",

    fontSize: 19,

    fontWeight: "900",
  },

  completedStatLabel: {
    color: "#879188",

    fontSize: 9,

    fontWeight: "900",

    marginTop: 2,
  },

  //   readyScreen: {

  //   flex: 1,

  //   backgroundColor: "#DFF7D8",

  //   alignItems: "center",

  //   justifyContent: "center",

  //   paddingHorizontal: 22,

  // },

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

  // readyHeading: {

  //   fontSize: 29,

  //   fontWeight: "900",

  //   color: "#18242D",

  //   textAlign: "center",

  //   marginTop: 5,

  // },

  // readyInfo: {

  //   textAlign: "center",

  //   color: "#66727B",

  //   fontSize: 15,

  //   lineHeight: 22,

  //   marginTop: 10,

  // },

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

  // startButton: {

  //   width: "100%",

  //   minHeight: 52,

  //   borderRadius: 14,

  //   backgroundColor: "#E85D04",

  //   alignItems: "center",

  //   justifyContent: "center",

  //   marginTop: 22,

  // },

  // buttonPressed: {

  //   transform: [

  //     {

  //       scale: 0.97,

  //     },

  //   ],

  // },

  // startButtonText: {

  //   color: "#FFFFFF",

  //   fontSize: 15,

  //   fontWeight: "900",

  //   letterSpacing: 0.5,

  // },

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
});
