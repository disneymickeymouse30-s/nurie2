/**
 * 軽い設定・履歴は localStorage に保存（使えない環境ではメモリのみで動作）
 */
import { useSyncExternalStore } from 'react';

export interface Settings {
  guestId: string;
  displayName: string;
  watermark: boolean;
  shareFormat: 'png' | 'jpg';
  recentColors: string[];
  customColors: string[];
  favoritePages: string[];
  /** 利用した日（YYYY-MM-DD）の一覧。連続日数計算用 */
  activeDays: string[];
  uploadNoticeAccepted: boolean;
  lastPaletteId: string;
}

const KEY = 'coloria.settings.v1';

function uid() {
  return (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
}

const defaults = (): Settings => ({
  guestId: 'guest-' + uid(),
  displayName: 'ゲスト',
  watermark: true,
  shareFormat: 'png',
  recentColors: [],
  customColors: [],
  favoritePages: [],
  activeDays: [],
  uploadNoticeAccepted: false,
  lastPaletteId: 'pastel',
});

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaults();
}

let state: Settings = load();
const listeners = new Set<() => void>();

export function getSettings(): Settings {
  return state;
}

export function updateSettings(p: Partial<Settings> | ((s: Settings) => Partial<Settings>)) {
  const patch = typeof p === 'function' ? p(state) : p;
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* 容量不足などは無視（メモリ上では保持） */
  }
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export function pushRecentColor(hex: string) {
  updateSettings((s) => ({ recentColors: [hex, ...s.recentColors.filter((c) => c !== hex)].slice(0, 12) }));
}

export function toggleFavoritePage(id: string) {
  updateSettings((s) => ({
    favoritePages: s.favoritePages.includes(id) ? s.favoritePages.filter((x) => x !== id) : [id, ...s.favoritePages],
  }));
}

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function markActiveToday() {
  const t = todayKey();
  if (!state.activeDays.includes(t)) updateSettings((s) => ({ activeDays: [t, ...s.activeDays].slice(0, 400) }));
}

/** 連続利用日数（今日または昨日から遡って数える） */
export function streakDays(days: string[]): number {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(todayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(todayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export const newId = uid;
