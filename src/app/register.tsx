import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoginLogoMark } from '@/components/login-logo-mark';
import { LoginAccent, Spacing } from '@/constants/theme';
import { getFirebaseAuth } from '@/lib/firebase';

function isValidEmailFormat(value: string): boolean {
  const v = value.trim();
  if (!v || v.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function signupErrorMessage(e: unknown): string {
  const code =
    e &&
    typeof e === 'object' &&
    'code' in e &&
    typeof (e as { code: unknown }).code === 'string'
      ? (e as { code: string }).code
      : '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'This email is already registered. Try logging in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      if (e instanceof Error) return e.message;
      return 'Could not create account. Please try again.';
  }
}

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }
  Alert.alert('Info', message);
}

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const emailTrimmed = email.trim();

  const emailHint = useMemo(() => {
    if (!submitAttempted) return null;
    if (!emailTrimmed) return 'Please enter your email address.';
    if (!isValidEmailFormat(emailTrimmed)) return 'Use a valid email (e.g. you@gmail.com).';
    return null;
  }, [emailTrimmed, submitAttempted]);

  const passwordHint = useMemo(() => {
    if (!submitAttempted) return null;
    if (!password) return 'Please enter a password.';
    if (password.length < 6) return 'Use at least 6 characters.';
    return null;
  }, [password, submitAttempted]);

  const confirmHint = useMemo(() => {
    if (!submitAttempted) return null;
    if (!confirmPassword) return 'Please confirm your password.';
    if (confirmPassword !== password) return 'Passwords do not match.';
    return null;
  }, [confirmPassword, password, submitAttempted]);

  const canSubmit = useMemo(() => {
    return (
      isValidEmailFormat(emailTrimmed) &&
      password.length >= 6 &&
      confirmPassword.length >= 6 &&
      password === confirmPassword
    );
  }, [confirmPassword, emailTrimmed, password]);

  const onSignUp = useCallback(async () => {
    if (loading) return;
    setSubmitAttempted(true);
    setError(null);
    if (!canSubmit) return;

    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      await createUserWithEmailAndPassword(auth, emailTrimmed, password);
      // Firebase auto-signs in after signup; sign out so user returns to login.
      await signOut(auth);
      showToast('Registration successful. Please log in.');
      router.replace('/login');
    } catch (e) {
      setError(signupErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [canSubmit, emailTrimmed, loading, password, router]);

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
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
                <MaterialCommunityIcons name="chevron-left" size={28} color="#0F172A" />
              </Pressable>
            </View>

            <View style={styles.hero}>
              <LoginLogoMark size={180} />
              <Text style={styles.title}>Create account</Text>
              <Text style={styles.subtitle}>Sign up to get started</Text>
            </View>

            <View style={styles.warningBanner} accessibilityRole="alert">
              <MaterialCommunityIcons name="alert-outline" size={18} color="#92400E" />
              <Text style={styles.warningText}>
                Use a real email you can access. Password must be at least 6 characters. Don&apos;t
                share your password.
              </Text>
            </View>

            <View>
              <View style={[styles.fieldShell, emailHint ? styles.fieldShellWarning : null]}>
                <View style={styles.iconBubble}>
                  <MaterialCommunityIcons name="email-outline" size={22} color={LoginAccent.main} />
                </View>
                <TextInput
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setError(null);
                  }}
                  placeholder="Email address"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  style={styles.fieldInput}
                />
              </View>
              {emailHint ? <Text style={styles.fieldHintError}>{emailHint}</Text> : null}
            </View>

            <View>
              <View style={[styles.fieldShell, passwordHint ? styles.fieldShellWarning : null]}>
                <View style={styles.iconBubble}>
                  <MaterialCommunityIcons name="lock-outline" size={22} color={LoginAccent.main} />
                </View>
                <TextInput
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setError(null);
                  }}
                  placeholder="Password (min 6 characters)"
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
              {passwordHint ? <Text style={styles.fieldHintError}>{passwordHint}</Text> : null}
            </View>

            <View>
              <View style={[styles.fieldShell, confirmHint ? styles.fieldShellWarning : null]}>
                <View style={styles.iconBubble}>
                  <MaterialCommunityIcons name="lock-check-outline" size={22} color={LoginAccent.main} />
                </View>
                <TextInput
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    setError(null);
                  }}
                  placeholder="Confirm password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!passwordVisible}
                  style={styles.fieldInput}
                />
              </View>
              {confirmHint ? <Text style={styles.fieldHintError}>{confirmHint}</Text> : null}
            </View>

            {error ? (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#991B1B" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => void onSignUp()}
              disabled={!canSubmit || loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                (!canSubmit || loading) && styles.primaryBtnDisabled,
                pressed && canSubmit && !loading && styles.pressed,
              ]}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Create account</Text>
              )}
            </Pressable>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <Pressable
                onPress={() => router.replace('/login')}
                hitSlop={10}
                style={({ pressed }) => [pressed && styles.pressed]}>
                <Text style={styles.loginLink}>Log in</Text>
              </Pressable>
            </View>
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
    paddingTop: Spacing.two,
  },
  header: {
    marginBottom: Spacing.two,
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
  hero: {
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  title: {
    marginTop: Spacing.three,
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: Spacing.two,
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.two,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: Spacing.four,
    padding: Spacing.three,
    borderRadius: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
    lineHeight: 18,
  },
  fieldShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.two,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: LoginAccent.pale,
    shadowColor: LoginAccent.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  fieldShellWarning: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF7F7',
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
  fieldHintError: {
    marginBottom: Spacing.three,
    marginLeft: Spacing.two,
    fontSize: 13,
    fontWeight: '600',
    color: '#B91C1C',
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
    padding: Spacing.three,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#991B1B',
    lineHeight: 18,
  },
  primaryBtn: {
    marginTop: Spacing.two,
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
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loginRow: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  loginText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '800',
    color: LoginAccent.main,
  },
  pressed: {
    opacity: 0.9,
  },
});
