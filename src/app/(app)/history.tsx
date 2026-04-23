import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import { onValue, ref } from 'firebase/database';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { getFirebaseRTDB } from '@/lib/firebase';

type RecordItem = {
  id: string;
  dateISO: string; // YYYY-MM-DD
  time: string;
  title: string;
  detail: string;
  status: 'granted' | 'denied' | 'locked';
};

type RfidLogRow = {
  datetime?: unknown;
  event_type?: unknown;
  firebase_auth_uid?: unknown;
  message?: unknown;
  rfid_uid?: unknown;
  status?: unknown;
  timestamp?: unknown;
  wifi_mode?: unknown;
  wifi_ssid?: unknown;
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

function toMillis(ts: unknown): number {
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return 0;
  // RTDB logs may store seconds (10 digits) or millis (13 digits).
  return ts < 1e12 ? ts * 1000 : ts;
}

function tryParseDatetime(raw: unknown): number {
  if (typeof raw !== 'string') return 0;
  const s = raw.trim();
  if (!s) return 0;

  // First try native parse (works in many JS engines).
  const t = Date.parse(s);
  if (Number.isFinite(t)) return t;

  // Hermes/React Native can fail parsing strings like "April 20, 2026 10:37 PM".
  // Parse it manually in local time.
  const m = s.match(
    /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
  );
  if (!m) return 0;

  const monthName = m[1]!.toLowerCase();
  const day = Number(m[2]);
  const year = Number(m[3]);
  let hour = Number(m[4]);
  const minute = Number(m[5]);
  const ampm = m[6]!.toUpperCase();

  const monthMap: Record<string, number> = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
  };
  const month = monthMap[monthName];
  if (month === undefined) return 0;
  if (!Number.isFinite(year) || !Number.isFinite(day) || !Number.isFinite(hour) || !Number.isFinite(minute)) {
    return 0;
  }

  if (hour === 12) hour = 0;
  if (ampm === 'PM') hour += 12;

  const d = new Date(year, month, day, hour, minute, 0, 0);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function statusFromLog(log: RfidLogRow): RecordItem['status'] {
  const msg = typeof log.message === 'string' ? log.message.toLowerCase() : '';
  const st = typeof log.status === 'string' ? log.status.toLowerCase() : '';
  const ev = typeof log.event_type === 'string' ? log.event_type.toLowerCase() : '';

  if (msg.includes('deny') || st.includes('fail') || st.includes('denied')) return 'denied';
  if (msg.includes('grant') || st.includes('success') || st.includes('granted')) return 'granted';
  if (ev.includes('lock') || msg.includes('lock')) return 'locked';
  return 'locked';
}

function titleFromStatus(s: RecordItem['status']): string {
  return s === 'granted' ? 'Access granted' : s === 'denied' ? 'Access denied' : 'Locker event';
}

function timeLabelFromMillis(ms: number): string {
  if (!ms) return '—';
  try {
    return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function rowToRecord(id: string, row: unknown): (RecordItem & { createdAt: number; authUid?: string }) | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as RfidLogRow;

  // Prefer `datetime` string when present because some devices store `timestamp` in UTC seconds,
  // which can shift the local calendar day (causing "No records" on the expected date).
  const ms = tryParseDatetime(r.datetime) || toMillis(r.timestamp);
  const d = ms ? new Date(ms) : new Date(0);

  const msg = typeof r.message === 'string' ? r.message.trim() : '';
  const rfid = typeof r.rfid_uid === 'string' ? r.rfid_uid.trim() : '';
  const wifi = typeof r.wifi_ssid === 'string' ? r.wifi_ssid.trim() : '';
  const mode = typeof r.wifi_mode === 'string' ? r.wifi_mode.trim() : '';
  const ev = typeof r.event_type === 'string' ? r.event_type.trim() : '';

  const status = statusFromLog(r);
  const title = msg ? msg.toUpperCase() : titleFromStatus(status);

  const parts: string[] = [];
  if (rfid) parts.push(`UID ${rfid}`);
  if (ev) parts.push(ev);
  if (wifi) parts.push(`WiFi ${wifi}`);
  if (mode) parts.push(mode);

  const authUid = typeof r.firebase_auth_uid === 'string' ? r.firebase_auth_uid : undefined;

  return {
    id,
    dateISO: toISODate(d),
    time: timeLabelFromMillis(ms),
    title,
    detail: parts.join(' • ') || '—',
    status,
    createdAt: ms,
    authUid,
  };
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
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [allRecords, setAllRecords] = useState<(RecordItem & { createdAt: number; authUid?: string })[]>([]);

  useEffect(() => {
    let db;
    try {
      db = getFirebaseRTDB();
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Realtime Database is not configured.');
      setLoading(false);
      setAllRecords([]);
      return;
    }

    setLoading(true);
    setListError(null);
    const logsRef = ref(db, 'rfid_logs');
    const unsub = onValue(
      logsRef,
      (snap) => {
        setLoading(false);
        const val = snap.val() as Record<string, unknown> | null;
        if (!val) {
          setAllRecords([]);
          return;
        }
        const rows: (RecordItem & { createdAt: number; authUid?: string })[] = [];
        for (const [key, row] of Object.entries(val)) {
          const rec = rowToRecord(key, row);
          if (!rec) continue;
          rows.push(rec);
        }
        rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setAllRecords(rows);
      },
      (err) => {
        setLoading(false);
        setListError(err.message);
      },
    );

    return () => unsub();
  }, []);

  const selectedISO = toISODate(selectedDate);
  const records = useMemo(
    () => allRecords.filter((r) => r.dateISO === selectedISO),
    [allRecords, selectedISO],
  );
  const dateChips = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 15 }).map((_, i) => addDays(base, i - 7));
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerSideSpacer} />
          <Text style={styles.headerTitle}>History</Text>
          <View style={styles.headerSideSpacer} />
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
          <Text style={styles.recordsCount}>
            {loading ? 'Loading…' : `${records.length} result(s)`}
          </Text>
        </View>

        {loading ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="history" size={34} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Loading</Text>
            <Text style={styles.emptyText}>Fetching RFID logs…</Text>
          </View>
        ) : listError ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="alert-circle-outline" size={34} color="#B91C1C" />
            <Text style={styles.emptyTitle}>Could not load</Text>
            <Text style={styles.emptyText}>{listError}</Text>
          </View>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(r) => r.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={34} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No records</Text>
                <Text style={styles.emptyText}>No RFID logs found on this date.</Text>
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
        )}
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
  headerSideSpacer: { width: 44 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#0F172A' },

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

