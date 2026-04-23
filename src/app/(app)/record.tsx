import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import { onValue, ref } from 'firebase/database';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { getFirebaseRTDB } from '@/lib/firebase';

const RTDB_VIDEOS_PATH = 'recorded_videos';

type VideoItem = {
  id: string;
  dateISO: string; // YYYY-MM-DD
  time: string;
  title: string;
  detail: string;
  status: 'ready' | 'processing' | 'failed';
  createdAt: number;
  url?: string;
  durationSec?: number;
};

type VideoRow = {
  datetime?: unknown;
  status?: unknown;
  timestamp?: unknown;
  title?: unknown;
  name?: unknown;
  filename?: unknown;
  url?: unknown;
  downloadURL?: unknown;
  videoUrl?: unknown;
  duration?: unknown;
  durationSec?: unknown;
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

function toMillis(ts: unknown): number {
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return 0;
  return ts < 1e12 ? ts * 1000 : ts;
}

function tryParseDatetime(raw: unknown): number {
  if (typeof raw !== 'string') return 0;
  const s = raw.trim();
  if (!s) return 0;
  const t = Date.parse(s);
  if (Number.isFinite(t)) return t;
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

  if (hour === 12) hour = 0;
  if (ampm === 'PM') hour += 12;

  const d = new Date(year, month, day, hour, minute, 0, 0);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function statusFromRow(r: VideoRow): VideoItem['status'] {
  const st = typeof r.status === 'string' ? r.status.toLowerCase() : '';
  if (st.includes('process') || st.includes('uploading') || st.includes('pending')) return 'processing';
  if (st.includes('fail') || st.includes('error')) return 'failed';
  return 'ready';
}

function titleFromRow(r: VideoRow): string {
  const t =
    typeof r.title === 'string'
      ? r.title
      : typeof r.name === 'string'
        ? r.name
        : typeof r.filename === 'string'
          ? r.filename
          : '';
  return t.trim() || 'Recorded video';
}

function urlFromRow(r: VideoRow): string | undefined {
  const u =
    typeof r.url === 'string'
      ? r.url
      : typeof r.downloadURL === 'string'
        ? r.downloadURL
        : typeof r.videoUrl === 'string'
          ? r.videoUrl
          : '';
  const out = u.trim();
  return out ? out : undefined;
}

function timeLabel(ms: number): string {
  if (!ms) return '—';
  try {
    return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function normalizeDurationSec(r: VideoRow): number | undefined {
  const raw =
    typeof r.durationSec === 'number'
      ? r.durationSec
      : typeof r.duration === 'number'
        ? r.duration
        : typeof r.duration === 'string'
          ? Number(r.duration)
          : undefined;
  if (raw === undefined) return undefined;
  if (!Number.isFinite(raw) || raw <= 0) return undefined;
  return Math.round(raw);
}

function durationLabel(sec?: number): string | null {
  if (!sec) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function rowToVideo(id: string, row: unknown): VideoItem | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as VideoRow;
  const createdAt = tryParseDatetime(r.datetime) || toMillis(r.timestamp);
  const d = createdAt ? new Date(createdAt) : new Date(0);

  const status = statusFromRow(r);
  const title = titleFromRow(r);
  const url = urlFromRow(r);
  const dur = normalizeDurationSec(r);
  const durLabel = durationLabel(dur);

  const parts: string[] = [];
  if (durLabel) parts.push(`Duration ${durLabel}`);
  parts.push(status === 'ready' ? 'Ready' : status === 'processing' ? 'Processing' : 'Failed');
  if (!url) parts.push('No URL');

  return {
    id,
    dateISO: toISODate(d),
    time: timeLabel(createdAt),
    title: title,
    detail: parts.join(' • ') || '—',
    status,
    createdAt,
    url,
    durationSec: dur,
  };
}

export default function RecordScreen() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);

  useEffect(() => {
    let db;
    try {
      db = getFirebaseRTDB();
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Realtime Database is not configured.');
      setLoading(false);
      setAllVideos([]);
      return;
    }

    setLoading(true);
    setListError(null);
    const logsRef = ref(db, RTDB_VIDEOS_PATH);
    const unsub = onValue(
      logsRef,
      (snap) => {
        setLoading(false);
        const val = snap.val() as Record<string, unknown> | null;
        if (!val) {
          setAllVideos([]);
          return;
        }
        const rows: VideoItem[] = [];
        for (const [key, row] of Object.entries(val)) {
          const v = rowToVideo(key, row);
          if (v) rows.push(v);
        }
        rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setAllVideos(rows);
      },
      (err) => {
        setLoading(false);
        setListError(err.message);
      },
    );

    return () => unsub();
  }, []);

  const selectedISO = toISODate(selectedDate);
  const videos = useMemo(
    () => allVideos.filter((r) => r.dateISO === selectedISO),
    [allVideos, selectedISO],
  );
  const dateChips = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 15 }).map((_, i) => addDays(base, i - 7));
  }, []);

  const openVideo = async (url?: string) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      // no-op
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerSideSpacer} />
          <Text style={styles.headerTitle}>Record</Text>
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
              display={Platform.OS === 'android' ? 'calendar' : 'inline'}
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
          <Text style={styles.recordsTitle}>Recorded videos</Text>
          <Text style={styles.recordsCount}>
            {loading ? 'Loading…' : `${videos.length} video(s)`}
          </Text>
        </View>

        {loading ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="history" size={34} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Loading</Text>
            <Text style={styles.emptyText}>Fetching recorded videos…</Text>
          </View>
        ) : listError ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="alert-circle-outline" size={34} color="#B91C1C" />
            <Text style={styles.emptyTitle}>Could not load</Text>
            <Text style={styles.emptyText}>{listError}</Text>
          </View>
        ) : (
          <FlatList
            data={videos}
            keyExtractor={(r) => r.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <MaterialCommunityIcons name="video-outline" size={40} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No videos</Text>
                <Text style={styles.emptyText}>
                  No entries found in `{RTDB_VIDEOS_PATH}` for this date.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.videoCard}>
                <View style={styles.videoIcon}>
                  <MaterialCommunityIcons
                    name={
                      item.status === 'ready'
                        ? 'play-circle-outline'
                        : item.status === 'processing'
                          ? 'progress-clock'
                          : 'alert-circle-outline'
                    }
                    size={22}
                    color={
                      item.status === 'ready'
                        ? '#0F766E'
                        : item.status === 'processing'
                          ? '#B45309'
                          : '#B91C1C'
                    }
                  />
                </View>

                <View style={styles.videoMid}>
                  <View style={styles.videoTopRow}>
                    <Text style={styles.videoTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.videoTime}>{item.time}</Text>
                  </View>
                  <Text style={styles.videoDetail} numberOfLines={2}>
                    {item.detail}
                  </Text>
                  <View style={styles.videoActions}>
                    <View style={[
                      styles.statusPill,
                      item.status === 'ready' ? styles.statusReady : item.status === 'processing' ? styles.statusProcessing : styles.statusFailed,
                    ]}>
                      <Text style={styles.statusPillText}>
                        {item.status === 'ready' ? 'READY' : item.status === 'processing' ? 'PROCESSING' : 'FAILED'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => void openVideo(item.url)}
                      disabled={!item.url || item.status !== 'ready'}
                      style={({ pressed }) => [
                        styles.playBtn,
                        (!item.url || item.status !== 'ready') && styles.playBtnDisabled,
                        pressed && styles.pressed,
                      ]}
                      hitSlop={8}>
                      <MaterialCommunityIcons name="play" size={18} color="#FFFFFF" />
                      <Text style={styles.playBtnText}>Open</Text>
                    </Pressable>
                  </View>
                </View>
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
  videoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: Spacing.three,
  },
  videoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoMid: { flex: 1, minWidth: 0 },
  videoTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  videoTitle: { flex: 1, fontSize: 15, fontWeight: '900', color: '#0F172A' },
  videoTime: { fontSize: 12, fontWeight: '800', color: '#334155' },
  videoDetail: { marginTop: 4, fontSize: 13, fontWeight: '600', color: '#64748B' },
  videoActions: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusReady: { backgroundColor: '#DCFCE7' },
  statusProcessing: { backgroundColor: '#FFEDD5' },
  statusFailed: { backgroundColor: '#FEE2E2' },
  statusPillText: { fontSize: 11, fontWeight: '900', color: '#0F172A' },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#0F766E',
  },
  playBtnDisabled: {
    opacity: 0.5,
  },
  playBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  empty: {
    marginTop: Spacing.six,
    alignItems: 'center',
    padding: Spacing.four,
  },
  emptyTitle: { marginTop: Spacing.three, fontSize: 16, fontWeight: '800', color: '#0F172A' },
  emptyText: { marginTop: 6, fontSize: 13, fontWeight: '600', color: '#64748B', textAlign: 'center' },
});

