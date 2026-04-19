import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

type RecordItem = {
  id: string;
  dateISO: string; // YYYY-MM-DD
  time: string;
  title: string;
  detail: string;
  status: 'granted' | 'denied' | 'locked';
};

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function prettyDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric' });
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function chipLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
}

export default function HistoryScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [showPicker, setShowPicker] = useState(false);

  const allRecords = useMemo<RecordItem[]>(
    () => [
      {
        id: '1',
        dateISO: '2026-04-18',
        time: '11:12 PM',
        title: 'Access granted',
        detail: 'UID matched • relay unlocked • 2 short beeps',
        status: 'granted',
      },
      {
        id: '2',
        dateISO: '2026-04-18',
        time: '11:17 PM',
        title: 'Auto lock',
        detail: '3 quick beeps warning • relay locked',
        status: 'locked',
      },
      {
        id: '3',
        dateISO: '2026-04-19',
        time: '12:04 AM',
        title: 'Access denied',
        detail: '1 long beep • camera trigger pulse',
        status: 'denied',
      },
    ],
    [],
  );

  const selectedISO = toISODate(selectedDate);
  const records = useMemo(() => allRecords.filter((r) => r.dateISO === selectedISO), [allRecords, selectedISO]);
  const dateChips = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 15 }).map((_, i) => addDays(base, i - 7));
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#0F172A" />
          </Pressable>
          <Text style={styles.headerTitle}>History</Text>
          <View style={styles.headerRightSpacer} />
        </View>

        <View style={styles.calendarCard}>
          <Text style={styles.calendarTitle}>Select date</Text>
          <Pressable style={({ pressed }) => [styles.dateBtn, pressed && styles.pressed]} onPress={() => setShowPicker(true)}>
            <MaterialCommunityIcons name="calendar-month-outline" size={22} color="#0F766E" />
            <Text style={styles.dateBtnText}>{prettyDate(selectedDate)}</Text>
            <MaterialCommunityIcons name="chevron-down" size={22} color="#64748B" />
          </Pressable>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}>
            {dateChips.map((d) => {
              const active = toISODate(d) === selectedISO;
              return (
                <Pressable
                  key={toISODate(d)}
                  onPress={() => setSelectedDate(d)}
                  style={({ pressed }) => [
                    styles.chip,
                    active ? styles.chipActive : styles.chipInactive,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                    {chipLabel(d)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {showPicker ? (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              // Use device locale/time settings (default). Show a calendar UI on Android too.
              display={Platform.OS === 'android' ? 'calendar' : 'inline'}
              // Keep visible on our white card even in dark mode.
              themeVariant="light"
              onChange={(_, d) => {
                if (Platform.OS !== 'ios') setShowPicker(false);
                if (d) setSelectedDate(d);
              }}
            />
          ) : null}

          {Platform.OS === 'ios' && showPicker ? (
            <Pressable style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]} onPress={() => setShowPicker(false)}>
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.recordsHeader}>
          <Text style={styles.recordsTitle}>Records</Text>
          <Text style={styles.recordsCount}>{records.length} result(s)</Text>
        </View>

        <FlatList
          data={records}
          keyExtractor={(r) => r.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={34} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No records</Text>
              <Text style={styles.emptyText}>No locker events found on this date.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View
                style={[
                  styles.rowIcon,
                  item.status === 'granted' && styles.rowIconGranted,
                  item.status === 'denied' && styles.rowIconDenied,
                  item.status === 'locked' && styles.rowIconLocked,
                ]}>
                <MaterialCommunityIcons
                  name={
                    item.status === 'granted'
                      ? 'check'
                      : item.status === 'denied'
                        ? 'close'
                        : 'lock-outline'
                  }
                  size={20}
                  color={
                    item.status === 'granted'
                      ? '#15803D'
                      : item.status === 'denied'
                        ? '#B91C1C'
                        : '#0F766E'
                  }
                />
              </View>
              <View style={styles.rowMid}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowDetail}>{item.detail}</Text>
              </View>
              <Text style={styles.rowTime}>{item.time}</Text>
            </View>
          )}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },
  safe: { flex: 1 },
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#0F172A' },
  headerRightSpacer: { width: 44 },

  calendarCard: {
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
  calendarTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  chipsRow: {
    marginTop: Spacing.three,
    gap: 10,
    paddingRight: Spacing.two,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  chipInactive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  chipTextActive: { color: '#FFFFFF' },
  chipTextInactive: { color: '#0F172A' },
  dateBtn: {
    marginTop: Spacing.three,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateBtnText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0F172A' },
  doneBtn: {
    marginTop: Spacing.three,
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.four,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0F766E',
  },
  doneBtnText: { color: '#FFFFFF', fontWeight: '800' },
  pressed: { opacity: 0.9 },

  recordsHeader: {
    marginTop: Spacing.four,
    marginHorizontal: Spacing.four,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  recordsTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  recordsCount: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconGranted: { backgroundColor: '#DCFCE7' },
  rowIconDenied: { backgroundColor: '#FEE2E2' },
  rowIconLocked: { backgroundColor: '#CCFBF1' },
  rowMid: { flex: 1, marginLeft: Spacing.three },
  rowTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  rowDetail: { marginTop: 4, fontSize: 13, fontWeight: '600', color: '#64748B' },
  rowTime: { fontSize: 12, fontWeight: '800', color: '#334155' },
  empty: {
    marginTop: Spacing.six,
    alignItems: 'center',
    padding: Spacing.four,
  },
  emptyTitle: { marginTop: Spacing.three, fontSize: 16, fontWeight: '800', color: '#0F172A' },
  emptyText: { marginTop: 6, fontSize: 13, fontWeight: '600', color: '#64748B', textAlign: 'center' },
});

