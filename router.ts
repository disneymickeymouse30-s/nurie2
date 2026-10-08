/**
 * ハッシュベースの最小ルーター（静的ホスティング・PWA でもリロードで壊れない）
 */
import { useSyncExternalStore } from 'react';

export interface Route {
  path: string[]; // 例: ['edit', 'abc']
  query: URLSearchParams;
}

function parse(): Route {
  const raw = location.hash.replace(/^#\/?/, '');
  const [p, q = ''] = raw.split('?');
  return { path: p.split('/').filter(Boolean).map(decodeURIComponent), query: new URLSearchParams(q) };
}

let current = parse();
const listeners = new Set<() => void>();
window.addEventListener('hashchange', () => {
  current = parse();
  listeners.forEach((l) => l());
  window.scrollTo(0, 0);
});

export function useRoute(): Route {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}

export function navigate(to: string, replace = false) {
  const hash = '#' + (to.startsWith('/') ? to : '/' + to);
  if (replace) {
    history.replaceState(null, '', hash);
    current = parse();
    listeners.forEach((l) => l());
  } else location.hash = hash;
}

export function back(fallback = '/') {
  if (history.length > 1) history.back();
  else navigate(fallback, true);
}
