import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/theme";

export function GameHeader({
  title,
  score,
  onBack,
  onRestart,
  right,
}: {
  title: string;
  score?: number;
  onBack: () => void;
  onRestart?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <View style={styles.center}>
        <Text style={styles.title}>{title}</Text>
        {score !== undefined && <Text style={styles.score}>Score {score}</Text>}
      </View>
      {right ??
        (onRestart ? (
          <Pressable onPress={onRestart} style={styles.restart}>
            <Text>↻</Text>
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        ))}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  backText: { fontSize: 32, color: colors.text, marginTop: -4 },
  center: { flex: 1, alignItems: "center" },
  title: { fontSize: 20, fontWeight: "800", color: colors.text },
  score: { color: colors.muted, marginTop: 2, fontWeight: "700" },
  restart: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeholder: { width: 44 },
});
