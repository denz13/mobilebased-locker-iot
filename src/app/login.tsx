import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoginLogoMark } from '@/components/login-logo-mark';
import { LoginAccent, Spacing } from '@/constants/theme';
import { auth } from '@/lib/firebase';

export default function LoginScreen() {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSignIn = useCallback(() => {
    if (loading) return;
    setError(null);
    setLoading(true);
    signInWithEmailAndPassword(auth, email.trim(), password)
      .then(() => {
        router.replace('/dashboard');
      })
      .catch((e: unknown) => {
        const msg =
          e && typeof e === 'object' && 'message' in e
            ? String((e as { message: unknown }).message)
            : 'Login failed';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [email, loading, password, router]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <View style={styles.hero}>
              <LoginLogoMark size={220} />
              <Text style={styles.title}>Welcome back!</Text>
              <Text style={styles.subtitle}>Login to your account</Text>
            </View>

            <View style={styles.fieldShell}>
              <View style={styles.iconBubble}>
                <MaterialCommunityIcons name="email-outline" size={22} color={LoginAccent.main} />
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={styles.fieldInput}
              />
            </View>

            <View style={styles.fieldShell}>
              <View style={styles.iconBubble}>
                <MaterialCommunityIcons name="lock-outline" size={22} color={LoginAccent.main} />
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!passwordVisible}
                style={[styles.fieldInput, styles.fieldInputPassword]}
              />
              <Pressable
                onPress={() => setPasswordVisible((v) => !v)}
                style={({ pressed }) => [styles.eyeBtn, pressed && styles.pressed]}
                hitSlop={10}>
                <MaterialCommunityIcons
                  name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#94A3B8"
                />
              </Pressable>
            </View>

            <Pressable
              onPress={onSignIn}
              style={({ pressed }) => [styles.signInBtn, pressed && styles.pressed]}>
              <Text style={styles.signInLabel}>{loading ? 'Signing in...' : 'Sign in'}</Text>
            </Pressable>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.five,
  },
  safe: {
    flex: 1,
    paddingTop: Spacing.five,
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.six,
  },
  title: {
    marginTop: Spacing.three,
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    marginTop: Spacing.two,
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  fieldShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.two,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: LoginAccent.pale,
    shadowColor: LoginAccent.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: LoginAccent.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    marginRight: Spacing.two,
    backgroundColor: '#FFFFFF',
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: Platform.select({ ios: 14, default: 12 }),
  },
  fieldInputPassword: {
    paddingRight: 4,
  },
  eyeBtn: {
    padding: Spacing.two,
  },
  signInBtn: {
    marginTop: Spacing.five,
    borderRadius: 999,
    backgroundColor: LoginAccent.main,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: LoginAccent.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  signInLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorText: {
    marginTop: Spacing.three,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  pressed: {
    opacity: 0.9,
  },
});
