import { describe, expect, it } from 'vitest';
import { photoToLineArt, toGray } from '../lib/lineArt';
import type { ConvertOptions, ConvertStyle } from '../types';

/** 左半分が暗く、中央に明るい円がある「写真」 */
function fakePhoto(w: number, h: number) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      const inCircle = (x - w / 2) ** 2 + (y - h / 2) ** 2 < (w / 4) ** 2;
      const v = inCircle ? 230 : x < w / 2 ? 50 : 150;
      d[p] = d[p + 1] = d[p + 2] = v;
      d[p + 3] = 255;
    }
  return d;
}

const base: ConvertOptions = { style: 'standard', detail: 50, density: 50, thickness: 3, background: 'keep', subject: 'auto' };

describe('写真 → 線画', () => {
  for (const style of ['easy', 'standard', 'detailed', 'art', 'mandala'] as ConvertStyle[]) {
    it(`${style}: 白地に線がある画像を返す`, () => {
      const w = 160, h = 120;
      const out = photoToLineArt(toGray(fakePhoto(w, h), w, h), { ...base, style });
      expect(out.length).toBe(w * h * 4);
      let dark = 0, white = 0;
      for (let i = 0; i < out.length; i += 4) {
        if (out[i] < 128) dark++;
        if (out[i] > 240) white++;
      }
      expect(dark).toBeGreaterThan(50); // 輪郭が出ている
      expect(white / (w * h)).toBeGreaterThan(0.6); // 大半は塗れる白い面
    });
  }

  it('進捗を 0→1 方向に通知する', () => {
    const w = 80, h = 60;
    const seen: number[] = [];
    photoToLineArt(toGray(fakePhoto(w, h), w, h), base, (p) => seen.push(p));
    expect(seen.length).toBeGreaterThan(3);
    expect([...seen].sort((a, b) => a - b)).toEqual(seen);
  });
});
