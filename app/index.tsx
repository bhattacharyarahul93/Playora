import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { colors } from "../src/constants/theme";
import { games } from "../src/data/games";
import { getAllProgress } from "../src/services/storage";
import { GameId, GameProgress } from "../src/types/game";

const DEFAULT_PROGRESS: GameProgress = {
  highScore: 0,
  currentLevel: 1,
  unlockedLevels: 1,
  stars: 0,
};

const ACCENTS = [
  "#FF6B6B",
  "#FF9F43",
  "#6C63FF",
  "#20BFA9",
  "#E056A0",
  "#3498DB",
];

export default function HomeScreen() {
  const router = useRouter();

  const [progress, setProgress] = useState<Record<GameId, GameProgress>>({
    "card-match": { ...DEFAULT_PROGRESS },
    watermelon: { ...DEFAULT_PROGRESS },
    "number-merge": { ...DEFAULT_PROGRESS },
    snake: { ...DEFAULT_PROGRESS },
    ludo: { ...DEFAULT_PROGRESS },
    "periodic-table": { ...DEFAULT_PROGRESS },
    "sudoku-classic": { ...DEFAULT_PROGRESS },
    "crossword-master": { ...DEFAULT_PROGRESS },
    "tic-tac-toe": { ...DEFAULT_PROGRESS },
    chess: { ...DEFAULT_PROGRESS },
  });

  const load = useCallback(() => {
    getAllProgress()
      .then(setProgress)
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const totalStars = Object.values(progress).reduce(
    (total, item) => total + Math.min(3, item.stars),
    0,
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={games}
        numColumns={2}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.columns}
        ListHeaderComponent={
          <View>
            <View style={styles.topRow}>
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>✦</Text>
              </View>

              <View style={styles.brandTextContainer}>
                <Text style={styles.brandName}>PLAYORA</Text>
                <Text style={styles.brandCaption}>YOUR LITTLE GAME WORLD</Text>
              </View>

              <View style={styles.starsBadge}>
                <Text style={styles.starsBadgeText}>⭐ {totalStars}</Text>
              </View>

              <Pressable
                style={styles.settingsButton}
                onPress={() => router.push("/settings")}
                accessibilityRole="button"
                accessibilityLabel="Open settings"
              >
                <Text style={styles.settingsButtonText}>⚙️</Text>
              </Pressable>
            </View>

            <View style={styles.hero}>
              <View style={styles.heroGlow} />

              <View style={styles.heroContent}>
                <View style={styles.eyebrow}>
                  <Text style={styles.eyebrowText}>
                    ✦ PLAY • EXPLORE • REPEAT
                  </Text>
                </View>

                <Text style={styles.heroTitle}>
                  Ready to{"\n"}
                  <Text style={styles.heroHighlight}>have fun?</Text>
                </Text>

                <Text style={styles.heroSubtitle}>
                  Take a break, challenge yourself, and beat your best score.
                </Text>

                <View style={styles.heroBottom}>
                  <View style={styles.heroFeature}>
                    <Text style={styles.heroFeatureIcon}>🎮</Text>
                    <Text style={styles.heroFeatureText}>Real games</Text>
                  </View>

                  <View style={styles.heroFeature}>
                    <Text style={styles.heroFeatureIcon}>🏆</Text>
                    <Text style={styles.heroFeatureText}>Beat records</Text>
                  </View>
                </View>
              </View>

              <View style={styles.heroArt}>
                <Text style={styles.heroGamepad}>🎮</Text>
                <Text style={styles.floatingStar}>⭐</Text>
                <Text style={styles.floatingBolt}>⚡</Text>
                <Text style={styles.floatingHeart}>💎</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Choose your game</Text>
                <Text style={styles.sectionSubtitle}>
                  Your next favourite is waiting.
                </Text>
              </View>

              <View style={styles.gameCount}>
                <Text style={styles.gameCountText}>{games.length} GAMES</Text>
              </View>
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const p = progress[item.id] ?? DEFAULT_PROGRESS;
          const accent = ACCENTS[index % ACCENTS.length];

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Play ${item.name}`}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: item.color,
                  borderColor: accent + "45",
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
              onPress={() => router.push(`/games/${item.id}` as never)}
            >
              <View style={[styles.cardAccent, { backgroundColor: accent }]} />

              <View style={styles.cardTop}>
                <View style={styles.iconBox}>
                  <Text style={styles.icon}>{item.icon}</Text>
                </View>

                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>LV {p.currentLevel}</Text>
                </View>
              </View>

              <Text style={styles.name} numberOfLines={2}>
                {item.name}
              </Text>

              <Text style={styles.desc} numberOfLines={2}>
                {item.description}
              </Text>

              <View style={styles.cardDivider} />

              <View style={styles.stats}>
                <View style={styles.statItem}>
                  <Text style={styles.statIcon}>⭐</Text>
                  <Text style={styles.statValue}>
                    {Math.min(3, p.stars)}
                    <Text style={styles.statMuted}> / 3</Text>
                  </Text>
                </View>

                <View style={styles.bestScore}>
                  <Text style={styles.bestLabel}>BEST</Text>
                  <Text style={styles.bestValue}>{p.highScore}</Text>
                </View>
              </View>

              <View style={[styles.playButton, { backgroundColor: accent }]}>
                <Text style={styles.playText}>PLAY NOW</Text>
                <Text style={styles.playArrow}>↗</Text>
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View style={styles.footer}>
            <View style={styles.footerIcon}>
              <Text style={styles.footerIconText}>🏆</Text>
            </View>

            <View style={styles.footerCopy}>
              <Text style={styles.footerTitle}>
                Every game is a new challenge
              </Text>
              <Text style={styles.footerText}>
                Keep playing, improve your scores, collect stars, and unlock
                more progress.
              </Text>
            </View>

            <Text style={styles.footerSparkle}>✦</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F4FC",
    paddingHorizontal: 16,
    paddingTop: 48,
  },

  grid: {
    paddingBottom: 32,
  },

  columns: {
    gap: 12,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  brandMark: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#6C63FF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#6C63FF",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  brandMarkText: {
    fontSize: 30,
    color: "#FFFFFF",
    fontWeight: "900",
  },

  brandTextContainer: {
    flex: 1,
    marginLeft: 11,
  },

  brandName: {
    color: "#24213A",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  brandCaption: {
    color: "#9692AC",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 3,
  },

  starsBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEEAFB",
  },

  starsBadgeText: {
    color: "#5146B8",
    fontWeight: "900",
    fontSize: 13,
  },

  hero: {
    backgroundColor: "#282344",
    borderRadius: 30,
    overflow: "hidden",
    marginBottom: 28,
    minHeight: 250,
    position: "relative",
    elevation: 8,
    shadowColor: "#282344",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },

  heroGlow: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "#494078",
    right: -90,
    top: -55,
  },

  heroContent: {
    padding: 22,
    paddingRight: 12,
    zIndex: 2,
  },

  eyebrow: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  eyebrowText: {
    color: "#D9D4FF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 33,
    lineHeight: 38,
    fontWeight: "900",
    marginTop: 16,
    letterSpacing: -0.8,
  },

  heroHighlight: {
    color: "#FFD166",
  },

  heroSubtitle: {
    color: "#D0CDE2",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 10,
    maxWidth: "75%",
  },

  heroBottom: {
    flexDirection: "row",
    gap: 16,
    marginTop: 20,
  },

  heroFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  heroFeatureIcon: {
    fontSize: 13,
  },

  heroFeatureText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  heroArt: {
    position: "absolute",
    right: -2,
    top: 65,
    width: 125,
    height: 125,
  },

  heroGamepad: {
    fontSize: 79,
    transform: [{ rotate: "-15deg" }],
    position: "absolute",
    top: 19,
    right: 1,
  },

  floatingStar: {
    position: "absolute",
    top: -12,
    right: 20,
    fontSize: 24,
  },

  floatingBolt: {
    position: "absolute",
    bottom: 0,
    left: 4,
    fontSize: 25,
  },

  floatingHeart: {
    position: "absolute",
    top: 20,
    left: -7,
    fontSize: 21,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 2,
  },

  sectionTitle: {
    fontSize: 23,
    fontWeight: "900",
    color: "#282344",
    letterSpacing: -0.5,
  },

  sectionSubtitle: {
    color: "#918DA7",
    fontSize: 12,
    marginTop: 4,
  },

  gameCount: {
    backgroundColor: "#E9E6FF",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },

  gameCountText: {
    color: "#6257CB",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  card: {
    flex: 1,
    minWidth: 0,
    minHeight: 252,
    borderRadius: 24,
    padding: 13,
    marginBottom: 12,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#312A50",
    shadowOpacity: 0.07,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
  },

  cardAccent: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    right: -38,
    top: -40,
    opacity: 0.12,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.72)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },

  icon: {
    fontSize: 34,
  },

  levelBadge: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },

  levelBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#49435F",
  },

  name: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "900",
    color: "#29243D",
    minHeight: 42,
  },

  desc: {
    color: "#68647C",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
    minHeight: 32,
  },

  cardDivider: {
    height: 1,
    backgroundColor: "rgba(52,44,77,0.10)",
    marginTop: 12,
    marginBottom: 10,
  },

  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  statIcon: {
    fontSize: 13,
  },

  statValue: {
    color: "#39334D",
    fontSize: 11,
    fontWeight: "900",
  },

  statMuted: {
    color: "#A5A0B7",
    fontWeight: "700",
  },

  bestScore: {
    alignItems: "flex-end",
  },

  bestLabel: {
    color: "#9993AE",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  bestValue: {
    color: "#39334D",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 2,
  },

  playButton: {
    minHeight: 35,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  playText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  playArrow: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ECE8FA",
    padding: 15,
    marginTop: 8,
    marginBottom: 18,
  },

  footerIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#FFF3D8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  footerIconText: {
    fontSize: 24,
  },

  footerCopy: {
    flex: 1,
  },

  footerTitle: {
    fontWeight: "900",
    color: "#302A48",
    fontSize: 12,
  },

  footerText: {
    color: "#8B86A1",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  footerSparkle: {
    color: "#A59BF5",
    fontSize: 22,
    marginLeft: 5,
  },

  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#EEEAFB",
  },

  settingsButtonText: {
    fontSize: 22,
  },
});
