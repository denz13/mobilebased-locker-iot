import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { buildEspSnapshotUri, ESP_SNAPSHOT_SLOTS } from "@/constants/esp-cam";
import { Spacing } from "@/constants/theme";

export default function PhotosScreen() {
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({});

  const bumpRefresh = useCallback(() => {
    setFailedIds({});
    setRefreshSeed((n) => n + 1);
  }, []);

  const uriFor = (path: string) => buildEspSnapshotUri(path, refreshSeed);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <View style={styles.headerSideSpacer} />
          <Text style={styles.headerTitle}>Photos</Text>
          <Pressable
            onPress={bumpRefresh}
            style={({ pressed }) => [
              styles.headerIconBtn,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons name="refresh" size={22} color="#0F766E" />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* <Text style={styles.hint}>
            Static snapshots from your locker cam. If a slot stays empty, change its path in{' '}
            <Text style={styles.hintMono}>photos.tsx</Text> to match your ESP routes.
          </Text> */}

          {ESP_SNAPSHOT_SLOTS.map((slot) => {
            const failed = failedIds[slot.id];
            return (
              <View key={slot.id} style={styles.card}>
                <Text style={styles.cardTitle}>{slot.title}</Text>
                <View style={styles.imageWrap}>
                  <Image
                    source={{ uri: uriFor(slot.path) }}
                    style={styles.cardImage}
                    contentFit="cover"
                    cachePolicy="none"
                    onError={() =>
                      setFailedIds((prev) => ({ ...prev, [slot.id]: true }))
                    }
                    onLoad={() =>
                      setFailedIds((prev) => {
                        if (!prev[slot.id]) return prev;
                        const next = { ...prev };
                        delete next[slot.id];
                        return next;
                      })
                    }
                  />
                  {failed ? (
                    <View style={styles.errorOverlay}>
                      <MaterialCommunityIcons
                        name="image-off-outline"
                        size={32}
                        color="#94A3B8"
                      />
                      <Text style={styles.errorTitle}>No image</Text>
                      <Text style={styles.errorBody}>
                        Unable to load image due to slow network. Please try refresh.
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}

          <Pressable
            onPress={bumpRefresh}
            style={({ pressed }) => [
              styles.footerBtn,
              pressed && styles.pressed,
            ]}
          >
            <MaterialCommunityIcons name="refresh" size={18} color="#0F766E" />
            <Text style={styles.footerBtnText}>Reload all photos</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerSideSpacer: { width: 44 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  scrollContent: {
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  hint: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    lineHeight: 19,
    paddingHorizontal: Spacing.two,
  },
  hintMono: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: Spacing.three,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: Spacing.two,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0F172A",
  },
  imageWrap: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    minHeight: 240,
  },
  cardImage: {
    width: "100%",
    minHeight: 240,
    backgroundColor: "#0F172A",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: Spacing.four,
    backgroundColor: "rgba(241, 245, 249, 0.96)",
  },
  errorTitle: { fontSize: 14, fontWeight: "900", color: "#475569" },
  errorBody: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: Spacing.two,
  },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  footerBtnText: { fontSize: 14, fontWeight: "900", color: "#0F766E" },
  pressed: { opacity: 0.9 },
});
