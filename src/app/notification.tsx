import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { getFirebaseAuth, getFirebaseRTDB } from '@/lib/firebase';

type NotifType = 'granted' | 'denied' | 'locked' | 'system';

type Notif = {
  id: string;
  title: string;
  body: string;
  time: string;
  createdAt: number;
  type: NotifType;
  unread?: boolean;
};

function formatDateTime(ts: number): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

function normalizeType(raw: unknown): NotifType {
  if (raw === 'granted' || raw === 'denied' || raw === 'locked' || raw === 'system') {
    return raw;
  }
  return 'system';
}

function rowToNotif(id: string, data: unknown): Notif | null {
  if (!data || typeof data !== 'object') return null;
  const r = data as Record<string, unknown>;
  const title = typeof r.title === 'string' ? r.title.trim() : '';
  const body = typeof r.body === 'string' ? r.body.trim() : '';
  if (!title && !body) return null;
  const createdAt =
    typeof r.createdAt === 'number' && Number.isFinite(r.createdAt) ? r.createdAt : 0;
  const read = r.read === true;
  return {
    id,
    title: title || 'Notification',
    body: body || '',
    time: formatDateTime(createdAt),
    createdAt,
    type: normalizeType(r.type),
    unread: !read,
  };
}

export default function NotificationScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      setLoading(false);
      setNotifications([]);
      setListError(null);
      return;
    }

    let db;
    try {
      db = getFirebaseRTDB();
    } catch (e) {
      setListError(
        e instanceof Error ? e.message : 'Realtime Database is not configured.',
      );
      setLoading(false);
      setNotifications([]);
      return;
    }

    setLoading(true);
    const nRef = ref(db, `userNotifications/${user.uid}`);
    const unsub = onValue(
      nRef,
      (snapshot) => {
        setLoading(false);
        setListError(null);
        const val = snapshot.val() as Record<string, unknown> | null;
        if (!val) {
          setNotifications([]);
          return;
        }
        const rows: Notif[] = [];
        for (const [key, child] of Object.entries(val)) {
          const row = rowToNotif(key, child);
          if (row) rows.push(row);
        }
        rows.sort((a, b) => b.createdAt - a.createdAt);
        setNotifications(rows);
      },
      (err) => {
        setLoading(false);
        setListError(err.message);
      },
    );

    return () => unsub();
  }, [authReady, user]);

  const renderItem = ({ item }: { item: Notif }) => {
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
  };

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

        {!authReady || loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#0F766E" />
            <Text style={styles.hint}>Loading…</Text>
          </View>
        ) : !user ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons name="bell-off-outline" size={48} color="#94A3B8" />
            <Text style={styles.gateTitle}>Sign in to see notifications</Text>
            <Text style={styles.gateBody}>
              Notifications are tied to your account after you log in from the login screen.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={() => router.push('/login')}>
              <Text style={styles.primaryBtnText}>Go to login</Text>
            </Pressable>
          </View>
        ) : listError ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#B91C1C" />
            <Text style={styles.errorText}>{listError}</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(n) => n.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <MaterialCommunityIcons name="bell-outline" size={40} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No notifications yet</Text>
                <Text style={styles.emptyBody}>
                  When you sign in, we record a session notice here. Device and locker events can
                  also be written to your account path in Realtime Database.
                </Text>
              </View>
            }
            renderItem={renderItem}
          />
        )}
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
  centered: {
    flex: 1,
    paddingHorizontal: Spacing.five,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  hint: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  gateTitle: {
    marginTop: Spacing.two,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  gateBody: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: Spacing.three,
    paddingVertical: 14,
    paddingHorizontal: Spacing.five,
    borderRadius: 999,
    backgroundColor: '#0F766E',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  pressed: { opacity: 0.9 },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    lineHeight: 20,
  },
  emptyWrap: {
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#334155' },
  emptyBody: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
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
