import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { Spacing } from '@/constants/theme';

const ESP_CAM_STREAM_URL = 'http://10.0.254.50/';

export default function LiveScreen() {
  const [streamError, setStreamError] = useState(false);
  const [streamRefreshSeed, setStreamRefreshSeed] = useState(0);
  const espOnline = !streamError;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.headerSideSpacer} />
            <Text style={styles.headerTitle}>Live</Text>
            <View style={styles.headerSideSpacer} />
          </View>

          <View style={styles.cameraCard}>
            <View style={styles.cameraTopRow}>
              <View style={styles.cameraTitleRow}>
                <MaterialCommunityIcons name="cctv" size={18} color="#0F172A" />
                <Text style={styles.cameraTitle}>ESP32-CAM</Text>
              </View>
              <View style={[styles.pill, espOnline ? styles.pillLive : styles.pillOffline]}>
                <View style={[styles.pillDot, espOnline ? styles.pillDotLive : styles.pillDotOffline]} />
                <Text style={styles.pillText}>{espOnline ? 'LIVE' : 'OFFLINE'}</Text>
              </View>
            </View>

            <View style={[styles.videoFrame, !espOnline && styles.videoFrameOffline]}>
              <View style={styles.videoOverlayTop}>
                <View style={[styles.overlayChip, !espOnline && styles.overlayChipWarn]}>
                  <MaterialCommunityIcons
                    name={espOnline ? 'signal' : 'signal-off'}
                    size={14}
                    color="#E2E8F0"
                  />
                  <Text style={styles.overlayChipText}>
                    {espOnline ? 'Signal' : 'No signal'}
                  </Text>
                </View>
                <View style={[styles.overlayChip, !espOnline && styles.overlayChipWarn]}>
                  <MaterialCommunityIcons
                    name={espOnline ? 'video-outline' : 'lan-disconnect'}
                    size={14}
                    color="#E2E8F0"
                  />
                  <Text style={styles.overlayChipText}>{espOnline ? 'ESP stream' : 'Not connected'}</Text>
                </View>
              </View>

              <WebView
                key={streamRefreshSeed}
                source={{ uri: ESP_CAM_STREAM_URL }}
                style={styles.streamImage}
                onLoadStart={() => setStreamError(false)}
                onError={() => setStreamError(true)}
                javaScriptEnabled
                domStorageEnabled
                allowsInlineMediaPlayback
                mixedContentMode="always"
                originWhitelist={['*']}
              />

              {!espOnline ? (
                <View style={styles.videoCenter}>
                  <View style={[styles.videoIconCircle, styles.videoIconCircleOffline]}>
                    <MaterialCommunityIcons name="wifi-off" size={36} color="#F87171" />
                  </View>
                  <Text style={styles.videoCenterTitle}>ESP32-CAM not connected</Text>
                  <Text style={styles.videoCenterSub}>
                    The camera is offline or unreachable. Check power, Wi-Fi, and make sure{' '}
                    {ESP_CAM_STREAM_URL} is accessible from this phone.
                  </Text>
                </View>
              ) : null}
            </View>

            {!espOnline ? (
              <View style={styles.offlineBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#B45309" />
                <Text style={styles.offlineBannerText}>
                  Cannot reach {ESP_CAM_STREAM_URL}. Keep your phone and ESP32-CAM on the same network.
                </Text>
              </View>
            ) : null}

            <View style={styles.cameraActions}>
              <Pressable
                onPress={() => {
                  setStreamError(false);
                  setStreamRefreshSeed((v) => v + 1);
                }}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
                <MaterialCommunityIcons name="refresh" size={18} color="#0F766E" />
                <Text style={styles.secondaryBtnText}>Refresh</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="information-outline" size={22} color="#0F766E" />
              <Text style={styles.infoTitle}>Live monitor</Text>
            </View>
            <Text style={styles.infoBody}>
              This page shows your current ESP32-CAM feed in real time. Use Refresh if the network
              gets slow or the frame stalls.
            </Text>
          </View>

          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>Tips</Text>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons name="wifi" size={18} color="#64748B" />
              <Text style={styles.tipText}>Keep the phone and ESP32-CAM on the same Wi‑Fi network.</Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons name="flash-outline" size={18} color="#64748B" />
              <Text style={styles.tipText}>Good lighting improves motion detection and video quality.</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  safe: { flex: 1 },
  scrollContent: {
    paddingBottom: Spacing.six,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerSideSpacer: { width: 44 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#0F172A' },
  cameraCard: {
    marginHorizontal: Spacing.two,
    marginBottom: Spacing.four,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cameraTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: Spacing.three,
  },
  cameraTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cameraTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillLive: { backgroundColor: '#DCFCE7' },
  pillOffline: { backgroundColor: '#F1F5F9' },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillDotLive: { backgroundColor: '#16A34A' },
  pillDotOffline: { backgroundColor: '#94A3B8' },
  pillText: { fontSize: 12, fontWeight: '900', color: '#0F172A' },
  videoFrame: {
    width: '100%',
    minHeight: 360,
    aspectRatio: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
  },
  streamImage: {
    ...StyleSheet.absoluteFillObject,
  },
  videoFrameOffline: {
    backgroundColor: '#0F172A',
    borderColor: 'rgba(248,113,113,0.35)',
  },
  videoOverlayTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  overlayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.16)',
  },
  overlayChipWarn: {
    backgroundColor: 'rgba(127, 29, 29, 0.55)',
    borderColor: 'rgba(254, 202, 202, 0.25)',
  },
  overlayChipText: { fontSize: 12, fontWeight: '800', color: '#E2E8F0' },
  videoCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: 8,
  },
  videoIconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(226, 232, 240, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.14)',
  },
  videoIconCircleOffline: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderColor: 'rgba(248, 113, 113, 0.35)',
  },
  videoCenterTitle: { fontSize: 14, fontWeight: '900', color: '#E2E8F0', textAlign: 'center' },
  videoCenterSub: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textAlign: 'center', lineHeight: 18 },
  offlineBanner: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: Spacing.three,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    lineHeight: 19,
  },
  cameraActions: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  secondaryBtn: {
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '900', color: '#0F766E' },
  pressed: { opacity: 0.9 },
  infoCard: {
    marginHorizontal: Spacing.two,
    marginBottom: Spacing.four,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.two },
  infoTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  infoBody: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 21,
  },
  tipsCard: {
    marginHorizontal: Spacing.two,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: Spacing.three,
  },
  tipsTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tipText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#64748B', lineHeight: 19 },
});
