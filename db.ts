/**
 * IndexedDB の薄いラッパー。作品（画像 Blob を含む）を端末内に保存する。
 * 将来クラウド保存（Supabase など）に切り替えるときは artworkRepo の中身だけ差し替える。
 */
import type { Artwork } from '../types';

const DB_NAME = 'coloria';
const DB_VERSION = 1;
const ARTWORKS = 'artworks';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ARTWORKS)) {
        const s = db.createObjectStore(ARTWORKS, { keyPath: 'id' });
        s.createIndex('updatedAt', 'updatedAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  dbPromise.catch(() => (dbPromise = null));
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(ARTWORKS, mode);
        const req = fn(t.objectStore(ARTWORKS));
        t.oncomplete = () => resolve(req.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l());

export const artworkRepo = {
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  async list(): Promise<Artwork[]> {
    const all = await tx<Artwork[]>('readonly', (s) => s.getAll() as IDBRequest<Artwork[]>);
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(id: string): Promise<Artwork | undefined> {
    return tx<Artwork | undefined>('readonly', (s) => s.get(id) as IDBRequest<Artwork | undefined>);
  },
  async put(a: Artwork): Promise<void> {
    await tx('readwrite', (s) => s.put(a));
    notify();
  },
  async patch(id: string, p: Partial<Artwork>): Promise<Artwork | undefined> {
    const cur = await this.get(id);
    if (!cur) return undefined;
    const next = { ...cur, ...p };
    await this.put(next);
    return next;
  },
  async remove(id: string): Promise<void> {
    await tx('readwrite', (s) => s.delete(id));
    notify();
  },
};

/** ストレージの永続化をお願いする（ブラウザに勝手に消されにくくする） */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* 対応していない環境では何もしない */
  }
}
