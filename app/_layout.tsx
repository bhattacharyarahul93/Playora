import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Stack,
  usePathname,
  useRouter,
  useRootNavigationState,
} from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";

const AUTH_USER_KEY = "@playora/auth_user";

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const navigationState = useRootNavigationState();

  const initialRedirectDone = useRef(false);

  // Always begin a fresh app launch at the login screen.
  useEffect(() => {
    if (!navigationState?.key || initialRedirectDone.current) {
      return;
    }

    initialRedirectDone.current = true;

    if (pathname !== "/login") {
      router.replace("/login");
    }
  }, [navigationState?.key, pathname, router]);

  useEffect(() => {
    if (!navigationState?.key || pathname === "/login") {
      return;
    }

    let cancelled = false;

    const checkAccess = async () => {
      try {
        const savedUser = await AsyncStorage.getItem("@playora/auth_user");

        if (cancelled) return;

        if (!savedUser) {
          // Remember the game the user wanted to open.
          if (pathname.startsWith("/games/")) {
            await AsyncStorage.setItem("@playora/pending_route", pathname);
          }

          if (!cancelled) {
            router.replace("/login");
          }
        }
      } catch (error) {
        console.error("Authentication check failed:", error);

        if (!cancelled) {
          router.replace("/login");
        }
      }
    };

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, [navigationState?.key, pathname, router]);

  if (!navigationState?.key) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="index" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="games" />
      </Stack>
    </GestureHandlerRootView>
  );
}
