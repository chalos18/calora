import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { theme } from "../theme";

export const RoundButton = ({
  label,
  onPress,
  variant = "primary",
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "quiet";
  style?: StyleProp<ViewStyle>;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    style={({ pressed }) => [
      styles.button,
      variant === "primary" ? styles.primary : styles.quiet,
      pressed && styles.pressed,
      style,
    ]}
  >
    <Text
      style={[
        styles.buttonLabel,
        variant === "primary" ? styles.primaryLabel : styles.quietLabel,
      ]}
    >
      {label}
    </Text>
  </Pressable>
);

export const Card = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) => <View style={[styles.card, style]}>{children}</View>;

/** Progress against a macro goal. */
export const MacroBar = ({
  label,
  eaten,
  goal,
  colour,
}: {
  label: string;
  eaten: number;
  goal: number | null;
  colour: string;
}) => {
  const fraction = goal && goal > 0 ? Math.min(eaten / goal, 1) : 0;

  return (
    <View style={styles.macroBar}>
      <View style={styles.macroBarHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>
          {Math.round(eaten)}
          <Text style={styles.macroGoal}>{goal ? ` / ${goal} g` : " g"}</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${fraction * 100}%`, backgroundColor: colour },
          ]}
        />
      </View>
    </View>
  );
};

/**
 * Marks a figure Calora inferred rather than read from a source. Estimated
 * values are always shown as estimated - they roll into totals that are then
 * frozen, so hiding the distinction would quietly launder a guess into a fact.
 */
export const EstimatedMark = () => <Text style={styles.estimated}> ≈</Text>;

export const Empty = ({ message }: { message: string }) => (
  <Text style={styles.empty}>{message}</Text>
);

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primary: { backgroundColor: theme.colour.accent },
  quiet: {
    backgroundColor: theme.colour.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colour.border,
  },
  pressed: { opacity: 0.75 },
  buttonLabel: { fontSize: theme.font.body, fontWeight: "600" },
  primaryLabel: { color: theme.colour.accentText },
  quietLabel: { color: theme.colour.text },

  card: {
    backgroundColor: theme.colour.surface,
    borderRadius: theme.radius.card,
    padding: theme.space(2),
  },

  macroBar: { flex: 1 },
  macroBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  macroLabel: {
    color: theme.colour.textMuted,
    fontSize: theme.font.label,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  macroValue: {
    color: theme.colour.text,
    fontSize: theme.font.body,
    fontWeight: "600",
  },
  macroGoal: { color: theme.colour.textMuted, fontWeight: "400" },
  track: {
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colour.surfaceRaised,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: theme.radius.pill },

  estimated: { color: theme.colour.textMuted },
  empty: {
    color: theme.colour.textMuted,
    fontSize: theme.font.body,
    textAlign: "center",
    paddingVertical: theme.space(3),
  },
});
