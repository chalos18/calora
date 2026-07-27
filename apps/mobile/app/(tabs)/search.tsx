import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api, type FoodSearchResult } from "../../src/api";
import { Empty } from "../../src/components/ui";
import { today } from "../../src/dates";
import { useSession } from "../../src/session";
import { theme } from "../../src/theme";

/** Sourced data is marked, so an entry someone typed in is never mistaken for it. */
const PROVENANCE_LABEL: Record<FoodSearchResult["provenance"], string> = {
  usda: "USDA",
  openfoodfacts: "Open Food Facts",
  recipe: "Recipe",
  user: "Added by a person",
};

export default function SearchScreen() {
  const { userId } = useSession();
  const router = useRouter();
  const params = useLocalSearchParams<{ slot?: string; date?: string }>();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const trimmed = query.trim();
    if (trimmed === "") {
      setResults([]);
      return;
    }

    // Search is the hottest path in the app, so it stays local and instant.
    // The debounce is only to avoid a request per keystroke.
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const { results: found } = await api.searchFoods(userId, trimmed);
        setResults(found);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, userId]);

  return (
    <View style={styles.screen}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search foods and recipes"
        placeholderTextColor={theme.colour.textMuted}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
      />

      {searching ? (
        <ActivityIndicator color={theme.colour.accent} style={styles.loading} />
      ) : null}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          query.trim() === "" ? (
            <Empty message="Search the registry, or scan a barcode" />
          ) : searching ? null : (
            <Empty message="Nothing found. You can add this food yourself." />
          )
        }
        renderItem={({ item, index }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              router.push(
                `/food/${item.id}?slot=${params.slot ?? "snacks"}&date=${
                  params.date ?? today()
                }`,
              )
            }
          >
            <View style={styles.rowText}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                {index === 0 ? (
                  <Text style={styles.bestMatch}>BEST MATCH</Text>
                ) : null}
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {item.brandName ? `${item.brandName} · ` : ""}
                {PROVENANCE_LABEL[item.provenance]}
                {item.hasRecipe ? " · has ingredients" : ""}
              </Text>
            </View>
            <Text style={styles.kcal}>{Math.round(item.kcal)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colour.background },
  input: {
    margin: theme.space(2),
    paddingHorizontal: theme.space(2.5),
    paddingVertical: 14,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colour.surface,
    color: theme.colour.text,
    fontSize: theme.font.body,
  },
  loading: { marginBottom: theme.space(1) },
  list: { paddingHorizontal: theme.space(2), paddingBottom: theme.space(4) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.space(1.75),
    borderBottomWidth: 1,
    borderBottomColor: theme.colour.border,
    gap: theme.space(1),
  },
  rowText: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: theme.space(1) },
  name: { color: theme.colour.text, fontSize: theme.font.body, flexShrink: 1 },
  bestMatch: {
    color: theme.colour.accent,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  meta: { color: theme.colour.textMuted, fontSize: theme.font.label, marginTop: 3 },
  kcal: { color: theme.colour.textMuted, fontSize: theme.font.body },
});
