import { Platform } from 'react-native';

/** Fixed height of the main bottom tab bar (excluding safe area inset). */
export const MAIN_TAB_BAR_HEIGHT = 60;

export function mainTabBarTotalHeight(bottomInset: number): number {
  return MAIN_TAB_BAR_HEIGHT + Math.max(bottomInset, Platform.OS === 'ios' ? 10 : 10);
}
