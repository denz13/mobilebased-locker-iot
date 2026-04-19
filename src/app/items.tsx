import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { push, ref, onValue, update } from 'firebase/database';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { getFirebaseRTDB } from '@/lib/firebase';

const RTDB_ITEMS_PATH = 'items';

type LockerItem = {
  id: string;
  title: string;
  description: string;
  quantity: number;
  status: 'active' | 'inactive';
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  createdAt: number;
  updatedAt: number;
};

const DEFAULT_ICON: keyof typeof MaterialCommunityIcons.glyphMap = 'cube-outline';

function formatDateTime(ts: number): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

function normalizeIcon(
  raw: unknown,
): keyof typeof MaterialCommunityIcons.glyphMap {
  if (typeof raw === 'string' && raw in MaterialCommunityIcons.glyphMap) {
    return raw as keyof typeof MaterialCommunityIcons.glyphMap;
  }
  return DEFAULT_ICON;
}

function rowToLockerItem(id: string, data: unknown): LockerItem | null {
  if (!data || typeof data !== 'object') return null;
  const r = data as Record<string, unknown>;
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
  const status = r.status === 'inactive' ? 'inactive' : 'active';
  const createdAt =
    typeof r.createdAt === 'number' && Number.isFinite(r.createdAt)
      ? r.createdAt
      : 0;
  const updatedAtRaw =
    typeof r.updatedAt === 'number' && Number.isFinite(r.updatedAt)
      ? r.updatedAt
      : createdAt;
  return {
    id,
    title: name.trim(),
    quantity,
    description: `Quantity: ${quantity}`,
    status,
    icon: normalizeIcon(r.icon),
    createdAt,
    updatedAt: updatedAtRaw,
  };
}

