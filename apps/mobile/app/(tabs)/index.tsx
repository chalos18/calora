import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type DayView } from "../../src/api";
import { MacroDonut } from "../../src/components/MacroDonut";
import { Card, Empty, EstimatedMark, MacroBar, RoundButton } from "../../src/components/ui";
import { addDays, formatDayHeading, today } from "../../src/dates";
import { useSession } from "../../src/session";
import { MEAL_SLOTS, theme } from "../../src/theme";

export default function DiaryScreen() {
  const { userId } = useSession();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [date, setDate] = useState(today());
  const [day, setDay] = useState<DayView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setError(null);
      setDay(await api.getDay(userId, date));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the day");
    }
  }, [userId, date]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!userId) return <Redirect href="/onboarding" />;

  const totals = day?.totals ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const goal = day?.goal ?? null;
  // Computed by the server; not recomputed here, so there is one rule.
  const remaining = day?.remaining ?? null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + theme.space(1) },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={theme.colour.textMuted}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      <View style={styles.dayNav}>
        <Pressable
          accessibilityLabel="Previous day"
          onPress={() => setDate(addDays(date, -1))}
          style={styles.navButton}
        >
          <Text style={styles.navGlyph}>‹</Text>
        </Pressable>

        <Text style={styles.dayHeading}>{formatDayHeading(date)}</Text>

        <Pressable
          accessibilityLabel="Next day"
          onPress={() => setDate(addDays(date, 1))}
          style={styles.navButton}
        >
          <Text style={styles.navGlyph}>›</Text>
        </Pressable>
      </View>

      {error ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <RoundButton label="Try again" variant="quiet" onPress={() => void load()} />
        </Card>
      ) : null}

      {!day && !error ? (
        <ActivityIndicator color={theme.colour.accent} style={styles.loading} />
      ) : null}

      <View style={styles.donutRow}>
        <MacroDonut
          protein={totals.protein}
          carbs={totals.carbs}
          fat={totals.fat}
          centreValue={remaining ?? totals.kcal}
          centreLabel={remaining === null ? "eaten" : "left"}
        />
      </View>

      <View style={styles.summaryRow}>
        <Summary label="Eaten" value={Math.round(totals.kcal)} />
        <Summary label="Goal" value={goal ? goal.kcal : null} />
        <Summary label="Left" value={remaining === null ? null : Math.round(remaining)} />
      </View>

      {goal && !goal.isFeasible ? (
        <Card style={styles.warningCard}>
          <Text style={styles.warningText}>
            This calorie goal is too low to meet your protein and fat minimums.
            The minimums have been kept and the calorie goal exceeded.
          </Text>
        </Card>
      ) : null}

      <Card style={styles.macros}>
        <MacroBar
          label="Protein"
          eaten={totals.protein}
          goal={goal?.proteinG ?? null}
          colour={theme.colour.protein}
        />
        <View style={styles.macroSpacer} />
        <MacroBar
          label="Carbs"
          eaten={totals.carbs}
          goal={goal?.carbsG ?? null}
          colour={theme.colour.carbs}
        />
        <View style={styles.macroSpacer} />
        <MacroBar
          label="Fat"
          eaten={totals.fat}
          goal={goal?.fatG ?? null}
          colour={theme.colour.fat}
        />
      </Card>

      {MEAL_SLOTS.map((slot) => {
        const entries = day?.entries.filter((e) => e.mealSlot === slot.key) ?? [];
        const slotKcal = entries.reduce((sum, entry) => sum + entry.kcal, 0);

        return (
          <Card key={slot.key} style={styles.slot}>
            <View style={styles.slotHeader}>
              <Text style={styles.slotTitle}>{slot.label}</Text>
              <View style={styles.slotRight}>
                <Text style={styles.slotKcal}>{Math.round(slotKcal)} kcal</Text>
                <Pressable
                  accessibilityLabel={`Add to ${slot.label}`}
                  onPress={() =>
                    router.push(`/search?slot=${slot.key}&date=${date}`)
                  }
                  style={styles.addButton}
                >
                  <Text style={styles.addGlyph}>+</Text>
                </Pressable>
              </View>
            </View>

            {entries.length === 0 ? (
              <Empty message="Nothing logged" />
            ) : (
              entries.map((entry) => (
                <Pressable
                  key={entry.id}
                  style={styles.entry}
                  onLongPress={async () => {
                    await api.deleteLogEntry(userId, entry.id);
                    await load();
                  }}
                >
                  <View style={styles.entryText}>
                    <Text style={styles.entryName} numberOfLines={1}>
                      {entry.foodName}
                    </Text>
                    <Text style={styles.entryDetail}>
                      {entry.quantity} {entry.portionLabel} · {Math.round(entry.grams)} g
                      {entry.isEstimated ? <EstimatedMark /> : null}
                    </Text>
                  </View>
                  <Text style={styles.entryKcal}>{Math.round(entry.kcal)}</Text>
                </Pressable>
              ))
            )}
          </Card>
        );
      })}

      <RoundButton
        label="Log food"
        onPress={() => router.push(`/search?date=${date}`)}
        style={styles.logButton}
      />
    </ScrollView>
  );
}

const Summary = ({ label, value }: { label: string; value: number | null }) => (
  <View style={styles.summary}>
    <Text style={styles.summaryValue}>
      {value === null ? "—" : value.toLocaleString()}
    </Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colour.background },
  content: { padding: theme.space(2), paddingBottom: theme.space(6), gap: theme.space(2) },

  dayNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colour.surface,
  },
  navGlyph: { color: theme.colour.text, fontSize: 24, lineHeight: 26 },
  dayHeading: {
    color: theme.colour.text,
    fontSize: theme.font.title,
    fontWeight: "700",
  },

  loading: { marginVertical: theme.space(4) },
  donutRow: { alignItems: "center", marginVertical: theme.space(1) },

  summaryRow: { flexDirection: "row", justifyContent: "space-around" },
  summary: { alignItems: "center" },
  summaryValue: {
    color: theme.colour.text,
    fontSize: theme.font.title,
    fontWeight: "700",
  },
  summaryLabel: {
    color: theme.colour.textMuted,
    fontSize: theme.font.label,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 2,
  },

  macros: { gap: 0 },
  macroSpacer: { height: theme.space(2) },

  slot: { gap: theme.space(1) },
  slotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  slotTitle: {
    color: theme.colour.text,
    fontSize: theme.font.body,
    fontWeight: "700",
  },
  slotRight: { flexDirection: "row", alignItems: "center", gap: theme.space(1.5) },
  slotKcal: { color: theme.colour.textMuted, fontSize: theme.font.label },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colour.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  addGlyph: {
    color: theme.colour.accentText,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "700",
  },

  entry: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colour.border,
    gap: theme.space(1),
  },
  entryText: { flex: 1 },
  entryName: { color: theme.colour.text, fontSize: theme.font.body },
  entryDetail: {
    color: theme.colour.textMuted,
    fontSize: theme.font.label,
    marginTop: 2,
  },
  entryKcal: { color: theme.colour.text, fontSize: theme.font.body, fontWeight: "600" },

  errorCard: { gap: theme.space(1.5) },
  errorText: { color: theme.colour.danger, fontSize: theme.font.body },

  warningCard: { backgroundColor: theme.colour.surfaceRaised },
  warningText: { color: theme.colour.text, fontSize: theme.font.label, lineHeight: 19 },

  logButton: { marginTop: theme.space(1) },
});
