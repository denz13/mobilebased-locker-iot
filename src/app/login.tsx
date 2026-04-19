import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { push, ref } from 'firebase/database';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { getFirebaseAuth, getFirebaseRTDB } from '@/lib/firebase';

/** Basic check so we never call Firebase with an empty or non-email string (avoids auth/invalid-email). */
function isValidEmailFormat(value: string): boolean {
  const v = value.trim();
  if (!v || v.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function authErrorMessage(e: unknown): string {
  const code =
    e &&
    typeof e === 'object' &&
    'code' in e &&
    typeof (e as { code: unknown }).code === 'string'
      ? (e as { code: string }).code
      : '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Use a full email address (example: you@email.com). Usernames without @ are not accepted.';
    case 'auth/missing-email':
      return 'Please enter your email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong email or password. If you are new, create a user in Firebase Console → Authentication → Users.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again in a few minutes.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    default:
      if (e && typeof e === 'object' && 'message' in e) {
        return String((e as { message: unknown }).message);
      }
      return 'Login failed. Please try again.';
  }
}

export default function LoginScreen() {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  /** Firebase / server-side sign-in error (shown above the button). */
  const [authError, setAuthError] = useState<string | null>(null);
  /** After blur, keep validating while typing so feedback updates immediately. */
  const [emailWatch, setEmailWatch] = useState(false);
  const [passwordWatch, setPasswordWatch] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  /** After Firebase restores session, skip this screen if already signed in. */
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    try {
      return onAuthStateChanged(getFirebaseAuth(), (u) => {
        if (u) {
          router.replace('/dashboard');
        } else {
          setSessionChecked(true);
        }
      });
    } catch {
      setSessionChecked(true);
      return () => {};
    }
  }, [router]);

  const emailTrimmed = email.trim();

  const emailHint = useMemo(() => {
    if (!emailWatch && !submitAttempted) return null;
    if (!emailTrimmed) return 'Please enter your email address.';
    if (!isValidEmailFormat(emailTrimmed)) {
      return 'Use a valid email (e.g. you@gmail.com).';
    }
    return null;
  }, [emailTrimmed, emailWatch, submitAttempted]);

  const passwordHint = useMemo(() => {
    if (!passwordWatch && !submitAttempted) return null;
    if (!password) return 'Please enter your password.';
    return null;
  }, [password, passwordWatch, submitAttempted]);

  const onChangeEmail = useCallback((text: string) => {
    setEmail(text);
    setAuthError(null);
  }, []);

  const onChangePassword = useCallback((text: string) => {
    setPassword(text);
    setAuthError(null);
  }, []);

  const onSignIn = useCallback(() => {
    if (loading) return;
    setSubmitAttempted(true);
    setAuthError(null);
    if (!emailTrimmed) {
      setEmailWatch(true);
      return;
    }
    if (!isValidEmailFormat(emailTrimmed)) {
      setEmailWatch(true);
      return;
    }
    if (!password) {
      setPasswordWatch(true);
      return;
    }
    setLoading(true);
    signInWithEmailAndPassword(getFirebaseAuth(), emailTrimmed, password)
      .then(async (cred) => {
        try {
          const db = getFirebaseRTDB();
          await push(ref(db, `userNotifications/${cred.user.uid}`), {
            title: 'Signed in',
            body: `Session started as ${cred.user.email ?? 'your account'}.`,
            type: 'system',
            createdAt: Date.now(),
            read: false,
          });
        } catch {
          // Login still succeeded; RTDB optional for notifications
        }
        router.replace('/dashboard');
      })
      .catch((e: unknown) => {
        setAuthError(authErrorMessage(e));
      })
      .finally(() => setLoading(false));
  }, [emailTrimmed, loading, password, router]);

  if (!sessionChecked) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.authChecking}>
          <LoginLogoMark size={160} />
          <ActivityIndicator style={styles.loader} size="large" color={LoginAccent.main} />
        </View>
      </View>
    );
  }

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

            <View>
              <View
                style={[
                  styles.fieldShell,
                  emailHint ? styles.fieldShellWarning : null,
                ]}>
                <View style={styles.iconBubble}>
                  <MaterialCommunityIcons name="email-outline" size={22} color={LoginAccent.main} />
                </View>
                <TextInput
                  value={email}
                  onChangeText={onChangeEmail}
                  onBlur={() => setEmailWatch(true)}
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
              {emailHint ? (
                <Text style={styles.fieldHintError} accessibilityLiveRegion="polite">
                  {emailHint}
                </Text>
              ) : null}
            </View>

            <View>
              <View
                style={[
                  styles.fieldShell,
                  passwordHint ? styles.fieldShellWarning : null,
                ]}>
                <View style={styles.iconBubble}>
                  <MaterialCommunityIcons name="lock-outline" size={22} color={LoginAccent.main} />
                </View>
                <TextInput
                  value={password}
                  onChangeText={onChangePassword}
                  onBlur={() => setPasswordWatch(true)}
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
              {passwordHint ? (
                <Text style={styles.fieldHintError} accessibilityLiveRegion="polite">
                  {passwordHint}
                </Text>
              ) : null}
            </View>

            <View style={styles.forgotRow}>
              <Pressable
                onPress={() => router.push('/forgot-password')}
                hitSlop={12}
                style={({ pressed }) => [pressed && styles.pressed]}>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </Pressable>
            </View>

            {authError ? (
              <View style={styles.authErrorBanner} accessibilityRole="alert">
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#991B1B" />
                <Text style={styles.authErrorBannerText}>{authError}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={onSignIn}
              style={({ pressed }) => [styles.signInBtn, pressed && styles.pressed]}>
              <Text style={styles.signInLabel}>{loading ? 'Signing in...' : 'Sign in'}</Text>
            </Pressable>
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
  authChecking: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginTop: Spacing.four,
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
  fieldHintError: {
    marginBottom: Spacing.three,
    marginLeft: Spacing.two,
    fontSize: 13,
    fontWeight: '600',
    color: '#B91C1C',
    lineHeight: 18,
  },
  authErrorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  authErrorBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#991B1B',
    lineHeight: 18,
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
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  forgotLink: {
    fontSize: 14,
    fontWeight: '700',
    color: LoginAccent.main,
  },
  signInBtn: {
    marginTop: Spacing.three,
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
  pressed: {
    opacity: 0.9,
  },
});
