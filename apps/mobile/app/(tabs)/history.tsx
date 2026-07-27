import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../../src/api";
import { Empty } from "../../src/components/ui";
import { today } from "../../src/dates";
import { useSession } from "../../src/session";
import { theme } from "../../src/theme";

interface RecentFood {
  foodId: string;
  foodName: string;
  lastLoggedAt: string;
}

export default function HistoryScreen() {
  const { userId } = useSession();
  const router = useRouter();
  const [foods, setFoods] = useState<RecentFood[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      void api.recentFoods(userId).then(({ foods: recent }) => setFoods(recent));
    }, [userId]),
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={foods}
        keyExtractor={(item) => item.foodId}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Empty message="Nothing logged yet" />}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              router.push(`/food/${item.foodId}?slot=snacks&date=${today()}`)
            }
          >
            <Text style={styles.name} numberOfLines={1}>
              {item.foodName}
            </Text>
            <Text style={styles.when}>
              {new Date(item.lastLoggedAt).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
              })}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colour.background },
  list: { padding: theme.space(2) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.space(1.75),
    borderBottomWidth: 1,
    borderBottomColor: theme.colour.border,
    gap: theme.space(1),
  },
  name: { color: theme.colour.text, fontSize: theme.font.body, flex: 1 },
  when: { color: theme.colour.textMuted, fontSize: theme.font.label },
});
