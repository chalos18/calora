import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../src/api";
import { Card, RoundButton } from "../src/components/ui";
import { useSession } from "../src/session";
import { theme } from "../src/theme";

const ACTIVITY_LEVELS = [
  { key: "sedentary", label: "Sedentary", hint: "Desk job, little exercise" },
  { key: "light", label: "Light", hint: "Light exercise 1-3 days a week" },
  { key: "moderate", label: "Moderate", hint: "Exercise 3-5 days a week" },
  { key: "active", label: "Active", hint: "Hard exercise 6-7 days a week" },
  { key: "very_active", label: "Very active", hint: "Physical job or twice daily" },
] as const;

const GOALS = [
  { key: "lose", label: "Lose weight" },
  { key: "maintain", label: "Maintain" },
  { key: "gain", label: "Gain weight" },
  { key: "build_muscle", label: "Build muscle" },
] as const;

export default function OnboardingScreen() {
  const { setUserId } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [sexAtBirth, setSexAtBirth] = useState<"male" | "female">("female");
  const [birthDate, setBirthDate] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activityLevel, setActivityLevel] =
    useState<(typeof ACTIVITY_LEVELS)[number]["key"]>("moderate");
  const [goalType, setGoalType] = useState<(typeof GOALS)[number]["key"]>("maintain");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      const { userId } = await api.onboard({
        email,
        sexAtBirth,
        birthDate,
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
        activityLevel,
        goalType,
      });
      setUserId(userId);
      router.replace("/(tabs)");
    } catch {
      setError("Please check the details and try again.");
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
    >
      <Text style={styles.title}>Welcome to Calora</Text>
      <Text style={styles.intro}>
        A few details, and Calora works out what you should be eating each day.
      </Text>

      <Card style={styles.card}>
        <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" />
        <Field
          label="Date of birth"
          value={birthDate}
          onChange={setBirthDate}
          placeholder="YYYY-MM-DD"
        />
        <Field
          label="Height (cm)"
          value={heightCm}
          onChange={setHeightCm}
          placeholder="165"
          numeric
        />
        <Field
          label="Weight (kg)"
          value={weightKg}
          onChange={setWeightKg}
          placeholder="60"
          numeric
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Sex at birth</Text>
        <Text style={styles.hint}>
          The energy equation Calora uses is calibrated separately for each. It
          is asked for the arithmetic, not as a statement about identity.
        </Text>
        <View style={styles.chipRow}>
          {(["female", "male"] as const).map((option) => (
            <Chip
              key={option}
              label={option === "female" ? "Female" : "Male"}
              selected={sexAtBirth === option}
              onPress={() => setSexAtBirth(option)}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Activity level</Text>
        <Text style={styles.hint}>
          This swings your daily calories by up to 58%, so it is worth getting
          roughly right.
        </Text>
        {ACTIVITY_LEVELS.map((level) => (
          <Pressable
            key={level.key}
            onPress={() => setActivityLevel(level.key)}
            style={[styles.option, activityLevel === level.key && styles.optionSelected]}
          >
            <Text style={styles.optionLabel}>{level.label}</Text>
            <Text style={styles.optionHint}>{level.hint}</Text>
          </Pressable>
        ))}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Goal</Text>
        <View style={styles.chipRow}>
          {GOALS.map((goal) => (
            <Chip
              key={goal.key}
              label={goal.label}
              selected={goalType === goal.key}
              onPress={() => setGoalType(goal.key)}
            />
          ))}
        </View>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <RoundButton label="Work out my goals" onPress={() => void submit()} />
    </ScrollView>
  );
}

const Field = ({
  label,
  value,
  onChange,
  placeholder,
  numeric,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  numeric?: boolean;
}) => (
  <View>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.colour.textMuted}
      keyboardType={numeric ? "decimal-pad" : "default"}
      autoCapitalize="none"
      autoCorrect={false}
      style={styles.input}
    />
  </View>
);

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
  title: { color: theme.colour.text, fontSize: theme.font.display, fontWeight: "700" },
  intro: { color: theme.colour.textMuted, fontSize: theme.font.body, lineHeight: 22 },
  card: { gap: theme.space(1.5) },
  sectionLabel: {
    color: theme.colour.textMuted,
    fontSize: theme.font.label,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  hint: { color: theme.colour.textMuted, fontSize: theme.font.label, lineHeight: 18 },
  fieldLabel: { color: theme.colour.textMuted, fontSize: theme.font.label, marginBottom: 6 },
  input: {
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
  chipSelected: { backgroundColor: theme.colour.accent, borderColor: theme.colour.accent },
  chipLabel: { color: theme.colour.text, fontSize: theme.font.label },
  chipLabelSelected: { color: theme.colour.accentText, fontWeight: "700" },
  option: {
    padding: theme.space(1.5),
    borderRadius: theme.radius.card,
    backgroundColor: theme.colour.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colour.border,
  },
  optionSelected: { borderColor: theme.colour.accent },
  optionLabel: { color: theme.colour.text, fontSize: theme.font.body, fontWeight: "600" },
  optionHint: { color: theme.colour.textMuted, fontSize: theme.font.label, marginTop: 2 },
  error: { color: theme.colour.danger, fontSize: theme.font.body },
});
