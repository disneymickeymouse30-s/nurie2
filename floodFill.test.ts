import { describe, expect, it } from 'vitest';
import { buildLineMasks, computeFillRegion, dilate } from '../lib/floodFill';

/** 白地に黒い枠（正方形）を描いた RGBA を作る */
function boxImage(w: number, h: number, box: [number, number, number, number], gapAt?: number, lineGray = 0) {
  const d = new Uint8ClampedArray(w * h * 4).fill(255);
  const [x0, y0, x1, y1] = box;
  const set = (x: number, y: number, v: number) => {
    const p = (y * w + x) * 4;
    d[p] = d[p + 1] = d[p + 2] = v;
  };
  for (let x = x0; x <= x1; x++) for (const y of [y0, y0 + 1, y1 - 1, y1]) set(x, y, lineGray);
  for (let y = y0; y <= y1; y++) for (const x of [x0, x0 + 1, x1 - 1, x1]) set(x, y, lineGray);
  // 枠の右辺に 1px の隙間をあける
  if (gapAt !== undefined) for (const x of [x1 - 1, x1]) set(x, gapAt, 255);
  return d;
}

const count = (m: Uint8Array) => m.reduce((a, v) => a + v, 0);

describe('塗りつぶし', () => {
  it('枠の内側だけを塗り、外にはみ出さない', () => {
    const w = 60, h = 60;
    const m = buildLineMasks(boxImage(w, h, [10, 10, 40, 40]), w, h, 1);
    const r = computeFillRegion(m, 25, 25)!;
    expect(r).not.toBeNull();
    expect(r.mask[5 * w + 5]).toBe(0); // 外側
    expect(r.mask[25 * w + 25]).toBe(1); // 内側
    expect(r.x0).toBeGreaterThanOrEqual(9);
    expect(r.x1).toBeLessThanOrEqual(41);
  });

  it('線のすき間（1px）からは色が漏れない', () => {
    const w = 60, h = 60;
    const m = buildLineMasks(boxImage(w, h, [10, 10, 40, 40], 25), w, h, 1);
    const r = computeFillRegion(m, 25, 25)!;
    expect(r.mask[25 * w + 50]).toBe(0);
    expect(r.x1).toBeLessThanOrEqual(42);
  });

  it('アンチエイリアスの灰色の線も壁として扱う', () => {
    const w = 60, h = 60;
    const m = buildLineMasks(boxImage(w, h, [10, 10, 40, 40], undefined, 140), w, h, 1);
    const r = computeFillRegion(m, 25, 25)!;
    expect(r.mask[5 * w + 5]).toBe(0);
  });

  it('線の下まで塗り広げて白いフチを残さない', () => {
    const w = 60, h = 60;
    const m = buildLineMasks(boxImage(w, h, [10, 10, 40, 40]), w, h, 1);
    const r = computeFillRegion(m, 25, 25)!;
    // 内側の線ピクセル (11,25) まで塗られている
    expect(r.mask[25 * w + 12]).toBe(1);
    expect(r.mask[25 * w + 11]).toBe(1);
  });

  it('線の上をタップしても近くの領域を塗れる', () => {
    const w = 60, h = 60;
    const m = buildLineMasks(boxImage(w, h, [10, 10, 40, 40]), w, h, 1);
    const r = computeFillRegion(m, 10, 25);
    expect(r).not.toBeNull();
    expect(count(r!.mask)).toBeGreaterThan(100);
  });

  it('膨張は指定半径だけ広がる', () => {
    const src = new Uint8Array(25);
    src[12] = 1; // 5x5 の中心
    expect(count(dilate(src, 5, 5, 1))).toBe(9);
  });
});
