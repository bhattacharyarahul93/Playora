import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameId, GameProgress } from "../types/game";

export async function resetAllProgress(): Promise<void> {
  const defaultProgress: GameProgress = {
    highScore: 0,
    currentLevel: 1,
    unlockedLevels: 1,
    stars: 0,
  };

  const allProgress: Record<GameId, GameProgress> = {
    "card-match": { ...defaultProgress },
    watermelon: { ...defaultProgress },
    "number-merge": { ...defaultProgress },
    snake: { ...defaultProgress },
    ludo: { ...defaultProgress },
    "periodic-table": { ...defaultProgress },
    "sudoku-classic": { ...defaultProgress },
    "crossword-master": { ...defaultProgress },
    "tic-tac-toe": { ...defaultProgress },
    chess: { ...defaultProgress },
  };

  await AsyncStorage.multiSet([
    [PROGRESS_KEY, JSON.stringify(allProgress)],
    ["number-merge-best-score", "0"],
  ]);
}

const PROGRESS_KEY = "@fun_relax/game_progress";
const defaultProgress: GameProgress = {
  highScore: 0,
  currentLevel: 1,
  unlockedLevels: 1,
  stars: 0,
};

export async function getAllProgress(): Promise<Record<GameId, GameProgress>> {
  const raw = await AsyncStorage.getItem(PROGRESS_KEY);
  if (!raw)
    return {
      "card-match": { ...defaultProgress },
      watermelon: { ...defaultProgress },
      "number-merge": { ...defaultProgress },
      snake: { ...defaultProgress },
      ludo: { ...defaultProgress },
      "periodic-table": { ...defaultProgress },
      "sudoku-classic": { ...defaultProgress },
      "crossword-master": { ...defaultProgress },
      "tic-tac-toe": { ...defaultProgress },
      chess: { ...defaultProgress },
    };
  try {
    const parsed = JSON.parse(raw) as Partial<Record<GameId, GameProgress>>;
    return {
      "card-match": { ...defaultProgress, ...parsed["card-match"] },
      watermelon: { ...defaultProgress, ...parsed.watermelon },
      "number-merge": { ...defaultProgress, ...parsed["number-merge"] },
      snake: { ...defaultProgress, ...parsed.snake },
      ludo: { ...defaultProgress, ...parsed.ludo },
      "periodic-table": { ...defaultProgress, ...parsed["periodic-table"] },
      "sudoku-classic": { ...defaultProgress, ...parsed["sudoku-classic"] },
      "crossword-master": { ...defaultProgress, ...parsed["crossword-master"] },
      "tic-tac-toe": { ...defaultProgress, ...parsed["tic-tac-toe"] },
      chess: { ...defaultProgress, ...parsed.chess },
    };
  } catch {
    return {
      "card-match": { ...defaultProgress },
      watermelon: { ...defaultProgress },
      "number-merge": { ...defaultProgress },
      snake: { ...defaultProgress },
      ludo: { ...defaultProgress },
      "periodic-table": { ...defaultProgress },
      "sudoku-classic": { ...defaultProgress },
      "crossword-master": { ...defaultProgress },
      "tic-tac-toe": { ...defaultProgress },
      chess: { ...defaultProgress },
    };
  }
}

export async function saveGameProgress(gameId: GameId, progress: GameProgress) {
  const all = await getAllProgress();
  all[gameId] = progress;
  await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
}
