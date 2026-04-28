import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { onValue, ref as rtdbRef } from 'firebase/database';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { getFirebaseAuth, getFirebaseRTDB } from '@/lib/firebase';

const Teal = {
  main: '#0D9488',
  dark: '#115E59',
  cardStart: '#134E4A',
  cardEnd: '#0F766E',
  mint: '#99F6E4',
  muted: '#5EEAD4',
  navInactive: '#94A3B8',
} as const;

const RTDB_ITEMS_PATH = 'items';
const DASHBOARD_CAPTURE_ENDPOINT = 'http://192.168.8.50/capture';

type ItemAnalytics = {
  totalLines: number;
  totalQty: number;
  active: number;
  inactive: number;
  avgQty: number;
  last7Days: { shortLabel: string; count: number }[];
};

function dateKeyLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildLast7Template(): ItemAnalytics['last7Days'] {
  const out: ItemAnalytics['last7Days'] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    out.push({
      shortLabel: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
      count: 0,
    });
  }
  return out;
}

/** Same validity rules as `rowToLockerItem` in `items.tsx` (name/title, qty, status). */
function parseRowForStats(row: unknown): {
  quantity: number;
  active: boolean;
  createdAt: number;
} | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const name =
    typeof r.name === 'string'
      ? r.name
      : typeof r.title === 'string'
        ? r.title
        : '';
  if (!name.trim()) return null;
  const quantity =
    typeof r.quantity === 'number' && Number.isFinite(r.quantity) && r.quantity > 0
      ? r.quantity
      : 1;
  const active = r.status !== 'inactive';
  const createdAt =
    typeof r.createdAt === 'number' && Number.isFinite(r.createdAt) ? r.createdAt : 0;
  return { quantity, active, createdAt };
}

function computeItemAnalytics(val: Record<string, unknown> | null): ItemAnalytics {
  if (!val) {
    return {
      totalLines: 0,
      totalQty: 0,
      active: 0,
      inactive: 0,
      avgQty: 0,
      last7Days: buildLast7Template(),
    };
  }
  const rows: NonNullable<ReturnType<typeof parseRowForStats>>[] = [];
  for (const row of Object.values(val)) {
    const p = parseRowForStats(row);
    if (p) rows.push(p);
  }
  let totalQty = 0;
  let active = 0;
  let inactive = 0;
  const perDay: Record<string, number> = {};
  for (const p of rows) {
    totalQty += p.quantity;
    if (p.active) active++;
    else inactive++;
    if (p.createdAt > 0) {
      const d = new Date(p.createdAt);
      const key = dateKeyLocal(d);
      perDay[key] = (perDay[key] ?? 0) + 1;
    }
  }
  const totalLines = rows.length;
  const avgQty = totalLines > 0 ? Math.round((totalQty / totalLines) * 10) / 10 : 0;
  const last7Days: ItemAnalytics['last7Days'] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = dateKeyLocal(d);
    last7Days.push({
      shortLabel: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
      count: perDay[key] ?? 0,
    });
  }
  return { totalLines, totalQty, active, inactive, avgQty, last7Days };
}

const GROUPS = [
  {
    id: '1',
    title: 'Family Circle',
    nextPayout: 'Mar 1, 2026',
    pot: '$15,420',
    extra: 3,
  },
  {
    id: '2',
    title: 'Work Friends Savings',
    nextPayout: 'Mar 8, 2026',
    pot: '$8,200',
    extra: 2,
  },
  {
    id: '3',
    title: 'Weekend Trip',
    nextPayout: 'Apr 12, 2026',
    pot: '$3,150',
    extra: 5,
  },
];

const ACTIVITY = [
  {
    id: '1',
    name: 'Maria Santos',
    date: 'Feb 17, 2026',
    amount: '-$15.50',
    positive: false,
    iconBg: '#FBCFE8',
    icon: 'arrow-up' as const,
    iconColor: '#BE123C',
  },
  {
    id: '2',
    name: 'John Doe',
    date: 'Feb 16, 2026',
    amount: '+$153.00',
    positive: true,
    iconBg: '#DCFCE7',
    icon: 'arrow-down' as const,
    iconColor: '#15803D',
  },
  {
    id: '3',
    name: 'Group pot — Family Circle',
    date: 'Feb 15, 2026',
    amount: '+$42.00',
    positive: true,
    iconBg: '#CCFBF1',
    icon: 'piggy-bank' as const,
    iconColor: Teal.main,
  },
];

