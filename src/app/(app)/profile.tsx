import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reload,
  reauthenticateWithCredential,
  updateEmail,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth';
import { onValue, ref, update } from 'firebase/database';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Platform,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { getFirebaseAuth, getFirebaseRTDB, getFirebaseStorage } from '@/lib/firebase';

function authErr(e: unknown): string {
  const code =
    e &&
    typeof e === 'object' &&
    'code' in e &&
    typeof (e as { code: unknown }).code === 'string'
      ? (e as { code: string }).code
      : '';
  switch (code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Current password is incorrect.';
    case 'auth/requires-recent-login':
      return 'Please sign out and sign in again, then retry.';
    case 'auth/email-already-in-use':
      return 'That email is already used by another account.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.';
    default:
      if (e instanceof Error) return e.message;
      return 'Something went wrong. Try again.';
  }
}

type ProfileView = {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  lockerId: string;
  deviceId: string;
  photoUri: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [phone, setPhone] = useState('');

  const [profile, setProfile] = useState<ProfileView>(() => ({
    fullName: '…',
    username: '…',
    email: '',
    phone: '',
    role: 'Operator',
    lockerId: 'LOCKER-001',
    deviceId: 'ESP8266 / NodeMCU',
    photoUri: '',
  }));

  const [editOpen, setEditOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhotoUri, setEditPhotoUri] = useState('');
  const [reauthPwd, setReauthPwd] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdVisible, setPwdVisible] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u);
      setAuthReady(true);
      if (!u) {
        router.replace('/login');
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    let db;
    try {
      db = getFirebaseRTDB();
    } catch {
      return;
    }
    const r = ref(db, `userProfiles/${user.uid}/phone`);
    const unsub = onValue(r, (snap) => {
      const v = snap.val();
      setPhone(typeof v === 'string' ? v : '');
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const dn = user.displayName || user.email?.split('@')[0] || 'User';
    setProfile({
      fullName: dn,
      username: dn,
      email: user.email || '',
      phone,
      role: 'Operator',
      lockerId: 'LOCKER-001',
      deviceId: 'ESP8266 / NodeMCU',
      photoUri: user.photoURL || '',
    });
  }, [user, phone]);

  const emailChanged = useMemo(() => {
    if (!user?.email) return false;
    return editEmail.trim().toLowerCase() !== user.email.toLowerCase();
  }, [editEmail, user]);

  const openPwd = useCallback(() => {
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setPwdVisible(false);
    setPwdError(null);
    setPwdOpen(true);
  }, []);

  const closePwd = useCallback(() => setPwdOpen(false), []);

  const openEdit = useCallback(() => {
    if (!user) return;
    const dn = user.displayName || user.email?.split('@')[0] || '';
    setEditUsername(dn);
    setEditEmail(user.email || '');
    setEditPhone(phone);
    setEditPhotoUri(user.photoURL || '');
    setReauthPwd('');
    setEditError(null);
    setEditOpen(true);
  }, [phone, user]);

  const closeEdit = useCallback(() => setEditOpen(false), []);

  const pickProfilePhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
      aspect: [1, 1],
      selectionLimit: 1,
    });

    if (!res.canceled && res.assets?.[0]?.uri) {
      setEditPhotoUri(res.assets[0].uri);
    }
  }, []);

  const canSaveEdit =
    editUsername.trim().length >= 2 &&
    editEmail.trim().includes('@') &&
    editPhone.trim().length >= 7 &&
    (!emailChanged || reauthPwd.length > 0);

  const saveEdit = useCallback(async () => {
    if (!canSaveEdit || !user || savingEdit) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const auth = getFirebaseAuth();
      const u = auth.currentUser;
      if (!u) throw new Error('Not signed in');

      let photoURL: string | undefined = u.photoURL || undefined;
      if (editPhotoUri && !/^https?:\/\//i.test(editPhotoUri)) {
        const res = await fetch(editPhotoUri);
        const blob = await res.blob();
        const storage = getFirebaseStorage();
        const path = storageRef(storage, `avatars/${u.uid}/profile.jpg`);
        await uploadBytes(path, blob, { contentType: blob.type || 'image/jpeg' });
        photoURL = await getDownloadURL(path);
      } else if (editPhotoUri && /^https?:\/\//i.test(editPhotoUri)) {
        photoURL = editPhotoUri;
      }

      await updateProfile(u, {
        displayName: editUsername.trim(),
        photoURL: photoURL || undefined,
      });

      if (emailChanged && u.email) {
        const cred = EmailAuthProvider.credential(u.email, reauthPwd);
        await reauthenticateWithCredential(u, cred);
        await updateEmail(u, editEmail.trim());
        await reload(u);
      }

      const db = getFirebaseRTDB();
      await update(ref(db, `userProfiles/${u.uid}`), {
        phone: editPhone.trim(),
        updatedAt: Date.now(),
      });

      setEditOpen(false);
      setReauthPwd('');
    } catch (e) {
      setEditError(authErr(e));
    } finally {
      setSavingEdit(false);
    }
  }, [
    canSaveEdit,
    editEmail,
    editPhone,
    editPhotoUri,
    editUsername,
    emailChanged,
    reauthPwd,
    savingEdit,
    user,
  ]);

  const canSavePwd =
    currentPwd.trim().length > 0 &&
    newPwd.trim().length >= 6 &&
    confirmPwd.trim().length >= 6 &&
    newPwd === confirmPwd;

  const savePwd = useCallback(async () => {
    if (!canSavePwd || savingPwd) return;
    const auth = getFirebaseAuth();
    const u = auth.currentUser;
    if (!u?.email) return;

    setSavingPwd(true);
    setPwdError(null);
    try {
      const cred = EmailAuthProvider.credential(u.email, currentPwd.trim());
      await reauthenticateWithCredential(u, cred);
      await updatePassword(u, newPwd.trim());
      setPwdOpen(false);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (e) {
      setPwdError(authErr(e));
    } finally {
      setSavingPwd(false);
    }
  }, [canSavePwd, currentPwd, newPwd, savingPwd]);

  if (!authReady || !user) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <SafeAreaView style={[styles.safe, styles.centered]} edges={['top', 'bottom']}>
          <ActivityIndicator size="large" color="#0F766E" />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerSideSpacer} />
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerSideSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Pressable style={styles.avatar} onPress={openEdit} hitSlop={10}>
              {profile.photoUri ? (
                <Image
                  source={{ uri: profile.photoUri }}
                  style={styles.avatarImage}
                  contentFit="cover"
                  accessibilityLabel="Profile photo"
                />
              ) : (
                <Text style={styles.avatarText}>{profile.fullName.slice(0, 1).toUpperCase()}</Text>
              )}
              <View style={styles.avatarEditBadge}>
                <MaterialCommunityIcons name="pencil" size={14} color="#0F766E" />
              </View>
            </Pressable>
            <Text style={styles.name}>{profile.fullName}</Text>
            <Text style={styles.sub}>Mobile Based Smart Locker</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account</Text>
              <InfoRow icon="account-outline" label="Display name" value={profile.username} />
              <InfoRow icon="email-outline" label="Email" value={profile.email || '—'} />
              <InfoRow icon="phone-outline" label="Phone" value={profile.phone || '—'} />
              <InfoRow icon="shield-check-outline" label="Role" value={profile.role} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Device</Text>
              <InfoRow icon="locker" label="Locker ID" value={profile.lockerId} />
              <InfoRow icon="memory" label="Hardware" value={profile.deviceId} />
            </View>

            <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]} onPress={openPwd}>
              <MaterialCommunityIcons name="key-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Change Password</Text>
            </Pressable>

            <Pressable style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]} onPress={openEdit}>
              <MaterialCommunityIcons name="account-edit-outline" size={20} color="#0F766E" />
              <Text style={styles.secondaryBtnText}>Edit Profile</Text>
            </Pressable>
          </View>
        </ScrollView>

        <Modal visible={editOpen} transparent animationType="fade" onRequestClose={closeEdit}>
          <Pressable style={styles.modalBackdrop} onPress={closeEdit}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>Edit Profile</Text>

              <Pressable style={styles.photoPickerRow} onPress={pickProfilePhoto}>
                <View style={styles.photoCircle}>
                  {editPhotoUri ? (
                    <Image source={{ uri: editPhotoUri }} style={styles.photoCircleImage} contentFit="cover" />
                  ) : (
                    <MaterialCommunityIcons name="account-circle-outline" size={40} color="#0F766E" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.photoPickerTitle}>Profile picture</Text>
                  <Text style={styles.photoPickerSub}>Tap to update (uploads to Firebase Storage)</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={26} color="#64748B" />
              </Pressable>

              <Text style={styles.modalLabel}>Display name</Text>
              <TextInput
                value={editUsername}
                onChangeText={setEditUsername}
                placeholder="Your name"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
                style={styles.modalInput}
              />

              <Text style={styles.modalLabel}>Email</Text>
              <TextInput
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Email"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.modalInput}
              />

              {emailChanged ? (
                <>
                  <Text style={styles.modalHint}>
                    Changing email requires your current account password to verify it’s you.
                  </Text>
                  <Text style={styles.modalLabel}>Current password</Text>
                  <TextInput
                    value={reauthPwd}
                    onChangeText={setReauthPwd}
                    secureTextEntry
                    placeholder="Password for current email"
                    placeholderTextColor="#94A3B8"
                    style={styles.modalInput}
                  />
                </>
              ) : null}

              <Text style={styles.modalLabel}>Phone</Text>
              <TextInput
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Phone"
                placeholderTextColor="#94A3B8"
                keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'phone-pad'}
                style={styles.modalInput}
              />

              {editError ? <Text style={styles.errorText}>{editError}</Text> : null}

              <View style={styles.modalActions}>
                <Pressable
                  style={({ pressed }) => [styles.modalBtn, pressed && styles.pressed]}
                  onPress={closeEdit}
                  disabled={savingEdit}>
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalBtnPrimary,
                    !canSaveEdit && styles.modalBtnPrimaryDisabled,
                    pressed && canSaveEdit && styles.pressed,
                  ]}
                  onPress={() => void saveEdit()}
                  disabled={!canSaveEdit || savingEdit}>
                  {savingEdit ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalBtnPrimaryText}>Save</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={pwdOpen} transparent animationType="fade" onRequestClose={closePwd}>
          <Pressable style={styles.modalBackdrop} onPress={closePwd}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>Change Password</Text>

              <Text style={styles.modalLabel}>Current Password</Text>
              <TextInput
                value={currentPwd}
                onChangeText={setCurrentPwd}
                secureTextEntry={!pwdVisible}
                placeholder="Enter current password"
                placeholderTextColor="#94A3B8"
                style={styles.modalInput}
              />

              <Text style={styles.modalLabel}>New Password</Text>
              <TextInput
                value={newPwd}
                onChangeText={setNewPwd}
                secureTextEntry={!pwdVisible}
                placeholder="Minimum 6 characters"
                placeholderTextColor="#94A3B8"
                style={styles.modalInput}
              />

              <Text style={styles.modalLabel}>Confirm New Password</Text>
              <TextInput
                value={confirmPwd}
                onChangeText={setConfirmPwd}
                secureTextEntry={!pwdVisible}
                placeholder="Re-enter new password"
                placeholderTextColor="#94A3B8"
                style={styles.modalInput}
              />

              <Pressable
                style={({ pressed }) => [styles.toggleRow, pressed && styles.pressed]}
                onPress={() => setPwdVisible((v) => !v)}>
                <MaterialCommunityIcons
                  name={pwdVisible ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#64748B"
                />
                <Text style={styles.toggleText}>{pwdVisible ? 'Hide passwords' : 'Show passwords'}</Text>
              </Pressable>

              {newPwd.length > 0 && confirmPwd.length > 0 && newPwd !== confirmPwd ? (
                <Text style={styles.errorText}>Passwords do not match.</Text>
              ) : null}

              {pwdError ? <Text style={styles.errorText}>{pwdError}</Text> : null}

              <View style={styles.modalActions}>
                <Pressable
                  style={({ pressed }) => [styles.modalBtn, pressed && styles.pressed]}
                  onPress={closePwd}
                  disabled={savingPwd}>
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalBtnPrimary,
                    !canSavePwd && styles.modalBtnPrimaryDisabled,
                    pressed && canSavePwd && styles.pressed,
                  ]}
                  onPress={() => void savePwd()}
                  disabled={!canSavePwd || savingPwd}>
                  {savingPwd ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalBtnPrimaryText}>Save</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <MaterialCommunityIcons name={icon} size={18} color="#0F766E" />
      </View>
      <View style={styles.infoMid}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  safe: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerSideSpacer: { width: 44 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  content: {
    paddingBottom: Spacing.six,
  },
  card: {
    marginHorizontal: Spacing.four,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarEditBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarText: { fontSize: 28, fontWeight: '900', color: '#0F766E' },
  name: { marginTop: Spacing.three, textAlign: 'center', fontSize: 20, fontWeight: '900', color: '#0F172A' },
  sub: { marginTop: 6, textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#64748B' },
  section: { marginTop: Spacing.five },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A', marginBottom: Spacing.three },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  infoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoMid: { flex: 1 },
  infoLabel: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  infoValue: { marginTop: 2, fontSize: 14, fontWeight: '800', color: '#0F172A' },
  primaryBtn: {
    marginTop: Spacing.five,
    backgroundColor: '#0F766E',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  secondaryBtn: {
    marginTop: Spacing.three,
    backgroundColor: '#ECFEFF',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  secondaryBtnText: { color: '#0F766E', fontWeight: '900', fontSize: 15 },
  pressed: { opacity: 0.9 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.four,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: Spacing.three,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#334155',
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  modalHint: {
    marginTop: Spacing.two,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    lineHeight: 17,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  photoPickerRow: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoCircleImage: { width: '100%', height: '100%' },
  photoPickerTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  photoPickerSub: { marginTop: 2, fontSize: 12, fontWeight: '700', color: '#64748B' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: Spacing.three },
  toggleText: { fontSize: 13, fontWeight: '800', color: '#475569' },
  errorText: { marginTop: Spacing.two, fontSize: 12, fontWeight: '900', color: '#B91C1C' },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: Spacing.four,
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.four,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  modalBtnText: {
    fontWeight: '900',
    color: '#0F172A',
  },
  modalBtnPrimary: {
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.four,
    borderRadius: 999,
    backgroundColor: '#0F766E',
  },
  modalBtnPrimaryDisabled: {
    backgroundColor: '#94A3B8',
  },
  modalBtnPrimaryText: {
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
