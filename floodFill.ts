/**
 * 線画ベースの塗りつぶし。
 *
 * 方針:
 *  - 塗り領域は「現在の着色」ではなく「線画」だけで決める（何度塗り直しても形が崩れない）
 *  - 線の判定は輝度しきい値で行い、アンチエイリアスの灰色ピクセルも線として扱う
 *  - 線のわずかな途切れ（隙間）は、線マスクを膨張させてから領域を求めることで塞ぐ
 *  - 求めた領域は線の下まで少し広げ、線と色の間に白いフチが残らないようにする
 */

export interface LineMasks {
  width: number;
  height: number;
  /** 1 = 線 */
  line: Uint8Array;
  /** 隙間を塞ぐために膨張させた線マスク */
  closed: Uint8Array;
  /** 塗り広げの許可域（線そのもの＋線の周囲） */
  near: Uint8Array;
  gapRadius: number;
}

export interface FillRegion {
  mask: Uint8Array; // width*height, 1 = 塗る
  x0: number;
  y0: number;
  x1: number; // inclusive
  y1: number;
}

/** 輝度がこれ未満を線とみなす（アンチエイリアスの中間色も含める） */
export const LINE_THRESHOLD = 170;

export function buildLineMasks(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  gapRadius = 1,
): LineMasks {
  const n = width * height;
  const line = new Uint8Array(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const a = rgba[p + 3];
    // 透過部分は白扱い
    const lum = a < 128 ? 255 : (rgba[p] * 299 + rgba[p + 1] * 587 + rgba[p + 2] * 114) / 1000;
    line[i] = lum < LINE_THRESHOLD ? 1 : 0;
  }
  const closed = gapRadius > 0 ? dilate(line, width, height, gapRadius) : line;
  const near = dilate(line, width, height, gapRadius + 2);
  return { width, height, line, closed, near, gapRadius };
}

/** 正方形カーネルによる膨張（横→縦の2パス、O(n)） */
export function dilate(src: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return src.slice();
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  // 横方向：直近の線ピクセルとの距離を左右から走査
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let last = -1e9;
    for (let x = 0; x < w; x++) {
      if (src[row + x]) last = x;
      if (x - last <= r) tmp[row + x] = 1;
    }
    last = 1e9;
    for (let x = w - 1; x >= 0; x--) {
      if (src[row + x]) last = x;
      if (last - x <= r) tmp[row + x] = 1;
    }
  }
  // 縦方向
  for (let x = 0; x < w; x++) {
    let last = -1e9;
    for (let y = 0; y < h; y++) {
      if (tmp[y * w + x]) last = y;
      if (y - last <= r) out[y * w + x] = 1;
    }
    last = 1e9;
    for (let y = h - 1; y >= 0; y--) {
      if (tmp[y * w + x]) last = y;
      if (last - y <= r) out[y * w + x] = 1;
    }
  }
  return out;
}

/** タップ位置が線の上だった場合、近くの塗れる点を探す */
function findSeed(m: LineMasks, x: number, y: number, maxR = 8): [number, number] | null {
  const { width: w, height: h, closed } = m;
  if (x >= 0 && y >= 0 && x < w && y < h && !closed[y * w + x]) return [x, y];
  for (let r = 1; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (!closed[ny * w + nx]) return [nx, ny];
      }
    }
  }
  return null;
}

/**
 * タップ位置から塗り領域を求める（スキャンライン方式）。
 * 線そのものをタップした場合は線のピクセル群を塗る（細部の色替え用）。
 */
export function computeFillRegion(m: LineMasks, tx: number, ty: number): FillRegion | null {
  const { width: w, height: h } = m;
  tx = Math.round(tx);
  ty = Math.round(ty);
  if (tx < 0 || ty < 0 || tx >= w || ty >= h) return null;

  const seed = findSeed(m, tx, ty);
  if (!seed) return null;

  const blocked = m.closed;
  const mask = new Uint8Array(w * h);
  let x0 = seed[0], x1 = seed[0], y0 = seed[1], y1 = seed[1];
  const stack: number[] = [seed[0], seed[1]];

  while (stack.length) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    const row = y * w;
    if (mask[row + x] || blocked[row + x]) continue;
    let l = x;
    while (l > 0 && !blocked[row + l - 1] && !mask[row + l - 1]) l--;
    let r = x;
    while (r < w - 1 && !blocked[row + r + 1] && !mask[row + r + 1]) r++;
    for (let i = l; i <= r; i++) mask[row + i] = 1;
    if (l < x0) x0 = l;
    if (r > x1) x1 = r;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
    // 上下の行で新しく始まる区間だけ積む
    for (const ny of [y - 1, y + 1]) {
      if (ny < 0 || ny >= h) continue;
      const nrow = ny * w;
      let inSpan = false;
      for (let i = l; i <= r; i++) {
        const free = !blocked[nrow + i] && !mask[nrow + i];
        if (free && !inSpan) {
          stack.push(i, ny);
          inSpan = true;
        } else if (!free) inSpan = false;
      }
    }
  }

  // 線の下まで塗り広げる（白フチ防止）。広げてよいのは線とその近傍だけ。
  const grow = m.gapRadius + 2;
  for (let it = 0; it < grow; it++) {
    const gx0 = Math.max(0, x0 - 1), gx1 = Math.min(w - 1, x1 + 1);
    const gy0 = Math.max(0, y0 - 1), gy1 = Math.min(h - 1, y1 + 1);
    const add: number[] = [];
    for (let y = gy0; y <= gy1; y++) {
      const row = y * w;
      for (let x = gx0; x <= gx1; x++) {
        const i = row + x;
        if (mask[i] || !m.near[i]) continue;
        if (
          (x > 0 && mask[i - 1]) ||
          (x < w - 1 && mask[i + 1]) ||
          (y > 0 && mask[i - w]) ||
          (y < h - 1 && mask[i + w])
        ) add.push(i);
      }
    }
    for (const i of add) mask[i] = 1;
    x0 = gx0; x1 = gx1; y0 = gy0; y1 = gy1;
  }

  return { mask, x0, y0, x1, y1 };
}

/** 領域をマスク内だけ色で塗った ImageData 断片を作る（既存ピクセルは保持） */
export function paintRegion(
  region: FillRegion,
  before: ImageData,
  width: number,
  rgb: [number, number, number],
): Uint8ClampedArray {
  const bw = region.x1 - region.x0 + 1;
  const bh = region.y1 - region.y0 + 1;
  const out = new Uint8ClampedArray(before.data);
  for (let y = 0; y < bh; y++) {
    const srcRow = (region.y0 + y) * width + region.x0;
    for (let x = 0; x < bw; x++) {
      if (!region.mask[srcRow + x]) continue;
      const p = (y * bw + x) * 4;
      out[p] = rgb[0];
      out[p + 1] = rgb[1];
      out[p + 2] = rgb[2];
      out[p + 3] = 255;
    }
  }
  return out;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