const PICTURES = [
  {
    id: 'capture',
    label: 'Captured from ESP-CAM',
    path: DASHBOARD_CAPTURE_ENDPOINT,
  },
];

function greetNameFromUser(u: User | null): string {
  if (!u) return 'User';
  const dn = u.displayName?.trim();
  if (dn) return dn;
  const email = u.email?.trim();
  if (email?.includes('@')) {
    return email.split('@')[0] || 'User';
  }
  return 'User';
}

function firstLetter(name: string): string {
  const t = name.trim();
  if (!t) return '?';
  return t.slice(0, 1).toUpperCase();
}

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function AnalogClockCard() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { hourDeg, minDeg, secDeg } = useMemo(() => {
    const s = now.getSeconds();
    const m = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + m / 60;
    return {
      secDeg: s * 6,
      minDeg: m * 6,
      hourDeg: h * 30,
    };
  }, [now]);

  return (
    <LinearGradient
      colors={[Teal.cardStart, Teal.cardEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.clockCard}>
      <View style={styles.clockRow}>
        <View style={styles.clockFace}>
          <View style={styles.clockTicks}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.tick,
                  { transform: [{ rotate: `${i * 30}deg` }] },
                ]}
              />
            ))}
          </View>

          <View style={[styles.handHour, { transform: [{ rotate: `${hourDeg}deg` }] }]} />
          <View style={[styles.handMin, { transform: [{ rotate: `${minDeg}deg` }] }]} />
          <View style={[styles.handSec, { transform: [{ rotate: `${secDeg}deg` }] }]} />
          <View style={styles.clockCenterDot} />
        </View>

        <View style={styles.clockMeta}>
          <Text style={styles.clockTitle}>Analog Clock</Text>
          <Text style={styles.clockDate}>{formatDate(now)}</Text>
          <Text style={styles.clockTime}>
            {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function AvatarBubble({ label, size = 44 }: { label: string; size?: number }) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{label}</Text>
    </View>
  );
}

function ActionPill({
  icon,
  label,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.actionPill, pressed && { opacity: 0.85 }]}>
      <View style={styles.actionIconWrap}>
        <MaterialCommunityIcons name={icon} size={22} color="#FFFFFF" />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

/** Inner drawable height inside the track (track clips overflow). */
const ANALYTICS_BAR_TRACK_H = 88;
const ANALYTICS_BAR_INNER_MAX = ANALYTICS_BAR_TRACK_H - 6;

