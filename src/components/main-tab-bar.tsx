import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { MAIN_TAB_BAR_HEIGHT } from '@/constants/shell';

const Teal = {
  main: '#0D9488',
  navInactive: '#94A3B8',
} as const;

const TABS: {
  path: '/dashboard' | '/live' | '/record' | '/photos' | '/items' | '/history' | '/profile';
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { path: '/dashboard', label: 'Home', icon: 'home' },
  { path: '/live', label: 'Live', icon: 'access-point' },
  { path: '/record', label: 'Record', icon: 'clipboard-text-outline' },
  { path: '/photos', label: 'Photos', icon: 'image-multiple-outline' },
  { path: '/items', label: 'Items', icon: 'format-list-bulleted' },
  { path: '/history', label: 'History', icon: 'clock-outline' },
  { path: '/profile', label: 'Profile', icon: 'account-circle-outline' },
];

function pathMatches(pathname: string | undefined, tabPath: string): boolean {
  if (!pathname) return false;
  const last = pathname.split('/').filter(Boolean).pop() ?? '';
  const want = tabPath.replace(/^\//, '').split('/').filter(Boolean).pop() ?? '';
  return last === want;
}

export function MainTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const tabBarPad = Math.max(insets.bottom, 10);

  return (
    <View style={[styles.tabBar, { paddingBottom: tabBarPad }]}>
      {TABS.map((tab) => (
        <BottomTab
          key={tab.path}
          label={tab.label}
          icon={tab.icon}
          active={pathMatches(pathname, tab.path)}
          onPress={() => router.replace(tab.path)}
          activeColor={Teal.main}
          inactiveColor={Teal.navInactive}
        />
      ))}
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
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const rotateDeg = useSharedValue(0);
  const color = props.active ? props.activeColor : props.inactiveColor;

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotateDeg.value}deg` },
      { scale: scale.value },
    ],
  }));

  const playTabIconMotion = () => {
    scale.value = withSequence(
      withSpring(1.22, { damping: 9, stiffness: 520 }),
      withSpring(1, { damping: 12, stiffness: 380 }),
    );
    translateY.value = withSequence(
      withSpring(-5, { damping: 10, stiffness: 400 }),
      withSpring(0, { damping: 14, stiffness: 380 }),
    );
    rotateDeg.value = withSequence(
      withTiming(-10, { duration: 45 }),
      withSpring(0, { damping: 11, stiffness: 320 }),
    );
  };

  return (
    <Pressable
      style={styles.tabItem}
      onPress={() => {
        playTabIconMotion();
        props.onPress();
      }}>
      <Animated.View style={iconAnimatedStyle}>
        <MaterialCommunityIcons name={props.icon} size={26} color={color} />
      </Animated.View>
      <Text style={[styles.tabLabel, props.active && styles.tabLabelActive, { color }]}>
        {props.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    justifyContent: 'space-around',
    alignItems: 'center',
    minHeight: MAIN_TAB_BAR_HEIGHT,
  },
  tabItem: {
    alignItems: 'center',
    minWidth: 44,
    flex: 1,
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '500',
    color: Teal.navInactive,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: Teal.main,
    fontWeight: '700',
  },
});
