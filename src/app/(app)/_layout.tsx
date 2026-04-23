import { Slot } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { MainTabBar } from '@/components/main-tab-bar';

/**
 * Shell: main app tabs share one persistent bottom navigation bar.
 * Screens outside this group (e.g. notification) render full-screen without the bar.
 */
export default function AppShellLayout() {
  return (
    <View style={styles.root}>
      <View style={styles.slot}>
        <Slot />
      </View>
      <MainTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  slot: { flex: 1 },
});