function ItemsAnalyticsBlock({
  data,
  loading,
  hasError,
  onOpenItems,
}: {
  data: ItemAnalytics | null;
  loading: boolean;
  hasError: boolean;
  onOpenItems: () => void;
}) {
  const a = data ?? computeItemAnalytics(null);
  const maxC = Math.max(1, ...a.last7Days.map((x) => x.count));

  return (
    <View style={styles.analyticsCard}>
      <View style={styles.analyticsHeaderRow}>
        <Text style={styles.analyticsTitle}>Items analytics</Text>
        <Pressable onPress={onOpenItems} hitSlop={8}>
          <Text style={styles.sectionLink}>View all</Text>
        </Pressable>
      </View>
      {hasError ? (
        <Text style={styles.analyticsErr}>
          Could not load live counts. Check your connection and Firebase rules.
        </Text>
      ) : null}

      {loading ? (
        <View style={styles.analyticsLoading}>
          <ActivityIndicator color={Teal.main} />
          <Text style={styles.analyticsLoadingText}>Loading…</Text>
        </View>
      ) : (
        <>
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsCell}>
              <Text style={styles.analyticsCellLabel}>Stored lines</Text>
              <Text style={styles.analyticsCellValue}>{a.totalLines}</Text>
            </View>
            <View style={styles.analyticsCell}>
              <Text style={styles.analyticsCellLabel}>Total quantity</Text>
              <Text style={styles.analyticsCellValue}>{a.totalQty}</Text>
            </View>
            <View style={styles.analyticsCell}>
              <Text style={styles.analyticsCellLabel}>Active</Text>
              <Text style={[styles.analyticsCellValue, { color: '#15803D' }]}>{a.active}</Text>
            </View>
            <View style={styles.analyticsCell}>
              <Text style={styles.analyticsCellLabel}>Inactive</Text>
              <Text style={[styles.analyticsCellValue, { color: '#64748B' }]}>{a.inactive}</Text>
            </View>
          </View>
          <Text style={styles.analyticsAvg}>
            Avg quantity per line: <Text style={styles.analyticsAvgNum}>{a.avgQty}</Text>
          </Text>

          <Text style={styles.analyticsChartCaption}>New items per day (last 7 days)</Text>
          <View style={styles.analyticsChartOuter}>
            <View style={styles.analyticsChartRow}>
              {a.last7Days.map((d, i) => {
                const rawH =
                  d.count === 0
                    ? 2
                    : Math.max(4, (d.count / maxC) * ANALYTICS_BAR_INNER_MAX);
                const barH = Math.min(ANALYTICS_BAR_INNER_MAX, rawH);
                return (
                  <View key={i} style={styles.analyticsBarCol}>
                    <View style={[styles.analyticsBarTrack, { height: ANALYTICS_BAR_TRACK_H }]}>
                      <View style={[styles.analyticsBarFill, { height: barH }]} />
                    </View>
                    <Text style={styles.analyticsBarCount} numberOfLines={1}>
                      {d.count}
                    </Text>
                    <Text style={styles.analyticsBarDay} numberOfLines={2}>
                      {d.shortLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [pictureIndex, setPictureIndex] = useState(0);
  const [picturesW, setPicturesW] = useState(0);
  const [picturesSeed] = useState(() => Date.now());
  const [loggingOut, setLoggingOut] = useState(false);
  const [itemAnalytics, setItemAnalytics] = useState<ItemAnalytics | null>(null);
  const [itemsAnalyticsError, setItemsAnalyticsError] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  /** Space for floating logout button above bottom edge (tab bar is outside this screen). */
  const fabClearance = 72;
  const bellScale = useSharedValue(1);
  const bellTranslateY = useSharedValue(0);
  /** Extra rotation when tapped (idle swing uses `bellIdleRotate`). */
  const bellRotateDeg = useSharedValue(0);
  /** Continuous gentle swing like a hanging bell (no tap needed). */
  const bellIdleRotate = useSharedValue(0);
  const bellIdleSwayY = useSharedValue(0);

  const bellIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bellTranslateY.value + bellIdleSwayY.value },
      {
        rotate: `${bellIdleRotate.value + bellRotateDeg.value}deg`,
      },
      { scale: bellScale.value },
    ],
  }));

  const playBellMotion = useCallback(() => {
    bellScale.value = withSequence(
      withSpring(1.22, { damping: 9, stiffness: 520 }),
      withSpring(1, { damping: 12, stiffness: 380 }),
    );
    bellTranslateY.value = withSequence(
      withSpring(-5, { damping: 10, stiffness: 400 }),
      withSpring(0, { damping: 14, stiffness: 380 }),
    );
    bellRotateDeg.value = withSequence(
      withTiming(-14, { duration: 55 }),
      withSpring(0, { damping: 10, stiffness: 320 }),
    );
  }, []);

  useEffect(() => {
    bellIdleRotate.value = withRepeat(
      withTiming(11, {
        duration: 2200,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
    bellIdleSwayY.value = withRepeat(
      withTiming(2.5, {
        duration: 1900,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(bellIdleRotate);
      cancelAnimation(bellIdleSwayY);
    };
  }, []);

  useEffect(() => {
    return onAuthStateChanged(getFirebaseAuth(), setUser);
  }, []);

  useEffect(() => {
    if (!user) {
      setHasUnreadNotifications(false);
      return;
    }
    let db;
    try {
      db = getFirebaseRTDB();
    } catch {
      setHasUnreadNotifications(false);
      return;
    }

    const nRef = rtdbRef(db, `userNotifications/${user.uid}`);
    const unsub = onValue(
      nRef,
      (snap) => {
        const val = snap.val() as Record<string, unknown> | null;
        if (!val) {
          setHasUnreadNotifications(false);
          return;
        }
        const anyUnread = Object.values(val).some((row) => {
          if (!row || typeof row !== 'object') return false;
          return (row as { read?: unknown }).read !== true;
        });
        setHasUnreadNotifications(anyUnread);
      },
      () => setHasUnreadNotifications(false),
    );

    return () => unsub();
  }, [user]);

  useEffect(() => {
    let db;
    try {
      db = getFirebaseRTDB();
    } catch {
      setItemsAnalyticsError(true);
      setItemAnalytics(computeItemAnalytics(null));
      return;
    }
    const itemsRef = rtdbRef(db, RTDB_ITEMS_PATH);
    const unsub = onValue(
      itemsRef,
      (snap) => {
        setItemsAnalyticsError(false);
        setItemAnalytics(computeItemAnalytics(snap.val() as Record<string, unknown> | null));
      },
      () => {
        setItemsAnalyticsError(true);
        setItemAnalytics(computeItemAnalytics(null));
      },
    );
    return () => unsub();
  }, []);

  const greetName = useMemo(() => greetNameFromUser(user), [user]);
  const avatarLetter = useMemo(() => firstLetter(greetName), [greetName]);

  const performLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut(getFirebaseAuth());
      router.replace('/login');
    } catch {
      setLoggingOut(false);
    }
  }, [loggingOut, router]);

  const confirmLogout = useCallback(() => {
    Alert.alert(
      'Log out?',
      'You will need to sign in again to access your locker dashboard and synced data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => void performLogout(),
        },
      ],
    );
  }, [performLogout]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.topSafe} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: fabClearance + Spacing.five },
          ]}>
          <View style={styles.header}>
            <AvatarBubble label={avatarLetter} />
            <View style={styles.headerText}>
              <Text style={styles.hello}>
                Hello, <Text style={styles.helloName}>{greetName}</Text>
              </Text>
            </View>
            <Pressable
              style={styles.bellBtn}
              hitSlop={8}
              onPress={() => {
                playBellMotion();
                router.push('/notification');
              }}>
              <Animated.View style={[bellIconAnimatedStyle, styles.bellInner]}>
                <MaterialCommunityIcons name="bell-outline" size={24} color="#1E293B" />
                {hasUnreadNotifications ? <View style={styles.bellDot} /> : null}
              </Animated.View>
            </Pressable>
          </View>

          <AnalogClockCard />

          <ItemsAnalyticsBlock
            data={itemAnalytics}
            loading={itemAnalytics === null}
            hasError={itemsAnalyticsError}
            onOpenItems={() => router.push('/items')}
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pictures</Text>
          </View>
          <View
            style={styles.picturesCard}
            onLayout={(e) => setPicturesW(e.nativeEvent.layout.width)}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const w = e.nativeEvent.layoutMeasurement.width || 1;
                setPictureIndex(Math.max(0, Math.min(PICTURES.length - 1, Math.round(x / w))));
              }}>
              {PICTURES.map((p) => (
                <View
                  key={p.id}
                  style={[styles.picturePage, picturesW ? { width: picturesW } : null]}>
                  <View style={styles.pictureTile}>
                    <Image
                      source={{ uri: `${p.path}?v=${picturesSeed}` }}
                      style={styles.pictureImage}
                      contentFit="cover"
                      accessibilityLabel={p.label}
                    />
                    <View style={styles.pictureOverlay}>
                      <Text style={styles.pictureLabel}>{p.label}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.dotsRow}>
              {PICTURES.map((p, i) => (
                <View
                  key={p.id}
                  style={[styles.dot, i === pictureIndex ? styles.dotActive : styles.dotInactive]}
                />
              ))}
            </View>
          </View>

          <View style={styles.aboutCard}>
            <Text style={styles.aboutTitle}>About this app</Text>
            <Text style={styles.aboutText}>
              This dashboard mirrors the locker hardware logic:
            </Text>
            <View style={styles.aboutList}>
              <Text style={styles.aboutBullet}>
                • RFID UID read via MFRC522. If UID matches, the relay unlocks and the GREEN LED turns on.
              </Text>
              <Text style={styles.aboutBullet}>
                • Access granted: 2 short buzzer beeps, then the locker stays unlocked for ~8 seconds.
              </Text>
              <Text style={styles.aboutBullet}>
                • Last 3 seconds warning: at ~5 seconds, 3 quick beeps play, then the relay returns to LOCK.
              </Text>
              <Text style={styles.aboutBullet}>
                • Access denied: RED LED + 1 long beep, and the camera trigger pin pulses HIGH ~500ms to capture a photo.
              </Text>
            </View>
            <Text style={styles.aboutNote}>
              Note: the camera trigger shares the same pin as the RED LED in your firmware (CAM_TRIGGER = D8).
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Pressable
        style={({ pressed }) => [
          styles.logoutFab,
          { bottom: Math.max(insets.bottom, 12) },
          pressed && styles.logoutFabPressed,
          loggingOut && styles.logoutFabDisabled,
        ]}
        onPress={confirmLogout}
        disabled={loggingOut}
        accessibilityRole="button"
        accessibilityLabel="Log out">
        {loggingOut ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <MaterialCommunityIcons name="logout" size={24} color="#FFFFFF" />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  topSafe: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  headerText: {
    flex: 1,
    marginLeft: Spacing.three,
  },
  hello: {
    fontSize: 18,
    color: '#334155',
  },
  helloName: {
    fontWeight: '700',
    color: '#0F172A',
  },
  bellBtn: {
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
  bellInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  avatar: {
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '700',
    color: '#64748B',
  },
  clockCard: {
    borderRadius: 20,
    padding: Spacing.four,
    paddingBottom: Spacing.five,
    marginBottom: Spacing.five,
  },
  clockRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  clockFace: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockTicks: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    position: 'absolute',
    width: 2,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 2,
    top: 6,
  },
  handHour: {
    position: 'absolute',
    width: 4,
    height: 30,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    top: 54 - 30,
    transformOrigin: 'bottom',
  },
  handMin: {
    position: 'absolute',
    width: 3,
    height: 40,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    top: 54 - 40,
    transformOrigin: 'bottom',
  },
  handSec: {
    position: 'absolute',
    width: 2,
    height: 44,
    borderRadius: 2,
    backgroundColor: '#99F6E4',
    top: 54 - 44,
    transformOrigin: 'bottom',
  },
  clockCenterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  clockMeta: { flex: 1 },
  clockTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '600',
  },
  clockDate: {
    marginTop: 6,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  clockTime: {
    marginTop: 6,
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  analyticsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.four,
    marginBottom: Spacing.five,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  analyticsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  analyticsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  analyticsErr: {
    fontSize: 13,
    color: '#B45309',
    fontWeight: '500',
    marginBottom: Spacing.two,
  },
  analyticsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: Spacing.three,
  },
  analyticsLoadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  analyticsCell: {
    width: '48%',
    flexGrow: 1,
    minWidth: '46%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  analyticsCellLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  analyticsCellValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  analyticsAvg: {
    marginTop: Spacing.three,
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  analyticsAvgNum: {
    fontWeight: '800',
    color: Teal.main,
  },
  analyticsChartCaption: {
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  analyticsChartOuter: {
    width: '100%',
    overflow: 'hidden',
  },
  analyticsChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    overflow: 'hidden',
    gap: 4,
  },
  analyticsBarCol: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    maxWidth: '100%',
    alignItems: 'center',
  },
  analyticsBarTrack: {
    width: '100%',
    maxWidth: 48,
    alignSelf: 'center',
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
  },
  analyticsBarFill: {
    width: '78%',
    maxWidth: 40,
    backgroundColor: Teal.main,
    borderRadius: 4,
  },
  analyticsBarCount: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  analyticsBarDay: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.five,
    gap: 8,
  },
  actionPill: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  actionIconWrap: {
    width: '100%',
    maxWidth: 56,
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  actionLabel: {
    marginTop: Spacing.two,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  sectionHeaderTight: {
    marginTop: Spacing.five,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionLink: {
    fontSize: 15,
    fontWeight: '600',
    color: Teal.main,
  },
  picturesCard: {
    backgroundColor: 'transparent',
  },
  picturePage: {
    width: '100%',
  },
  pictureTile: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  pictureImage: {
    width: '100%',
    height: '100%',
  },
  pictureOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  pictureLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.three,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 18,
    backgroundColor: Teal.main,
  },
  dotInactive: {
    backgroundColor: '#CBD5E1',
  },
  aboutCard: {
    marginTop: Spacing.five,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  aboutText: {
    marginTop: 8,
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  aboutList: {
    marginTop: Spacing.three,
    gap: 8,
  },
  aboutBullet: {
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
    fontWeight: '500',
  },
  aboutNote: {
    marginTop: Spacing.three,
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
    fontWeight: '500',
  },
  logoutFab: {
    position: 'absolute',
    right: Spacing.four,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Teal.dark,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  logoutFabPressed: {
    opacity: 0.92,
  },
  logoutFabDisabled: {
    opacity: 0.75,
  },
});
