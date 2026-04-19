import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { LoginAccent } from '@/constants/theme';

type Props = {
  /** Max width/height of the logo (square box, image uses contain). */
  size?: number;
};

const logoSource = require('@/assets/images/logo.png');

/** App logo from `assets/images/logo.png` with soft green glow. */
export function LoginLogoMark({ size = 120 }: Props) {
  const pad = Math.round(size * 0.08);
  return (
    <View style={[styles.glow, { width: size + pad * 2, height: size + pad * 2 }]}>
      <Image
        source={logoSource}
        style={{ width: size, height: size }}
        contentFit="contain"
        accessibilityLabel="App logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    shadowColor: LoginAccent.main,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
});
