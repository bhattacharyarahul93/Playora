import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { colors } from "../src/constants/theme";
import { resetAllProgress } from "../src/services/storage";

export default function SettingsScreen() {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);

  const resetProgress = () => {
    Alert.alert(
      "Reset all game progress?",
      "This will erase your saved scores, stars, levels, and unlocked levels for every game. This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset Everything",
          style: "destructive",
          onPress: async () => {
            setResetting(true);

            try {
              await resetAllProgress();

              Alert.alert(
                "Progress Reset!",
                "All games are back to level 1. Your scores, stars, and unlocked levels have been reset.",
                [
                  {
                    text: "OK",
                    onPress: () => router.replace("/"),
                  },
                ],
              );
            } catch {
              Alert.alert(
                "Reset Failed",
                "Could not reset your game progress. Please try again.",
              );
            } finally {
              setResetting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>

        <View>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Make PLAYORA yours</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>⚙️</Text>
          <Text style={styles.heroTitle}>Your game space</Text>
          <Text style={styles.heroText}>
            Manage your preferences and saved game progress.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>GAME DATA</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconBox}>
              <Text style={styles.optionIcon}>🔄</Text>
            </View>

            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Reset all game progress</Text>
              <Text style={styles.optionDescription}>
                Start every game again from level one.
              </Text>
            </View>
          </View>

          <View style={styles.warning}>
            <Text style={styles.warningText}>
              ⚠️ Your saved scores, stars, and levels will be erased.
            </Text>
          </View>

          <Pressable
            disabled={resetting}
            onPress={resetProgress}
            style={({ pressed }) => [
              styles.resetButton,
              pressed && styles.pressed,
              resetting && styles.disabled,
            ]}
          >
            <Text style={styles.resetButtonText}>
              {resetting ? "RESETTING..." : "RESET ALL PROGRESS"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>ABOUT</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconBox}>
              <Text style={styles.optionIcon}>🎮</Text>
            </View>

            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>PLAYORA</Text>
              <Text style={styles.optionDescription}>
                Play More. Smile More.
              </Text>
            </View>

            <Text style={styles.version}>v1.0.0</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Your fun, your games, your journey. ✨
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F5F4FC",
    paddingTop: 48,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 20,
    gap: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  backText: {
    fontSize: 34,
    lineHeight: 38,
    color: "#282344",
    marginTop: -4,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: "900",
    color: "#282344",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#918DA7",
    marginTop: 3,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 35,
  },
  hero: {
    backgroundColor: "#282344",
    borderRadius: 26,
    padding: 23,
    marginBottom: 28,
  },
  heroIcon: {
    fontSize: 34,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  heroText: {
    color: "#D0CDE2",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#918DA7",
    letterSpacing: 1.5,
    marginBottom: 11,
    marginLeft: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 17,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#ECE8FA",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#F0EDFF",
    alignItems: "center",
    justifyContent: "center",
  },
  optionIcon: {
    fontSize: 23,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: "#302A48",
    fontSize: 14,
    fontWeight: "900",
  },
  optionDescription: {
    color: "#918DA7",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  warning: {
    backgroundColor: "#FFF4E9",
    borderRadius: 12,
    padding: 12,
    marginTop: 17,
  },
  warningText: {
    color: "#A85A25",
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "700",
  },
  resetButton: {
    backgroundColor: "#E5484D",
    borderRadius: 14,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  version: {
    fontSize: 11,
    color: "#918DA7",
    fontWeight: "800",
  },
  footer: {
    textAlign: "center",
    color: "#918DA7",
    fontSize: 12,
    marginTop: 4,
  },
});
