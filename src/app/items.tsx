import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useMemo, useState } from 'react';
import {
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

type LockerItem = {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'inactive';
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

export default function ItemsScreen() {
  const router = useRouter();

  const initialItems = useMemo<LockerItem[]>(
    () => [
      {
        id: '1',
        title: 'Locker Door Relay',
        description: 'Controls lock/unlock (RELAY_PIN).',
        status: 'active',
        icon: 'lock-outline',
      },
      {
        id: '2',
        title: 'RFID Reader',
        description: 'Reads card UID (MFRC522).',
        status: 'active',
        icon: 'nfc-variant',
      },
      {
        id: '3',
        title: 'Camera Trigger',
        description: 'Triggers capture on denied access (CAM_TRIGGER).',
        status: 'inactive',
        icon: 'camera-outline',
      },
      {
        id: '4',
        title: 'Buzzer',
        description: 'Short/long beep feedback (BUZZER).',
        status: 'active',
        icon: 'volume-high',
      },
    ],
    [],
  );

  const [items, setItems] = useState<LockerItem[]>(() => initialItems);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('1');

  const openAdd = useCallback(() => {
    setNewName('');
    setNewQty('1');
    setAddOpen(true);
  }, []);

  const closeAdd = useCallback(() => setAddOpen(false), []);

  const saveAdd = useCallback(() => {
    const name = newName.trim();
    const qty = Number.parseInt(newQty.trim(), 10);
    if (!name) return;
    if (!Number.isFinite(qty) || qty <= 0) return;

    const id = String(Date.now());
    setItems((prev) => [
      ...prev,
      {
        id,
        title: name,
        description: `Quantity: ${qty}`,
        status: 'active',
        icon: 'cube-outline',
      },
    ]);
    setAddOpen(false);
  }, [newName, newQty]);

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

        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name={item.icon} size={24} color="#0F766E" />
              </View>
              <View style={styles.cardMid}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.description}</Text>
              </View>
              <View style={[styles.badge, item.status === 'active' ? styles.badgeOn : styles.badgeOff]}>
                <Text style={styles.badgeText}>{item.status === 'active' ? 'Active' : 'Inactive'}</Text>
              </View>
            </View>
          )}
        />

        <Pressable style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]} onPress={openAdd}>
          <MaterialCommunityIcons name="plus" size={26} color="#FFFFFF" />
        </Pressable>

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

              <View style={styles.modalActions}>
                <Pressable style={({ pressed }) => [styles.modalBtn, pressed && styles.fabPressed]} onPress={closeAdd}>
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.modalBtnPrimary, pressed && styles.fabPressed]} onPress={saveAdd}>
                  <Text style={styles.modalBtnPrimaryText}>Add</Text>
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
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six + 84,
    gap: Spacing.three,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  cardMid: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardDesc: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  badge: {
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

