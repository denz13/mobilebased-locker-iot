import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoginLogoMark } from "@/components/login-logo-mark";
import { LoginAccent, Spacing } from "@/constants/theme";
import { getFirebaseAuth } from "@/lib/firebase";

const SPLASH_MS = 5000;

export default function SplashScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    try {
      return onAuthStateChanged(getFirebaseAuth(), (u) => {
        setUser(u);
        setAuthReady(true);
      });
    } catch {
      setAuthReady(true);
      return () => {};
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (user) {
      router.replace("/dashboard");
      return;
    }
    if (splashDone) {
      router.replace("/login");
    }
  }, [authReady, splashDone, user, router]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.middle}>
          <LoginLogoMark size={160} />
          <ActivityIndicator
            style={styles.loader}
            size="large"
            color={LoginAccent.main}
          />
        </View>
        <Text style={styles.footerLabel}>Mobile Based Smart Locker v1.0</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safe: {
    flex: 1,
  },
  middle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loader: {
    marginTop: Spacing.four,
  },
  footerLabel: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    letterSpacing: 0.2,
  },
});
