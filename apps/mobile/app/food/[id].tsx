import { offerableUnits, resolveGrams } from "@calora/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api, type FoodDetail } from "../../src/api";
import { MacroDonut } from "../../src/components/MacroDonut";
import { Card, RoundButton } from "../../src/components/ui";
import { today } from "../../src/dates";
import { useSession } from "../../src/session";
import { MEAL_SLOTS, theme, type MealSlotKey } from "../../src/theme";

const PROVENANCE_LABEL: Record<FoodDetail["provenance"], string> = {
  usda: "USDA",
  openfoodfacts: "Open Food Facts",
  recipe: "From a recipe",
  user: "Added by a person",
};

export default function FoodDetailScreen() {
  const { userId } = useSession();
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    slot?: string;
    date?: string;
  }>();

  // Fetched rather than passed through navigation params, so this screen works
  // identically whether it was opened from search or from history.
  const [food, setFood] = useState<FoodDetail | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [quantity, setQuantity] = useState("100");
  const [unit, setUnit] = useState("g");
  const [slot, setSlot] = useState<MealSlotKey>(
    (params.slot as MealSlotKey) ?? "snacks",
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getFood(params.id)
      .then(setFood)
      .catch(() => setLoadError(true));
  }, [params.id]);

  if (loadError) {
    return (
      <View style={styles.centre}>
        <Text style={styles.error}>Could not load this food.</Text>
      </View>
    );
  }

  if (!food) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={theme.colour.accent} />
      </View>
    );
  }

  const amount = Number(quantity) || 0;

  // The same functions the server logs with, so the preview cannot disagree
  // with what gets stored - and a Unit is offered only when it resolves.
  const measures = {
    portions: food.portions,
    ...(food.densityCategory ? { densityCategory: food.densityCategory } : {}),
  };

  const unitOptions = offerableUnits(measures);
  const resolved = resolveGrams({ quantity: amount, unit, ...measures });

  const grams = resolved?.grams ?? null;
  const isEstimated = resolved?.isEstimated ?? false;

  const factor = grams === null ? 0 : grams / 100;
  const preview = {
    kcal: food.kcal * factor,
    protein: food.protein * factor,
    carbs: food.carbs * factor,
    fat: food.fat * factor,
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    setError(null);

    try {
      await api.logFood({
        userId,
        foodId: food.id,
        date: params.date ?? today(),
        mealSlot: slot,
        quantity: amount,
        unit,
      });
      router.dismissTo("/(tabs)");
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message === "unresolvable_unit"
          ? `Calora has no weight for one ${unit} of this food, so it will not guess. Try grams.`
          : "Could not log this food.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.name}>{food.name}</Text>
        <Text style={styles.provenance}>
          {food.brandName ? `${food.brandName} · ` : ""}
          {PROVENANCE_LABEL[food.provenance]}
        </Text>
      </View>

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
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
          accessibilityLabel="Quantity"
          style={styles.amountInput}
        />
        <View style={styles.chipRow}>
          {unitOptions.map((candidate) => (
            <Chip
              key={candidate}
              label={candidate}
              selected={unit === candidate}
              onPress={() => setUnit(candidate)}
            />
          ))}
        </View>
        <Text style={styles.grams}>
          {grams === null
            ? `Calora has no weight for one ${unit} of this food`
            : `${isEstimated ? "≈ " : ""}${Math.round(grams)} g`}
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Nutrition for this amount</Text>
        {(
          [
            ["Energy", `${Math.round(preview.kcal)} kcal`],
            ["Protein", `${preview.protein.toFixed(1)} g`],
            ["Carbs", `${preview.carbs.toFixed(1)} g`],
            ["Fat", `${preview.fat.toFixed(1)} g`],
          ] as const
        ).map(([label, value]) => (
          <View key={label} style={styles.macroRow}>
            <Text style={styles.macroLabel}>{label}</Text>
            <Text style={styles.macroValue}>
              {isEstimated ? "≈ " : ""}
              {value}
            </Text>
          </View>
        ))}
      </Card>

      {food.hasRecipe && food.ingredients.length > 0 ? (
        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>Ingredients</Text>
          <Text style={styles.hint}>
            Check these match what you actually made — the same dish varies.
          </Text>
          {food.ingredients.map((ingredient, index) => (
            <Text key={`${index}-${ingredient}`} style={styles.ingredient}>
              · {ingredient}
            </Text>
          ))}
        </Card>
      ) : null}

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Meal Slot</Text>
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
  content: {
    padding: theme.space(2),
    gap: theme.space(2),
    paddingBottom: theme.space(6),
  },
  centre: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colour.background,
  },
  name: { color: theme.colour.text, fontSize: theme.font.title, fontWeight: "700" },
  provenance: {
    color: theme.colour.textMuted,
    fontSize: theme.font.label,
    marginTop: 4,
  },
  donutRow: { alignItems: "center" },
  card: { gap: theme.space(1.5) },
  sectionLabel: {
    color: theme.colour.textMuted,
    fontSize: theme.font.label,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  hint: { color: theme.colour.textMuted, fontSize: theme.font.label, lineHeight: 18 },
  amountInput: {
    backgroundColor: theme.colour.surfaceRaised,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space(2.5),
    paddingVertical: 12,
    color: theme.colour.text,
    fontSize: theme.font.body,
  },
  grams: { color: theme.colour.textMuted, fontSize: theme.font.label },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.space(1) },
  chip: {
    paddingHorizontal: theme.space(2),
    paddingVertical: 9,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colour.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colour.border,
  },
  chipSelected: { backgroundColor: theme.colour.accent, borderColor: theme.colour.accent },
  chipLabel: { color: theme.colour.text, fontSize: theme.font.label },
  chipLabelSelected: { color: theme.colour.accentText, fontWeight: "700" },
  macroRow: { flexDirection: "row", justifyContent: "space-between" },
  macroLabel: { color: theme.colour.textMuted, fontSize: theme.font.body },
  macroValue: { color: theme.colour.text, fontSize: theme.font.body, fontWeight: "600" },
  ingredient: { color: theme.colour.text, fontSize: theme.font.body, lineHeight: 22 },
  error: { color: theme.colour.danger, fontSize: theme.font.label, lineHeight: 19 },
});
