import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, ApiError, isNetworkError } from "../src/api";
import { Card, RoundButton } from "../src/components/ui";
import { dateInputPlaceholder, parseDateInput } from "../src/date-input";
import {
  validateOnboarding,
  type OnboardingErrors,
} from "../src/onboarding-validation";
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

  const [errors, setErrors] = useState<OnboardingErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Resolved from the device, so someone in New Zealand types 15-01-1996 and
  // someone in the United States types 01-15-1996, each in their own order.
  const datePlaceholder = dateInputPlaceholder();

  const submit = async () => {
    const found = validateOnboarding({ email, birthDate, heightCm, weightKg });
    setErrors(found);
    setFormError(null);

    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const { userId } = await api.onboard({
        email: email.trim(),
        sexAtBirth,
        // Sent as ISO; validation above guarantees this parses.
        birthDate: parseDateInput(birthDate)!,
        heightCm: Number(heightCm),
        weightKg: Number(weightKg),
        activityLevel,
        goalType,
      });
      setUserId(userId);
      router.replace("/(tabs)");
    } catch (cause) {
      // Server-side field errors land in the same map as local ones, so they
      // render against the input they refer to rather than as a banner.
      if (cause instanceof ApiError && Object.keys(cause.fields).length > 0) {
        setErrors(cause.fields as OnboardingErrors);
      } else if (isNetworkError(cause)) {
        setFormError(
          "Could not reach Calora's server on port 3000. Start it with: pnpm dev:api",
        );
      } else {
        setFormError("Could not save your details. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Welcome to Calora</Text>
      <Text style={styles.intro}>
        A few details, and Calora works out what you should be eating each day.
      </Text>

      <Card style={styles.card}>
        <Field
          label="Email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          error={errors.email}
        />
        <Field
          label="Date of birth"
          value={birthDate}
          onChange={setBirthDate}
          placeholder={datePlaceholder}
          error={errors.birthDate}
        />
        <Field
          label="Height (cm)"
          value={heightCm}
          onChange={setHeightCm}
          placeholder="165"
          numeric
          error={errors.heightCm}
        />
        <Field
          label="Weight (kg)"
          value={weightKg}
          onChange={setWeightKg}
          placeholder="60"
          numeric
          error={errors.weightKg}
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

      {formError ? (
        <Card style={styles.formErrorCard}>
          <Text style={styles.formErrorText}>{formError}</Text>
        </Card>
      ) : null}

      <RoundButton
        label={submitting ? "Working it out…" : "Work out my goals"}
        onPress={() => void submit()}
      />
    </ScrollView>
  );
}

/**
 * A labelled input. When invalid, the message sits directly above the input it
 * refers to and the input itself is outlined, so the problem and the thing to
 * fix are in the same place.
 */
const Field = ({
  label,
  value,
  onChange,
  placeholder,
  numeric,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  numeric?: boolean;
  error?: string | undefined;
}) => (
  <View>
    <Text style={styles.fieldLabel}>{label}</Text>
    {error ? (
      <Text style={styles.fieldError} accessibilityRole="alert">
        {error}
      </Text>
    ) : null}
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={theme.colour.textMuted}
      keyboardType={numeric ? "decimal-pad" : "default"}
      autoCapitalize="none"
      autoCorrect={false}
      accessibilityLabel={label}
      aria-invalid={error !== undefined}
      style={[styles.input, error ? styles.inputInvalid : null]}
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
  fieldError: {
    color: theme.colour.danger,
    fontSize: theme.font.label,
    lineHeight: 18,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colour.surfaceRaised,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.space(2.5),
    paddingVertical: 12,
    color: theme.colour.text,
    fontSize: theme.font.body,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputInvalid: {
    borderColor: theme.colour.danger,
    backgroundColor: "rgba(199, 93, 74, 0.08)",
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
  formErrorCard: {
    backgroundColor: "rgba(199, 93, 74, 0.12)",
    borderWidth: 1,
    borderColor: theme.colour.danger,
  },
  formErrorText: { color: theme.colour.text, fontSize: theme.font.label, lineHeight: 19 },
});
