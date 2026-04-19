import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useCallback, useState } from 'react';
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
import { getFirebaseAuth } from '@/lib/firebase';

function isValidEmailFormat(value: string): boolean {
  const v = value.trim();
  if (!v || v.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function resetErrorMessage(e: unknown): string {
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
    case 'auth/user-not-found':
      return 'No account found for this email.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    default:
      if (e instanceof Error) return e.message;
      return 'Could not send reset email. Try again.';
  }
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const emailTrimmed = email.trim();
  const canSubmit = isValidEmailFormat(emailTrimmed);

  const onSend = useCallback(async () => {
    if (!canSubmit || loading) return;
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), emailTrimmed);
      setSent(true);
    } catch (e) {
      setError(resetErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [canSubmit, emailTrimmed, loading]);

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
              <Text style={styles.title}>Forgot password?</Text>
              <Text style={styles.subtitle}>
                Enter the email for your account. If it&apos;s registered, you&apos;ll get a reset
                link (we don&apos;t show whether an address exists, for security).
              </Text>
            </View>

            <View style={styles.fieldShell}>
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
                editable={!sent}
                style={styles.fieldInput}
              />
            </View>

            {error ? (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#991B1B" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {sent ? (
              <View style={styles.successBanner}>
                <MaterialCommunityIcons name="email-check-outline" size={22} color="#15803D" />
                <Text style={styles.successText}>
                  Request received. If {emailTrimmed} is registered, check your inbox and spam
                  folder for the reset link within a few minutes.
                </Text>
              </View>
            ) : null}

            {!sent ? (
              <Pressable
                onPress={() => void onSend()}
                disabled={!canSubmit || loading}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  (!canSubmit || loading) && styles.primaryBtnDisabled,
                  pressed && canSubmit && !loading && styles.pressed,
                ]}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send reset link</Text>
                )}
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.replace('/login')}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
                <Text style={styles.secondaryBtnText}>Back to login</Text>
              </Pressable>
            )}
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
  fieldShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.two,
    marginBottom: Spacing.three,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: Spacing.four,
    padding: Spacing.three,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  successText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    lineHeight: 20,
  },
  primaryBtn: {
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
  secondaryBtn: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LoginAccent.pale,
    backgroundColor: '#F8FAFC',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: LoginAccent.main,
  },
  pressed: {
    opacity: 0.9,
  },
});
