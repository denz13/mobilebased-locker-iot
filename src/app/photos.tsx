import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

type PhotoItem = {
  id: string;
  title: string;
  capturedAt: string;
  source: any;
};

export default function PhotosScreen() {
  const router = useRouter();

  const photos = useMemo<PhotoItem[]>(
    () => [
      {
        id: '1',
        title: 'Attempt #001',
        capturedAt: 'Sat, Apr 18, 2026 • 11:12 PM',
        source: require('@/assets/images/logo.png'),
      },
      {
        id: '2',
        title: 'Attempt #002',
        capturedAt: 'Sat, Apr 18, 2026 • 11:28 PM',
        source: require('@/assets/images/logo.png'),
      },
      {
        id: '3',
        title: 'Attempt #003',
        capturedAt: 'Sun, Apr 19, 2026 • 12:03 AM',
        source: require('@/assets/images/logo.png'),
      },
    ],
    [],
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#0F172A" />
          </Pressable>
          <Text style={styles.headerTitle}>Photos</Text>
          <View style={styles.headerRightSpacer} />
        </View>

        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={item.source} style={styles.cardImage} contentFit="cover" />
              <View style={styles.cardMeta}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDate}>{item.capturedAt}</Text>
              </View>
            </View>
          )}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerRightSpacer: {
    width: 44,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#E2E8F0',
  },
  cardMeta: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardDate: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});

