import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LoginLogoMark } from "@/components/login-logo-mark";
import { LoginAccent, Spacing } from "@/constants/theme";

const SPLASH_MS = 5000;

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace("/login");
    }, SPLASH_MS);
    return () => clearTimeout(t);
  }, [router]);

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
