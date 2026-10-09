import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";

import { GameHeader } from "../../src/components/GameHeader";
import { GameShell } from "../../src/components/GameShell";
import { useGameStorage } from "../../src/hooks/useGameStorage";
import { useGameTimer } from "../../src/hooks/useGameTimer";
import { shuffle } from "../../src/utils/random";

type Card = {
  id: number;
  value: string;
  flipped: boolean;
  matched: boolean;
};

type GameState = "ready" | "playing" | "completed";

const EMOJIS = [
  "🍎",
  "🐱",
  "🐶",
  "🍉",
  "⭐",
  "🦊",
  "🐼",
  "🍋",
  "🚀",
  "🌈",
  "🍩",
  "🐸",
  "🍓",
  "🦁",
  "🎈",
  "🐵",
  "🍇",
  "🐰",
  "🌻",
  "🐢",
  "🍒",
  "🦋",
  "🍍",
  "🐳",
  "🍪",
  "🐧",
  "🎸",
  "🦄",
  "🍕",
  "🐨",
  "⚽",
  "🌙",
  "🍦",
  "🐝",
  "🚗",
  "🎁",
  "🐙",
  "🍊",
  "🛸",
  "🌵",
  "🥑",
  "🐬",
  "🎨",
  "🍰",
  "🦉",
  "🌺",
  "🎯",
  "🐴",
];

const getPairs = (targetLevel: number) =>
  Math.min(EMOJIS.length, Math.max(3, targetLevel + 2));

const getTime = (targetLevel: number) => Math.max(35, 75 - targetLevel * 3);

const makeCardsForLevel = (targetLevel: number): Card[] => {
  const selectedEmojis = shuffle([...EMOJIS]).slice(0, getPairs(targetLevel));

  const pairedCards: Card[] = selectedEmojis.flatMap((value, index) => [
    {
      id: index * 2,
      value,
      flipped: false,
      matched: false,
    },
    {
      id: index * 2 + 1,
      value,
      flipped: false,
      matched: false,
    },
  ]);

  return shuffle(pairedCards);
};

