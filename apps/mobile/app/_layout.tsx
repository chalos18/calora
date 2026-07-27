import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "../src/session";
import { theme } from "../src/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.colour.background },
            headerTintColor: theme.colour.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: theme.colour.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="onboarding"
            options={{ title: "Welcome", headerShown: false }}
          />
          <Stack.Screen
            name="food/[id]"
            options={{ presentation: "modal", title: "Log food" }}
          />
        </Stack>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
