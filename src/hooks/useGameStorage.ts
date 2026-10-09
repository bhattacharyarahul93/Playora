import { useCallback, useEffect, useState } from 'react';
import { GameId, GameProgress } from '../types/game';
import { getAllProgress, saveGameProgress } from '../services/storage';

export function useGameStorage(gameId: GameId) {
  const [progress, setProgress] = useState<GameProgress>({ highScore: 0, currentLevel: 1, unlockedLevels: 1, stars: 0 });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getAllProgress().then((all) => { setProgress(all[gameId]); setLoaded(true); });
  }, [gameId]);

  const commit = useCallback(async (next: GameProgress) => {
    setProgress(next);
    await saveGameProgress(gameId, next);
  }, [gameId]);

  return { progress, loaded, commit };
}
