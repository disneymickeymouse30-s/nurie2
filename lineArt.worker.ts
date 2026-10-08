/// <reference lib="webworker" />
// 線画変換を UI スレッドから切り離して実行する Worker
import { photoToLineArt, toGray } from './lineArt';
import type { ConvertOptions } from '../types';

interface Req { id: number; rgba: Uint8ClampedArray; w: number; h: number; opts: ConvertOptions }

self.onmessage = (e: MessageEvent<Req>) => {
  const { id, rgba, w, h, opts } = e.data;
  try {
    const gray = toGray(rgba, w, h);
    const out = photoToLineArt(gray, opts, (p) => self.postMessage({ id, progress: p }));
    (self as unknown as Worker).postMessage({ id, done: true, rgba: out }, [out.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
