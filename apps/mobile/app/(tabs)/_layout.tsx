import { Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";
import { theme } from "../../src/theme";

const icon = (glyph: string) => {
  const Icon = ({ color }: { color: ColorValue }) => (
    <Text style={{ color, fontSize: 20 }}>{glyph}</Text>
  );
  Icon.displayName = `TabIcon(${glyph})`;
  return Icon;
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.colour.background },
        headerTintColor: theme.colour.text,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: theme.colour.background },
        tabBarStyle: {
          backgroundColor: theme.colour.surface,
          borderTopColor: theme.colour.border,
        },
        tabBarActiveTintColor: theme.colour.accent,
        tabBarInactiveTintColor: theme.colour.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Diary", headerShown: false, tabBarIcon: icon("◍") }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: "Search", tabBarIcon: icon("⌕") }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: "History", tabBarIcon: icon("↺") }}
      />
    </Tabs>
  );
}