export default function CardMatch() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const { progress, commit } = useGameStorage("card-match");

  const [level, setLevel] = useState(Math.max(1, progress.currentLevel || 1));
  const [cards, setCards] = useState<Card[]>([]);
  const [first, setFirst] = useState<number | null>(null);
  const [lock, setLock] = useState(false);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [state, setState] = useState<GameState>("ready");

  const finalizedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pairs = getPairs(level);
  const totalCards = cards.length || pairs * 2;
  const initialTime = getTime(level);

  // More columns at higher levels so the entire board stays visible.
  const columns =
    totalCards <= 6
      ? 3
      : totalCards <= 12
        ? 4
        : totalCards <= 20
          ? 5
          : totalCards <= 30
            ? 6
            : totalCards <= 42
              ? 7
              : 8;

  const gap = totalCards <= 12 ? 8 : totalCards <= 30 ? 6 : 4;

  const horizontalPadding = 12;
  const availableWidth = Math.max(100, width - horizontalPadding * 2);

  const cardWidth = (availableWidth - gap * (columns - 1)) / columns;

  // Keep the grid within the screen area reserved for the game board.
  const estimatedRows = Math.ceil(totalCards / columns);
  const availableBoardHeight = Math.max(100, height - 300);

  const cardHeight = Math.max(
    30,
    Math.min(
      cardWidth * 1.08,
      (availableBoardHeight - gap * (estimatedRows - 1)) / estimatedRows,
    ),
  );

  const matchedPairs = useMemo(
    () => cards.filter((card) => card.matched).length / 2,
    [cards],
  );

  const { seconds, setSeconds } = useGameTimer(
    state === "playing",
    initialTime,
    () => {
      setFirst(null);
      setLock(true);
      setState("completed");
    },
  );

  const clearPendingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearPendingTimeout();
  }, [clearPendingTimeout]);

  const startLevel = useCallback(
    (targetLevel: number) => {
      clearPendingTimeout();

      finalizedRef.current = false;

      setLevel(targetLevel);
      setCards(makeCardsForLevel(targetLevel));
      setFirst(null);
      setLock(false);
      setMoves(0);
      setScore(0);
      setSeconds(getTime(targetLevel));
      setState("playing");
    },
    [clearPendingTimeout, setSeconds],
  );

  const finishLevel = useCallback(async () => {
    if (finalizedRef.current) return;

    finalizedRef.current = true;
    clearPendingTimeout();

    setFirst(null);
    setLock(true);

    const won = cards.length > 0 && cards.every((card) => card.matched);

    const finalScore = score + Math.max(0, seconds) * 5;

    const stars = won
      ? seconds > initialTime * 0.65
        ? 3
        : seconds > initialTime * 0.35
          ? 2
          : 1
      : 0;

    const nextLevel = won ? level + 1 : level;

    setState("completed");

    try {
      await commit({
        highScore: Math.max(progress.highScore, finalScore),
        currentLevel: Math.max(progress.currentLevel, nextLevel),
        unlockedLevels: Math.max(progress.unlockedLevels, nextLevel),
        stars: Math.max(progress.stars, stars),
      });
    } catch {
      // Continue to show the result even if saving fails.
    }
  }, [
    cards,
    clearPendingTimeout,
    commit,
    initialTime,
    level,
    progress,
    score,
    seconds,
  ]);

  useEffect(() => {
    if (state === "completed" && !finalizedRef.current) {
      void finishLevel();
    }
  }, [state, finishLevel]);

  useEffect(() => {
    if (
      state === "playing" &&
      cards.length > 0 &&
      cards.every((card) => card.matched)
    ) {
      setState("completed");
    }
  }, [cards, state]);

  const tapCard = useCallback(
    (cardId: number) => {
      if (state !== "playing" || lock) return;

      const tappedCard = cards.find((card) => card.id === cardId);

      if (!tappedCard || tappedCard.flipped || tappedCard.matched) {
        return;
      }

      setCards((currentCards) =>
        currentCards.map((card) =>
          card.id === cardId ? { ...card, flipped: true } : card,
        ),
      );

      if (first === null) {
        setFirst(cardId);
        return;
      }

      const firstCard = cards.find((card) => card.id === first);

      setFirst(null);
      setMoves((current) => current + 1);

      if (firstCard && firstCard.value === tappedCard.value) {
        setCards((currentCards) =>
          currentCards.map((card) =>
            card.id === first || card.id === cardId
              ? { ...card, flipped: true, matched: true }
              : card,
          ),
        );

        setScore((current) => current + 100);
        return;
      }

      setLock(true);
      clearPendingTimeout();

      timeoutRef.current = setTimeout(() => {
        setCards((currentCards) =>
          currentCards.map((card) =>
            card.id === first || card.id === cardId
              ? { ...card, flipped: false }
              : card,
          ),
        );

        setLock(false);
        timeoutRef.current = null;
      }, 750);
    },
    [cards, first, lock, state, clearPendingTimeout],
  );

  const won = cards.length > 0 && cards.every((card) => card.matched);

  const goHome = () => {
    clearPendingTimeout();
    router.replace("/");
  };

  return (
    <GameShell>
      {state !== "ready" && <GameHeader title="Card Match" onBack={goHome} />}

      {state === "ready" && (
        <View style={styles.readyContainer}>
          <View style={styles.readyCard}>
            <View style={styles.readyIcon}>
              <Text style={styles.readyEmoji}>🧠</Text>
            </View>

            <Text style={styles.readyTitle}>CARD MATCH</Text>
            <Text style={styles.readySubtitle}>Find the matching pairs!</Text>

            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>LEVEL {level}</Text>
            </View>

            <View style={styles.readyStats}>
              <View style={styles.readyStat}>
                <Text style={styles.readyStatEmoji}>🃏</Text>
                <Text style={styles.readyStatValue}>{pairs * 2}</Text>
                <Text style={styles.readyStatLabel}>CARDS</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.readyStat}>
                <Text style={styles.readyStatEmoji}>⏱️</Text>
                <Text style={styles.readyStatValue}>{initialTime}s</Text>
                <Text style={styles.readyStatLabel}>TIME</Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.readyStat}>
                <Text style={styles.readyStatEmoji}>🎯</Text>
                <Text style={styles.readyStatValue}>{pairs}</Text>
                <Text style={styles.readyStatLabel}>PAIRS</Text>
              </View>
            </View>

            <View style={styles.instructions}>
              <Text style={styles.instructionTitle}>HOW TO PLAY</Text>
              <Text style={styles.instructionText}>
                • Tap two cards to reveal them.
              </Text>
              <Text style={styles.instructionText}>
                • Remember the emojis and find pairs.
              </Text>
              <Text style={styles.instructionText}>
                • Match every pair before time runs out.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => startLevel(level)}
            >
              <Text style={styles.primaryButtonText}>START GAME</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={goHome}>
              <Text style={styles.secondaryButtonText}>BACK TO GAMES</Text>
            </Pressable>
          </View>
        </View>
      )}

      {state === "playing" && (
        <View style={styles.playingScreen}>
          <View style={styles.gameTitleRow}>
            <View>
              <Text style={styles.gameTitle}>Card Match 🃏</Text>
              <Text style={styles.gameSubtitle}>
                Find all {pairs} matching pairs
              </Text>
            </View>

            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>LEVEL {level}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>⏱️</Text>
              <Text
                style={[styles.statValue, seconds <= 10 && styles.timerWarning]}
              >
                {seconds}s
              </Text>
              <Text style={styles.statLabel}>TIME LEFT</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>⭐</Text>
              <Text style={styles.statValue}>{score}</Text>
              <Text style={styles.statLabel}>SCORE</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>🎯</Text>
              <Text style={styles.statValue}>
                {matchedPairs}/{pairs}
              </Text>
              <Text style={styles.statLabel}>MATCHES</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(matchedPairs / pairs) * 100}%` },
              ]}
            />
          </View>

          <View style={styles.movesRow}>
            <Text style={styles.movesText}>Moves: {moves}</Text>
            <Text style={styles.movesHint}>Match every pair to win!</Text>
          </View>

          <View
            style={[
              styles.cardsGrid,
              {
                gap,
                paddingHorizontal: horizontalPadding,
                flex: 1,
                alignContent: "center",
              },
            ]}
          >
            {cards.map((card) => (
              <Pressable
                key={card.id}
                onPress={() => tapCard(card.id)}
                disabled={
                  lock || card.flipped || card.matched || state !== "playing"
                }
                style={({ pressed }) => [
                  styles.card,
                  {
                    width: cardWidth,
                    height: cardHeight,
                  },
                  card.flipped && !card.matched && styles.flippedCard,
                  card.matched && styles.matchedCard,
                  pressed &&
                    !card.flipped &&
                    !card.matched &&
                    styles.cardPressed,
                ]}
              >
                {card.matched ? (
                  <View style={styles.cardInner}>
                    <Text
                      style={[
                        styles.cardEmoji,
                        { fontSize: Math.min(40, cardWidth * 0.48) },
                      ]}
                    >
                      {card.value}
                    </Text>
                    <View style={styles.matchedCheck}>
                      <Text style={styles.matchedCheckText}>✓</Text>
                    </View>
                  </View>
                ) : card.flipped ? (
                  <View style={styles.cardInner}>
                    <Text
                      style={[
                        styles.cardEmoji,
                        { fontSize: Math.min(40, cardWidth * 0.48) },
                      ]}
                    >
                      {card.value}
                    </Text>
                    <Text style={styles.revealedLabel}>REVEALED</Text>
                  </View>
                ) : (
                  <View style={styles.questionCard}>
                    <View style={styles.questionCircle}>
                      <Text
                        style={[
                          styles.questionMark,
                          {
                            fontSize: Math.min(38, cardWidth * 0.45),
                          },
                        ]}
                      >
                        ?
                      </Text>
                    </View>
                    <Text style={styles.tapLabel}>TAP</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          <Pressable
            style={styles.quitButton}
            onPress={() => {
              clearPendingTimeout();
              setState("ready");
              setFirst(null);
              setLock(false);
            }}
          >
            <Text style={styles.quitButtonText}>↩ EXIT GAME</Text>
          </Pressable>
        </View>
      )}

      {state === "completed" && (
        <View style={styles.readyContainer}>
          <View style={styles.readyCard}>
            <View
              style={[
                styles.readyIcon,
                won ? styles.successIcon : styles.failureIcon,
              ]}
            >
              <Text style={styles.readyEmoji}>{won ? "🏆" : "⏰"}</Text>
            </View>

            <Text style={styles.readyTitle}>
              {won ? "LEVEL COMPLETED!" : "TIME'S UP!"}
            </Text>

            <Text style={styles.readySubtitle}>
              {won
                ? "Amazing! You found every matching pair."
                : "Don't give up. Try again and beat the timer!"}
            </Text>

            {won && (
              <View style={styles.starsRow}>
                <Text style={styles.starEmoji}>
                  {seconds > initialTime * 0.65 ? "⭐" : "☆"}
                </Text>
                <Text style={styles.starEmoji}>
                  {seconds > initialTime * 0.35 ? "⭐" : "☆"}
                </Text>
                <Text style={styles.starEmoji}>{seconds > 0 ? "⭐" : "☆"}</Text>
              </View>
            )}

            <View style={styles.resultStats}>
              <View style={styles.resultStat}>
                <Text style={styles.resultValue}>{score}</Text>
                <Text style={styles.resultLabel}>MATCH SCORE</Text>
              </View>

              <View style={styles.resultDivider} />

              <View style={styles.resultStat}>
                <Text style={styles.resultValue}>{moves}</Text>
                <Text style={styles.resultLabel}>TOTAL MOVES</Text>
              </View>
            </View>

            <View style={styles.finalScoreBox}>
              <Text style={styles.finalScoreLabel}>FINAL SCORE</Text>
              <Text style={styles.finalScoreValue}>
                {score + Math.max(0, seconds) * 5}
              </Text>
              <Text style={styles.finalScoreHint}>
                Includes your remaining-time bonus
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => startLevel(won ? level + 1 : level)}
            >
              <Text style={styles.primaryButtonText}>
                {won ? "NEXT LEVEL  →" : "TRY AGAIN"}
              </Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={goHome}>
              <Text style={styles.secondaryButtonText}>BACK TO GAMES</Text>
            </Pressable>
          </View>
        </View>
      )}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  readyContainer: {
    flex: 1,
    backgroundColor: "#DFF7D8",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  readyCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D3EBCB",
    elevation: 8,
    shadowColor: "#315E2C",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
  },
  readyIcon: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: "#F0E9FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  successIcon: {
    backgroundColor: "#D8F8E0",
  },
  failureIcon: {
    backgroundColor: "#FFF0D9",
  },
  readyEmoji: {
    fontSize: 42,
  },
  readyTitle: {
    color: "#26372A",
    fontSize: 25,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.4,
  },
  readySubtitle: {
    color: "#738074",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 7,
    marginBottom: 15,
  },
  levelBadge: {
    backgroundColor: "#FFF0D9",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 7,
  },
  levelBadgeText: {
    color: "#D45B0A",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  readyStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    backgroundColor: "#F5FAF2",
    borderRadius: 20,
    paddingVertical: 16,
    marginTop: 18,
    marginBottom: 18,
  },
  readyStat: {
    flex: 1,
    alignItems: "center",
  },
  readyStatEmoji: {
    fontSize: 23,
    marginBottom: 5,
  },
  readyStatValue: {
    color: "#283D2A",
    fontSize: 19,
    fontWeight: "900",
  },
  readyStatLabel: {
    color: "#849183",
    fontSize: 9,
    fontWeight: "800",
    marginTop: 4,
    letterSpacing: 0.6,
  },
  statDivider: {
    height: 48,
    width: 1,
    backgroundColor: "#DCE9D8",
  },
  instructions: {
    width: "100%",
    backgroundColor: "#FFF9EF",
    borderRadius: 17,
    padding: 15,
    marginBottom: 18,
  },
  instructionTitle: {
    color: "#C55B14",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8,
    letterSpacing: 0.7,
  },
  instructionText: {
    color: "#5E665D",
    fontSize: 12,
    lineHeight: 22,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#E85D04",
    borderRadius: 16,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    elevation: 3,
    shadowColor: "#E85D04",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1,
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  secondaryButton: {
    width: "100%",
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F2EF",
    borderRadius: 15,
  },
  secondaryButtonText: {
    color: "#667066",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  playingScreen: {
    flex: 1,
    backgroundColor: "#F0F8EC",
    overflow: "hidden",
    paddingTop: 8,
  },
  gameTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  gameTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#26372A",
  },
  gameSubtitle: {
    fontSize: 12,
    color: "#738074",
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0EBDC",
    elevation: 2,
  },
  statEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    color: "#26372A",
    fontSize: 17,
    fontWeight: "900",
  },
  timerWarning: {
    color: "#E53935",
  },
  statLabel: {
    color: "#859183",
    fontSize: 8,
    fontWeight: "900",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  progressTrack: {
    height: 9,
    backgroundColor: "#DDE8D8",
    borderRadius: 10,
    overflow: "hidden",
    marginHorizontal: 12,
    marginBottom: 10,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#49B86D",
    borderRadius: 10,
  },
  movesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  movesText: {
    color: "#425342",
    fontSize: 12,
    fontWeight: "900",
  },
  movesHint: {
    color: "#849183",
    fontSize: 10,
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "stretch",
    minHeight: 0,
  },
  card: {
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8064E8",
    borderWidth: 2,
    borderColor: "#A995FF",
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#5733A5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },
  cardPressed: {
    transform: [{ scale: 0.95 }],
  },
  questionCard: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8064E8",
    borderRadius: 15,
    padding: 2,
  },
  questionCircle: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },
  questionMark: {
    fontWeight: "900",
    color: "#8064E8",
    textAlign: "center",
    includeFontPadding: false,
  },
  tapLabel: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  cardInner: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8E7",
    borderRadius: 15,
  },
  cardEmoji: {
    textAlign: "center",
  },
  flippedCard: {
    backgroundColor: "#FFF8E7",
    borderColor: "#FFB84D",
  },
  revealedLabel: {
    color: "#C17824",
    fontSize: 8,
    fontWeight: "900",
    marginTop: 5,
    letterSpacing: 0.4,
  },
  matchedCard: {
    backgroundColor: "#D8F8E0",
    borderColor: "#37B56B",
    borderWidth: 3,
  },
  matchedCheck: {
    position: "absolute",
    right: 4,
    top: 4,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: "#37B56B",
    alignItems: "center",
    justifyContent: "center",
  },
  matchedCheckText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  quitButton: {
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 6,
    borderRadius: 14,
    backgroundColor: "#E4EDE0",
  },
  quitButtonText: {
    color: "#52634F",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginVertical: 14,
  },
  starEmoji: {
    fontSize: 35,
  },
  resultStats: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "#F5FAF2",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 14,
  },
  resultStat: {
    flex: 1,
    alignItems: "center",
  },
  resultValue: {
    color: "#26372A",
    fontSize: 24,
    fontWeight: "900",
  },
  resultLabel: {
    color: "#849183",
    fontSize: 9,
    fontWeight: "900",
    marginTop: 5,
    letterSpacing: 0.5,
  },
  resultDivider: {
    width: 1,
    height: 42,
    backgroundColor: "#DCE9D8",
  },
  finalScoreBox: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "#FFF5E9",
    borderWidth: 1,
    borderColor: "#FFE1BF",
    borderRadius: 18,
    padding: 15,
    marginBottom: 18,
  },
  finalScoreLabel: {
    color: "#B76B27",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  finalScoreValue: {
    color: "#E85D04",
    fontSize: 34,
    fontWeight: "900",
    marginVertical: 4,
  },
  finalScoreHint: {
    color: "#9D866F",
    fontSize: 10,
    textAlign: "center",
  },
});