export default function ItemsScreen() {
  const router = useRouter();

  const [items, setItems] = useState<LockerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState('1');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    let db;
    try {
      db = getFirebaseRTDB();
    } catch (e) {
      setListError(
        e instanceof Error ? e.message : 'Realtime Database is not configured.',
      );
      setLoading(false);
      return;
    }

    const itemsRef = ref(db, RTDB_ITEMS_PATH);
    const unsub = onValue(
      itemsRef,
      (snapshot) => {
        setLoading(false);
        setListError(null);
        const val = snapshot.val() as Record<string, unknown> | null;
        if (!val) {
          setItems([]);
          return;
        }
        const rows: LockerItem[] = [];
        for (const [key, child] of Object.entries(val)) {
          const row = rowToLockerItem(key, child);
          if (row) rows.push(row);
        }
        rows.sort((a, b) => b.createdAt - a.createdAt);
        setItems(rows);
      },
      (err) => {
        setLoading(false);
        setListError(err.message);
      },
    );

    return () => unsub();
  }, []);

  const openAdd = useCallback(() => {
    setNewName('');
    setNewQty('1');
    setSaveError(null);
    setAddOpen(true);
  }, []);

  const closeAdd = useCallback(() => setAddOpen(false), []);

  const saveAdd = useCallback(async () => {
    const name = newName.trim();
    const qty = Number.parseInt(newQty.trim(), 10);
    if (!name) return;
    if (!Number.isFinite(qty) || qty <= 0) return;

    setSaveError(null);
    setSaving(true);
    try {
      const db = getFirebaseRTDB();
      const now = Date.now();
      await push(ref(db, RTDB_ITEMS_PATH), {
        name,
        quantity: qty,
        status: 'active',
        icon: DEFAULT_ICON,
        createdAt: now,
        updatedAt: now,
      });
      setAddOpen(false);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : 'Could not save item. Try again.',
      );
    } finally {
      setSaving(false);
    }
  }, [newName, newQty]);

  const openEdit = useCallback((item: LockerItem) => {
    setEditId(item.id);
    setEditName(item.title);
    setEditQty(String(item.quantity));
    setEditError(null);
    setEditOpen(true);
  }, []);

  const closeEdit = useCallback(() => {
    setEditOpen(false);
    setEditId(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editId) return;
    const name = editName.trim();
    const qty = Number.parseInt(editQty.trim(), 10);
    if (!name) return;
    if (!Number.isFinite(qty) || qty <= 0) return;

    setEditError(null);
    setEditSaving(true);
    try {
      const db = getFirebaseRTDB();
      await update(ref(db, `${RTDB_ITEMS_PATH}/${editId}`), {
        name,
        quantity: qty,
        updatedAt: Date.now(),
      });
      closeEdit();
    } catch (e) {
      setEditError(
        e instanceof Error ? e.message : 'Could not update item. Try again.',
      );
    } finally {
      setEditSaving(false);
    }
  }, [closeEdit, editId, editName, editQty]);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#0F172A" />
          </Pressable>
          <Text style={styles.headerTitle}>Items</Text>
          <View style={styles.headerRightSpacer} />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#0F766E" />
            <Text style={styles.loadingText}>Loading items…</Text>
          </View>
        ) : listError ? (
          <View style={styles.centered}>
            <MaterialCommunityIcons name="alert-circle-outline" size={40} color="#B91C1C" />
            <Text style={styles.errorBannerText}>{listError}</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No items yet. Tap + to add one — it will sync to Firebase Realtime Database.
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons name={item.icon} size={24} color="#0F766E" />
                </View>
                <View style={styles.cardMid}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Pressable
                      onPress={() => openEdit(item)}
                      style={({ pressed }) => [styles.iconBtn, pressed && styles.fabPressed]}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Update item">
                      <MaterialCommunityIcons name="pencil-outline" size={22} color="#0F766E" />
                    </Pressable>
                  </View>
                  <Text style={styles.cardDesc}>{item.description}</Text>
                  <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="calendar-plus" size={14} color="#94A3B8" />
                    <Text style={styles.metaText}>
                      Saved: {formatDateTime(item.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="calendar-refresh" size={14} color="#94A3B8" />
                    <Text style={styles.metaText}>
                      Updated: {formatDateTime(item.updatedAt)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.badge, item.status === 'active' ? styles.badgeOn : styles.badgeOff]}>
                  <Text style={styles.badgeText}>{item.status === 'active' ? 'Active' : 'Inactive'}</Text>
                </View>
              </View>
            )}
          />
        )}

        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed, loading && styles.fabDisabled]}
          onPress={openAdd}
          disabled={loading || !!listError}>
          <MaterialCommunityIcons name="plus" size={26} color="#FFFFFF" />
        </Pressable>

        <Modal visible={editOpen} transparent animationType="fade" onRequestClose={closeEdit}>
          <Pressable style={styles.modalBackdrop} onPress={closeEdit}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>Update Item</Text>

              <Text style={styles.modalLabel}>Name of Item</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g. RFID Card"
                placeholderTextColor="#94A3B8"
                style={styles.modalInput}
              />

              <Text style={styles.modalLabel}>Quantity</Text>
              <TextInput
                value={editQty}
                onChangeText={(t) => setEditQty(t.replace(/[^\d]/g, ''))}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor="#94A3B8"
                style={styles.modalInput}
              />

              {editError ? <Text style={styles.saveErrorText}>{editError}</Text> : null}

              <View style={styles.modalActions}>
                <Pressable
                  style={({ pressed }) => [styles.modalBtn, pressed && styles.fabPressed]}
                  onPress={closeEdit}
                  disabled={editSaving}>
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.modalBtnPrimary, pressed && styles.fabPressed]}
                  onPress={() => void saveEdit()}
                  disabled={editSaving}>
                  <Text style={styles.modalBtnPrimaryText}>
                    {editSaving ? 'Saving…' : 'Update'}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={addOpen} transparent animationType="fade" onRequestClose={closeAdd}>
          <Pressable style={styles.modalBackdrop} onPress={closeAdd}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>Add Item</Text>

              <Text style={styles.modalLabel}>Name of Item</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. RFID Card"
                placeholderTextColor="#94A3B8"
                style={styles.modalInput}
              />

              <Text style={styles.modalLabel}>Quantity</Text>
              <TextInput
                value={newQty}
                onChangeText={(t) => setNewQty(t.replace(/[^\d]/g, ''))}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor="#94A3B8"
                style={styles.modalInput}
              />

              {saveError ? <Text style={styles.saveErrorText}>{saveError}</Text> : null}

              <View style={styles.modalActions}>
                <Pressable
                  style={({ pressed }) => [styles.modalBtn, pressed && styles.fabPressed]}
                  onPress={closeAdd}
                  disabled={saving}>
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.modalBtnPrimary, pressed && styles.fabPressed]}
                  onPress={() => void saveAdd()}
                  disabled={saving}>
                  <Text style={styles.modalBtnPrimaryText}>{saving ? 'Saving…' : 'Add'}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerRightSpacer: {
    width: 44,
  },
  centered: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    marginTop: Spacing.two,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  errorBannerText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    lineHeight: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.two,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six + 84,
    gap: Spacing.three,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardMid: {
    flex: 1,
    minWidth: 0,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  iconBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
  },
  cardDesc: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  metaText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeOn: {
    backgroundColor: '#DCFCE7',
  },
  badgeOff: {
    backgroundColor: '#E2E8F0',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.four,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F766E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  fabDisabled: {
    opacity: 0.45,
  },
  fabPressed: { opacity: 0.9 },
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
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: Spacing.three,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
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
  saveErrorText: {
    marginTop: Spacing.three,
    fontSize: 13,
    fontWeight: '600',
    color: '#B91C1C',
  },
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
    fontWeight: '800',
    color: '#0F172A',
  },
  modalBtnPrimary: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.four,
    borderRadius: 999,
    backgroundColor: '#0F766E',
  },
  modalBtnPrimaryText: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
