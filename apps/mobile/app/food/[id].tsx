import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { api } from "../../src/api";
import { MacroDonut } from "../../src/components/MacroDonut";
import { Card, RoundButton } from "../../src/components/ui";
import { useSession } from "../../src/session";
import { MEAL_SLOTS, theme, type MealSlotKey } from "../../src/theme";

/**
 * Units offered before the food's own portions are known. Grams always works;
 * volume units only resolve when the food has a sourced portion or a density
 * category, and the server refuses rather than inventing a weight.
 */
const UNITS = ["g", "cup", "tbsp", "tsp", "ml"] as const;

export default function FoodDetailScreen() {
  const { userId } = useSession();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    slot?: string;
    date?: string;
    name?: string;
    kcal?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
  }>();

  const [quantity, setQuantity] = useState("100");
  const [unit, setUnit] = useState<string>("g");
  const [slot, setSlot] = useState<MealSlotKey>(
    (params.slot as MealSlotKey) ?? "snacks",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const amount = Number(quantity) || 0;
  // Per-100g figures scaled for preview only. The authoritative numbers are
  // computed and frozen server-side when the entry is written.
  const factor = unit === "g" ? amount / 100 : 0;
  const preview = {
    kcal: Number(params.kcal ?? 0) * factor,
    protein: Number(params.protein ?? 0) * factor,
    carbs: Number(params.carbs ?? 0) * factor,
    fat: Number(params.fat ?? 0) * factor,
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setError(null);

    try {
      await api.logFood({
        userId,
        foodId: params.id,
        date: params.date ?? new Date().toISOString().slice(0, 10),
        mealSlot: slot,
        quantity: amount,
        unit,
      });
      router.dismissTo("/(tabs)");
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message === "unresolvable_unit"
          ? `Calora has no weight for one ${unit} of this food, so it cannot log it honestly. Try grams.`
          : "Could not log this food",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.name}>{params.name ?? "Food"}</Text>

      <View style={styles.donutRow}>
        <MacroDonut
          protein={preview.protein}
          carbs={preview.carbs}
          fat={preview.fat}
          centreValue={preview.kcal}
          centreLabel="kcal"
          size={180}
        />
      </View>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Amount</Text>
        <View style={styles.amountRow}>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="decimal-pad"
            style={styles.amountInput}
          />
          <View style={styles.chipRow}>
            {UNITS.map((candidate) => (
              <Chip
                key={candidate}
                label={candidate}
                selected={unit === candidate}
                onPress={() => setUnit(candidate)}
              />
            ))}
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Meal</Text>
        <View style={styles.chipRow}>
          {MEAL_SLOTS.map((candidate) => (
            <Chip
              key={candidate.key}
              label={candidate.label}
              selected={slot === candidate.key}
              onPress={() => setSlot(candidate.key)}
            />
          ))}
        </View>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <RoundButton
        label={saving ? "Logging…" : "Log this food"}
        onPress={() => void save()}
      />
    </ScrollView>
  );
}

const Chip = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    style={[styles.chip, selected && styles.chipSelected]}
  >
    <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colour.background },
  content: { padding: theme.space(2), gap: theme.space(2), paddingBottom: theme.space(6) },
  name: { color: theme.colour.text, fontSize: theme.font.title, fontWeight: "700" },
  donutRow: { alignItems: "center" },
  card: { gap: theme.space(1.5) },
  sectionLabel: {
    color: theme.colour.textMuted,
    fontSize: theme.font.label,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  amountRow: { gap: theme.space(1.5) },
  amountInput: {
    backgroundColor: theme.colour.surfaceRaised,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space(2.5),
    paddingVertical: 12,
    color: theme.colour.text,
    fontSize: theme.font.body,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.space(1) },
  chip: {
    paddingHorizontal: theme.space(2),
    paddingVertical: 9,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colour.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colour.border,
  },
  chipSelected: {
    backgroundColor: theme.colour.accent,
    borderColor: theme.colour.accent,
  },
  chipLabel: { color: theme.colour.text, fontSize: theme.font.label },
  chipLabelSelected: { color: theme.colour.accentText, fontWeight: "700" },
  error: { color: theme.colour.danger, fontSize: theme.font.label, lineHeight: 19 },
});
