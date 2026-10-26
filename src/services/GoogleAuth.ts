import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { useCallback, useEffect, useState } from "react";
import type { User } from "@react-native-google-signin/google-signin";

type GoogleAuthError = {
  code?: string;
  message?: string;
};

const clientId = process.env.EXPO_PUBLIC_CLIENTID;

GoogleSignin.configure({
  webClientId: clientId,
  offlineAccess: true,
});

const GoogleAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const restoreSession = useCallback(async () => {
    try {
      const response = await GoogleSignin.signInSilently();

      if (response.type === "success") {
        const signedInUser = response.data;

        if (!signedInUser.idToken) {
          setError("Google ID token was not received.");
          return;
        }

        setUser(signedInUser);
      } else {
        setUser(null);
      }
    } catch (error: unknown) {
      const authError = error as GoogleAuthError;

      if (
        authError.code === statusCodes.SIGN_IN_REQUIRED ||
        authError.code === statusCodes.SIGN_IN_CANCELLED
      ) {
        setUser(null);
      } else {
        console.warn("Google session restoration failed:", error);
        setUser(null);
      }
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const signIn = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await GoogleSignin.hasPlayServices();

      const response = await GoogleSignin.signIn();

      if (response.type !== "success") {
        return;
      }

      const signedInUser = response.data;

      if (!signedInUser.idToken) {
        setError("Google ID token was not received.");
        return;
      }

      setUser(signedInUser);
    } catch (error: unknown) {
      const authError = error as GoogleAuthError;

      if (authError.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }

      if (authError.code === statusCodes.IN_PROGRESS) {
        setError("Google sign-in is already in progress.");
      } else if (authError.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError("Google Play Services is not available.");
      } else {
        setError(authError.message ?? "Google sign-in failed.");
        console.error("Google sign-in failed:", error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Sign out from Google first.
      await GoogleSignin.signOut();

      // Clear the in-memory Google user.
      setUser(null);
    } catch (error: unknown) {
      const authError = error as GoogleAuthError;

      console.error("Sign-out error:", error);
      setError(authError.message ?? "Google sign-out failed.");

      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    initializing,
    error,
    signIn,
    signOut,
  };
};

export default GoogleAuth;
