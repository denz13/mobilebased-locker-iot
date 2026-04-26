export const ESP_CAM_BASE = 'http://10.0.254.50';

/**
 * Shared capture slots used by Photos screen and Dashboard slider.
 * `path` must return a direct image (JPEG/PNG), not an HTML page.
 */
export const ESP_SNAPSHOT_SLOTS: { id: string; title: string; path: string }[] = [
  { id: 'rfid', title: 'Last RFID snapshot', path: '/rfid_snapshot.jpg' },
  { id: 'capture', title: 'Latest capture', path: '/capture' },
];

export function buildEspSnapshotUri(path: string, cacheBuster = 0): string {
  return `${ESP_CAM_BASE}${path}?v=${cacheBuster}`;
}
