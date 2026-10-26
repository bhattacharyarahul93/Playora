import React, { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  Pressable,
  View,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import GoogleAuth from "@/src/services/GoogleAuth";
import { useRouter, useLocalSearchParams } from "expo-router";

const AUTH_USER_KEY = "@playora/auth_user";

type PlayoraUser = {
  id?: string;
  name: string;
  email: string;
  photo?: string | null;
};

export default function LoginScreen() {
  const router = useRouter();

  // ---- Google sign-in ----
  const {
    user,
    loading: googleLoading,
    initializing,
    error: googleErrorMessage,
    signIn,
    signOut,
  } = GoogleAuth();

  const googleUser = user
    ? {
        name: user.user.name,
        email: user.user.email,
      }
    : null;

  const googleError = googleErrorMessage ?? "";

    const handleGoogleSignOut = useCallback(() => {
      void signOut();
    }, [signOut]);

  const handleAccountPress = useCallback(() => {
    if (!googleUser) {
      void signIn();
      return;
    }

    Alert.alert("Google account", googleUser.email, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: handleGoogleSignOut,
      },
    ]);
  }, [googleUser, signIn, handleGoogleSignOut]);

  const { returnTo } = useLocalSearchParams<{
    returnTo?: string;
  }>();

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const finishLogin = async () => {
      try {
        const profile: PlayoraUser = {
          id: user.user.id,
          name: user.user.name || "PLAYORA Player",
          email: user.user.email,
          photo: user.user.photo ?? null,
        };

        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));

        const pendingRoute = await AsyncStorage.getItem(
          "@playora/pending_route",
        );

        if (cancelled) return;

        const destination =
          pendingRoute && /^\/games\/[a-zA-Z0-9_-]+$/.test(pendingRoute)
            ? pendingRoute
            : "/";

        // Clear the saved route so it isn't reused next time.
        await AsyncStorage.removeItem("@playora/pending_route");

        if (!cancelled) {
          router.replace(destination as never);
        }
      } catch (error) {
        console.error("Failed to finish login:", error);

        if (!cancelled) {
          Alert.alert(
            "Login error",
            "Your login could not be completed. Please try again.",
          );
        }
      }
    };

    void finishLogin();

    return () => {
      cancelled = true;
    };
  }, [user, router]);

  if (initializing) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#F4F9EE",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#6C63FF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F9EE" />

      <View style={styles.container}>
        <View style={styles.glowTop} />

        {/* Brand */}
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>▶</Text>
          </View>

          <Text style={styles.brandName}>PLAYORA</Text>
        </View>

        {/* Gaming illustration */}
        <View style={styles.hero}>
          <View style={styles.orbit}>
            <View style={[styles.gameTile, styles.tileOne]}>
              <Text style={styles.gameEmoji}>🎮</Text>
            </View>

            <View style={[styles.gameTile, styles.tileTwo]}>
              <Text style={styles.gameEmoji}>♟️</Text>
            </View>

            <View style={[styles.gameTile, styles.tileThree]}>
              <Text style={styles.gameEmoji}>🐍</Text>
            </View>

            <View style={[styles.gameTile, styles.tileFour]}>
              <Text style={styles.gameEmoji}>🧩</Text>
            </View>

            <View style={styles.heroCenter}>
              <Text style={styles.heroController}>🎮</Text>
            </View>
          </View>
        </View>

        {/* Welcome text */}
        <View style={styles.copyBlock}>
          <Text style={styles.eyebrow}>YOUR NEXT LEVEL STARTS HERE</Text>

          <Text style={styles.title}>Play more.{"\n"}Have more fun.</Text>

          <Text style={styles.subtitle}>
            Sign in to keep your scores, stars, and game progress together on
            PLAYORA.
          </Text>
        </View>

        {/* Google sign-in button */}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              googleUser ? "Google account" : "Continue with Google"
            }
            onPress={handleAccountPress}
            disabled={googleLoading}
            style={({ pressed }) => [
              styles.googleButton,
              pressed && !googleLoading && styles.buttonPressed,
              googleLoading && styles.buttonDisabled,
            ]}
          >
            {googleLoading ? (
              <ActivityIndicator color="#18242D" />
            ) : (
              <>
                <View style={styles.googleMark}>
                  <Text style={styles.googleMarkText}>G</Text>
                </View>

                <Text style={styles.googleButtonText}>
                  {googleUser
                    ? "Continue as " + googleUser.name
                    : "Continue with Google"}
                </Text>
              </>
            )}
          </Pressable>

          {!!googleError && <Text style={styles.errorText}>{googleError}</Text>}

          <Text style={styles.privacyText}>
            By continuing, you agree to use PLAYORA respectfully. Your Google
            account is used to identify your profile.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerDot} />

          <Text style={styles.footerText}>ONE ACCOUNT. ALL YOUR GAMES.</Text>

          <View style={styles.footerDot} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F9EE",
  },

  container: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 14,
    paddingBottom: 18,
    overflow: "hidden",
  },

  glowTop: {
    position: "absolute",
    top: -145,
    right: -105,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#DDF2C9",
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 10,
  },

  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#E85D04",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-8deg" }],
  },

  brandIconText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginLeft: 2,
  },

  brandName: {
    color: "#18242D",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 3,
  },

  hero: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    marginBottom: 8,
  },

  orbit: {
    width: 224,
    height: 190,
    alignItems: "center",
    justifyContent: "center",
  },

  heroCenter: {
    width: 112,
    height: 112,
    borderRadius: 36,
    backgroundColor: "#DDF2C9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#C6E6AC",
  },

  heroController: {
    fontSize: 58,
  },

  gameTile: {
    position: "absolute",
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#18242D",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  tileOne: {
    top: 0,
    left: 18,
    transform: [{ rotate: "-10deg" }],
  },

  tileTwo: {
    top: 10,
    right: 14,
    transform: [{ rotate: "9deg" }],
  },

  tileThree: {
    bottom: 2,
    left: 25,
    transform: [{ rotate: "8deg" }],
  },

  tileFour: {
    bottom: 0,
    right: 18,
    transform: [{ rotate: "-9deg" }],
  },

  gameEmoji: {
    fontSize: 27,
  },

  copyBlock: {
    alignItems: "center",
    marginTop: 2,
  },

  eyebrow: {
    color: "#E85D04",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "900",
    textAlign: "center",
  },

  title: {
    color: "#18242D",
    fontSize: 38,
    lineHeight: 43,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 10,
    letterSpacing: -1,
  },

  subtitle: {
    maxWidth: 320,
    color: "#66727B",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 12,
  },

  actions: {
    width: "100%",
    marginTop: 26,
    alignItems: "center",
  },

  googleButton: {
    width: "100%",
    minHeight: 58,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE4D6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 18,
    elevation: 2,
    shadowColor: "#18242D",
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  googleMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E3E7E0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  googleMarkText: {
    color: "#4285F4",
    fontSize: 18,
    fontWeight: "900",
  },

  googleButtonText: {
    color: "#18242D",
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
    textAlign: "center",
  },

  buttonPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  errorText: {
    color: "#C62828",
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
  },

  privacyText: {
    maxWidth: 320,
    color: "#8A9690",
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
    marginTop: 13,
  },

  footer: {
    marginTop: "auto",
    paddingTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  footerDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#9EC879",
  },

  footerText: {
    color: "#83917C",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
});
