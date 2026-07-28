import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, ApiError, isNetworkError } from "../src/api";
import { Card, RoundButton } from "../src/components/ui";
import { DEMO_EMAIL } from "../src/demo-account";
import { validateEmail } from "../src/email";
import { useSession } from "../src/session";
import { theme } from "../src/theme";

/**
 * The first screen for anyone who is not signed in.
 *
 * Onboarding used to be the landing screen, which meant a returning user whose
 * stored session had gone - a new browser, cleared storage, a reinstall - had
 * no way back to their diary except to create a second account under a
 * different email. Their details already exist; this asks which account they
 * are, and onboarding is the branch off it rather than the default.
 *
 * No password: Calora has no credentials yet. See docs/adr/0010.
 */
export default function LoginScreen() {
  const { setUserId } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  // The problem with the email box specifically, shown against it. Anything
  // that is not about the field itself is a formError instead.
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const logIn = async (address: string) => {
    setEmailError(null);
    setFormError(null);
    setSubmitting(true);

    try {
      const { userId } = await api.login(address.trim());
      setUserId(userId);
      router.replace("/(tabs)");
    } catch (cause) {
      // An unknown email is a problem with the email box, so it is shown
      // there rather than as a banner detached from the input.
      if (cause instanceof ApiError && cause.fields.email) {
        setEmailError(cause.fields.email);
      } else if (isNetworkError(cause)) {
        setFormError(
          "Could not reach Calora's server on port 3000. Start it with: pnpm dev:api",
        );
      } else {
        setFormError("Could not sign you in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submit = () => {
    // The server is the authority on whether an account exists, so this only
    // catches the cases it could never match anyway.
    const problem = validateEmail(email);
    if (problem) {
      setEmailError(problem);
      return;
    }
    void logIn(email);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 48 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Calora</Text>
      <Text style={styles.intro}>
        Welcome back. Your goals, your diary and everything you have logged are
        waiting where you left them.
      </Text>

      <Card style={styles.card}>
        <View>
          <Text style={styles.fieldLabel}>Email</Text>
          {emailError ? (
            <Text style={styles.fieldError} accessibilityRole="alert">
              {emailError}
            </Text>
          ) : null}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={theme.colour.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            accessibilityLabel="Email"
            aria-invalid={emailError !== null}
            onSubmitEditing={submit}
            returnKeyType="go"
            style={[styles.input, emailError ? styles.inputInvalid : null]}
          />
        </View>

        <RoundButton
          label={submitting ? "Signing in…" : "Sign in"}
          onPress={submit}
        />
      </Card>

      {formError ? (
        <Card style={styles.formErrorCard}>
          <Text style={styles.formErrorText}>{formError}</Text>
        </Card>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/onboarding")}
        style={styles.secondary}
      >
        <Text style={styles.secondaryText}>
          New to Calora? <Text style={styles.link}>Set up your goals</Text>
        </Text>
      </Pressable>

      <Card style={styles.demoCard}>
        <Text style={styles.demoLabel}>Development</Text>
        <Text style={styles.demoText}>
          The dev server keeps a ready-made account at {DEMO_EMAIL} so you do
          not have to fill the form in to look at something.
        </Text>
        <RoundButton
          label="Use the test account"
          variant="quiet"
          onPress={() => void logIn(DEMO_EMAIL)}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colour.background },
  content: {
    padding: theme.space(2),
    gap: theme.space(2),
    paddingBottom: theme.space(6),
  },
  title: {
    color: theme.colour.text,
    fontSize: theme.font.display,
    fontWeight: "700",
  },
  intro: {
    color: theme.colour.textMuted,
    fontSize: theme.font.body,
    lineHeight: 22,
  },
  card: { gap: theme.space(2) },
  fieldLabel: {
    color: theme.colour.textMuted,
    fontSize: theme.font.label,
    marginBottom: 6,
  },
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
  secondary: { alignItems: "center", paddingVertical: theme.space(1) },
  secondaryText: { color: theme.colour.textMuted, fontSize: theme.font.body },
  link: { color: theme.colour.accent, fontWeight: "700" },
  demoCard: { gap: theme.space(1.5), marginTop: theme.space(2) },
  demoLabel: {
    color: theme.colour.textMuted,
    fontSize: theme.font.label,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  demoText: {
    color: theme.colour.textMuted,
    fontSize: theme.font.label,
    lineHeight: 19,
  },
  formErrorCard: {
    backgroundColor: "rgba(199, 93, 74, 0.12)",
    borderWidth: 1,
    borderColor: theme.colour.danger,
  },
  formErrorText: {
    color: theme.colour.text,
    fontSize: theme.font.label,
    lineHeight: 19,
  },
});
