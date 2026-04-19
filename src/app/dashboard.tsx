import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';

const Teal = {
  main: '#0D9488',
  dark: '#115E59',
  cardStart: '#134E4A',
  cardEnd: '#0F766E',
  mint: '#99F6E4',
  muted: '#5EEAD4',
  navInactive: '#94A3B8',
} as const;

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
  { id: '1', label: 'Locker', source: require('@/assets/images/logo.png') },
  { id: '2', label: 'Smart', source: require('@/assets/images/logo.png') },
  { id: '3', label: 'IoT', source: require('@/assets/images/logo.png') },
] as const;

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

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [pictureIndex, setPictureIndex] = useState(0);
  const [picturesW, setPicturesW] = useState(0);
  const tabBarPad = Math.max(insets.bottom, 10);
  const tabBarH = 60 + tabBarPad;
  const bellScale = useSharedValue(1);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.topSafe} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: tabBarH + Spacing.five },
          ]}>
          <View style={styles.header}>
            <AvatarBubble label="M" />
            <View style={styles.headerText}>
              <Text style={styles.hello}>
                Hello, <Text style={styles.helloName}>Maria</Text>
              </Text>
            </View>
            <Pressable
              style={styles.bellBtn}
              hitSlop={8}
              onPress={() => {
                bellScale.value = withSequence(withSpring(1.15, { damping: 10 }), withSpring(1));
                router.push('/notification');
              }}>
              <Animated.View style={{ transform: [{ scale: bellScale }] }}>
                <MaterialCommunityIcons name="bell-outline" size={24} color="#1E293B" />
              </Animated.View>
              <View style={styles.bellDot} />
            </Pressable>
          </View>

          <AnalogClockCard />

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
                      source={p.source}
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

      <View style={[styles.tabBar, { paddingBottom: tabBarPad }]}>
        <BottomTab
          label="Home"
          icon="home"
          active
          onPress={() => router.replace('/dashboard')}
          activeColor={Teal.main}
          inactiveColor={Teal.navInactive}
        />
        <BottomTab
          label="Photos"
          icon="image-multiple-outline"
          onPress={() => router.push('/photos')}
          activeColor={Teal.main}
          inactiveColor={Teal.navInactive}
        />
        <BottomTab
          label="Items"
          icon="format-list-bulleted"
          onPress={() => router.push('/items')}
          activeColor={Teal.main}
          inactiveColor={Teal.navInactive}
        />
        <BottomTab
          label="History"
          icon="clock-outline"
          onPress={() => router.push('/history')}
          activeColor={Teal.main}
          inactiveColor={Teal.navInactive}
        />
        <BottomTab
          label="Profile"
          icon="account-circle-outline"
          onPress={() => router.push('/profile')}
          activeColor={Teal.main}
          inactiveColor={Teal.navInactive}
        />
      </View>
    </View>
  );
}

function BottomTab(props: {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  activeColor: string;
  inactiveColor: string;
  active?: boolean;
}) {
  const s = useSharedValue(1);
  const color = props.active ? props.activeColor : props.inactiveColor;

  return (
    <Pressable
      style={styles.tabItem}
      onPress={() => {
        s.value = withSequence(withSpring(1.12, { damping: 10 }), withSpring(1));
        props.onPress();
      }}>
      <Animated.View style={{ transform: [{ scale: s }] }}>
        <MaterialCommunityIcons name={props.icon} size={26} color={color} />
      </Animated.View>
      <Text style={[styles.tabLabel, props.active && styles.tabLabelActive, { color }]}>
        {props.label}
      </Text>
    </Pressable>
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
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 10,
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
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    minWidth: 72,
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '500',
    color: Teal.navInactive,
  },
  tabLabelActive: {
    color: Teal.main,
    fontWeight: '700',
  },
});
