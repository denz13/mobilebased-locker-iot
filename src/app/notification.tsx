import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

type Notif = {
  id: string;
  title: string;
  body: string;
  time: string;
  type: 'granted' | 'denied' | 'locked' | 'system';
  unread?: boolean;
};

export default function NotificationScreen() {
  const router = useRouter();

  const notifications = useMemo<Notif[]>(
    () => [
      {
        id: '1',
        title: 'Access denied',
        body: 'Camera trigger activated (500ms pulse).',
        time: '12:04 AM',
        type: 'denied',
        unread: true,
      },
      {
        id: '2',
        title: 'Locker locked',
        body: 'Auto-lock executed after warning beeps.',
        time: '11:17 PM',
        type: 'locked',
      },
      {
        id: '3',
        title: 'Access granted',
        body: 'UID matched. Relay unlocked. 2 short beeps.',
        time: '11:12 PM',
        type: 'granted',
      },
      {
        id: '4',
        title: 'System ready',
        body: 'RFID scanner initialized. Default state: LOCK.',
        time: '10:58 PM',
        type: 'system',
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
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerRightSpacer} />
        </View>

        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const icon =
              item.type === 'denied'
                ? 'close'
                : item.type === 'granted'
                  ? 'check'
                  : item.type === 'locked'
                    ? 'lock-outline'
                    : 'information-outline';
            const iconBg =
              item.type === 'denied'
                ? '#FEE2E2'
                : item.type === 'granted'
                  ? '#DCFCE7'
                  : item.type === 'locked'
                    ? '#CCFBF1'
                    : '#E2E8F0';
            const iconColor =
              item.type === 'denied'
                ? '#B91C1C'
                : item.type === 'granted'
                  ? '#15803D'
                  : item.type === 'locked'
                    ? '#0F766E'
                    : '#334155';

            return (
              <View style={[styles.card, item.unread && styles.cardUnread]}>
                <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
                  <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
                </View>
                <View style={styles.mid}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.body}>{item.body}</Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.time}>{item.time}</Text>
                  {item.unread ? <View style={styles.unreadDot} /> : null}
                </View>
              </View>
            );
          }}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  safe: { flex: 1 },
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#0F172A' },
  headerRightSpacer: { width: 44 },
  listContent: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardUnread: {
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mid: { flex: 1 },
  title: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  body: { marginTop: 4, fontSize: 13, fontWeight: '600', color: '#64748B' },
  right: { alignItems: 'flex-end', gap: 8 },
  time: { fontSize: 12, fontWeight: '800', color: '#334155' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
});

