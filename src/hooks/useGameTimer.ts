import { useEffect, useRef, useState } from 'react';

export function useGameTimer(running: boolean, initialSeconds: number, onEnd?: () => void) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          endRef.current?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  return { seconds, setSeconds };
}
