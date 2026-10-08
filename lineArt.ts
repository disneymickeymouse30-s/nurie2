/**
 * 写真 → 線画 変換（AI を使わない「簡易線画変換」= 仕様 §32 のモック変換）。
 * DOM に依存しない純粋関数だけで書いているので、Web Worker やテストからも呼べる。
 *
 * 流れ:
 *   グレースケール → 背景処理 → ぼかし → (A) 階調の境界 / (B) XDoG で線を抽出
 *   → 小さすぎる領域・ゴミ線の除去 → 太さ調整 → なめらかな黒線に
 */
import type { ConvertOptions } from '../types';

export interface GrayImage {
  w: number;
  h: number;
  d: Float32Array; // 0-255
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function toGray(rgba: Uint8ClampedArray, w: number, h: number): GrayImage {
  const d = new Float32Array(w * h);
  for (let i = 0, p = 0; i < d.length; i++, p += 4) {
    const a = rgba[p + 3] / 255;
    const lum = rgba[p] * 0.299 + rgba[p + 1] * 0.587 + rgba[p + 2] * 0.114;
    d[i] = lum * a + 255 * (1 - a);
  }
  return { w, h, d };
}

/** ボックスブラー（横・縦） */
function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r < 1) return src.slice();
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const size = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = 0;
    for (let i = -r; i <= r; i++) acc += src[row + Math.min(w - 1, Math.max(0, i))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc / size;
      acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let i = -r; i <= r; i++) acc += tmp[Math.min(h - 1, Math.max(0, i)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / size;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/** 3回のボックスブラーでガウシアンを近似 */
export function gaussian(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  if (sigma < 0.5) return src.slice();
  // 3回のボックスブラーで σ に相当する幅: w = √(4σ²+1)
  const r = Math.max(1, Math.round((Math.sqrt(4 * sigma * sigma + 1) - 1) / 2));
  let out = boxBlur(src, w, h, r);
  out = boxBlur(out, w, h, r);
  return boxBlur(out, w, h, r);
}

/** コントラストを均す（2%〜98% を 0-255 に引き伸ばす） */
function normalize(src: Float32Array): Float32Array {
  const hist = new Uint32Array(256);
  for (const v of src) hist[Math.max(0, Math.min(255, v | 0))]++;
  const n = src.length;
  let lo = 0, hi = 255, acc = 0;
  for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc > n * 0.02) { lo = i; break; } }
  acc = 0;
  for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc > n * 0.02) { hi = i; break; } }
  const span = Math.max(1, hi - lo);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.max(0, Math.min(255, ((src[i] - lo) / span) * 255));
  return out;
}

/** 中心からの楕円距離（0=中心, 1=楕円の縁） */
function centerDistance(x: number, y: number, w: number, h: number, rx: number, ry: number) {
  const dx = (x - w / 2) / (w * rx);
  const dy = (y - h / 2) / (h * ry);
  return Math.sqrt(dx * dx + dy * dy);
}

interface Params {
  sigma: number;
  /** 階調の段数（0 なら面分割を使わない） */
  levels: number;
  minArea: number;
  /** XDoG（輪郭線）のしきい値。0 なら使わない。負の値が大きいほど強い輪郭だけ残る */
  xdogEps: number;
  xdogSigma: number;
  lineRadius: number;
  centerRx: number;
  centerRy: number;
}

export function resolveParams(o: ConvertOptions, w: number, h: number): Params {
  const detail = o.detail / 100;
  const density = o.density / 100;
  const scale = Math.sqrt((w * h) / (1000 * 1000)); // 解像度に比例させる
  let sigma = lerp(5, 1.6, detail);
  let levels = Math.round(lerp(3, 7, density));
  let minArea = lerp(2400, 200, detail * 0.6 + density * 0.4);
  let xdogEps = 0;
  let xdogSigma = lerp(2.2, 1.3, detail);

  switch (o.style) {
    case 'easy':
      sigma *= 1.6;
      levels = Math.max(3, levels - 2);
      minArea *= 2.4;
      xdogEps = -13; // 目や輪郭など、とても強い線だけ残す
      break;
    case 'standard':
      xdogEps = lerp(-10, -6, detail);
      break;
    case 'detailed':
      sigma *= 0.85;
      levels += 1;
      minArea *= 0.6;
      xdogEps = lerp(-8, -5, detail);
      xdogSigma *= 0.9;
      break;
    case 'art':
      levels = 0;
      xdogEps = lerp(-3, -1.5, detail);
      minArea = lerp(260, 40, detail);
      break;
    case 'mandala':
      levels = Math.max(3, levels - 1);
      minArea *= 1.3;
      xdogEps = -9;
      break;
  }

  // 被写体ごとの調整：人物・ペットは主役を中心に大きめ、風景は全体
  let centerRx = 0.5, centerRy = 0.5;
  switch (o.subject) {
    case 'person':
    case 'pet':
      centerRx = 0.36; centerRy = 0.44; minArea *= 0.85; break;
    case 'flower':
      centerRx = 0.4; centerRy = 0.4; break;
    case 'building':
      centerRx = 0.46; centerRy = 0.46; if (!xdogEps) xdogEps = -9; break;
    case 'landscape':
      centerRx = 0.7; centerRy = 0.7; minArea *= 1.2; break;
    default:
      centerRx = 0.42; centerRy = 0.46;
  }

  const lineRadius = [0, 0, 1, 1, 2, 2][Math.max(1, Math.min(5, Math.round(o.thickness)))];
  return {
    sigma: Math.max(0.8, sigma * scale),
    levels,
    minArea: minArea * scale * scale,
    xdogEps,
    xdogSigma: Math.max(1.3, xdogSigma * scale),
    lineRadius,
    centerRx,
    centerRy,
  };
}

/** 量子化した階調マップの「小さすぎる島」を周囲に吸収させる */
function mergeSmallRegions(q: Uint8Array, w: number, h: number, minArea: number) {
  const n = w * h;
  const label = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  for (let pass = 0; pass < 2; pass++) {
    label.fill(-1);
    for (let s = 0; s < n; s++) {
      if (label[s] !== -1) continue;
      const v = q[s];
      let head = 0, tail = 0;
      queue[tail++] = s;
      label[s] = s;
      let neighborVal = -1;
      while (head < tail) {
        const i = queue[head++];
        const x = i % w, y = (i / w) | 0;
        const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
        for (const j of nb) {
          if (j < 0) continue;
          if (q[j] === v) {
            if (label[j] === -1) { label[j] = s; queue[tail++] = j; }
          } else if (neighborVal < 0) neighborVal = q[j];
        }
      }
      if (tail < minArea && neighborVal >= 0) {
        for (let k = 0; k < tail; k++) q[queue[k]] = neighborVal;
      }
    }
  }
}

/** 線ピクセルの小さな断片を消す */
function removeSpecks(line: Uint8Array, w: number, h: number, minSize: number) {
  const n = w * h;
  const seen = new Uint8Array(n);
  const queue = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    if (!line[s] || seen[s]) continue;
    let head = 0, tail = 0;
    queue[tail++] = s;
    seen[s] = 1;
    while (head < tail) {
      const i = queue[head++];
      const x = i % w, y = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (line[j] && !seen[j]) { seen[j] = 1; queue[tail++] = j; }
        }
      }
    }
    if (tail < minSize) for (let k = 0; k < tail; k++) line[queue[k]] = 0;
  }
}

function dilateBinary(src: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return src;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!src[y * w + x]) continue;
      for (let dy = -r; dy <= r; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -r; dx <= r; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= w || dx * dx + dy * dy > r * r + r) continue;
          out[ny * w + nx] = 1;
        }
      }
    }
  }
  return out;
}

/**
 * メイン変換。戻り値は白背景・黒線の RGBA。
 * onProgress は 0-1（UI の「塗り絵を作っています…」表示用）
 */
export function photoToLineArt(
  gray: GrayImage,
  opts: ConvertOptions,
  onProgress?: (p: number) => void,
): Uint8ClampedArray {
  const { w, h } = gray;
  const P = resolveParams(opts, w, h);
  let g = normalize(gray.d);
  onProgress?.(0.1);

  // --- 背景処理 ---
  const weight = new Float32Array(w * h); // 1 = 主役, 0 = 背景
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      weight[y * w + x] = 1 - smoothstep(0.85, 1.15, centerDistance(x, y, w, h, P.centerRx, P.centerRy));

  if (opts.background !== 'keep') {
    const heavy = gaussian(g, w, h, P.sigma * 4 + 6);
    for (let i = 0; i < g.length; i++) {
      const bg = opts.background === 'remove' ? 255 : heavy[i];
      g[i] = g[i] * weight[i] + bg * (1 - weight[i]);
    }
  }
  onProgress?.(0.25);

  const blurred = gaussian(g, w, h, P.sigma);
  onProgress?.(0.4);

  let line: Uint8Array = new Uint8Array(w * h);

  if (P.levels > 0) {
    // --- 階調の境界（塗りやすい「面」を作る） ---
    let q = new Uint8Array(w * h);
    const L = P.levels;
    for (let i = 0; i < q.length; i++) q[i] = Math.min(L - 1, Math.floor((blurred[i] / 256) * L));
    // ギザギザを減らすため 3x3 の多数決フィルタを2回
    for (let pass = 0; pass < 2; pass++) {
      const q2 = q.slice();
      const counts = new Uint8Array(L);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          counts.fill(0);
          let best = q[y * w + x], bestC = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const v = q[(y + dy) * w + x + dx];
              if (++counts[v] > bestC) { bestC = counts[v]; best = v; }
            }
          q2[y * w + x] = best;
        }
      }
      q = q2;
    }
    onProgress?.(0.55);
    mergeSmallRegions(q, w, h, P.minArea);
    onProgress?.(0.65);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if ((x < w - 1 && q[i] !== q[i + 1]) || (y < h - 1 && q[i] !== q[i + w])) line[i] = 1;
      }
    }
  }

  if (P.xdogEps < 0) {
    // --- XDoG（目・口・輪郭など、はっきりした線を拾う） ---
    const g1 = gaussian(g, w, h, P.xdogSigma);
    const g2 = gaussian(g, w, h, P.xdogSigma * 2);
    const tau = 0.985;
    const edges = new Uint8Array(w * h);
    for (let i = 0; i < edges.length; i++) {
      // 背景を消す設定では、背景側の線は拾わない
      if (opts.background === 'remove' && weight[i] < 0.5) continue;
      if (g1[i] - tau * g2[i] < P.xdogEps) edges[i] = 1;
    }
    // 面分割と併用するときは短い線を捨てて、線の多さを抑える
    removeSpecks(edges, w, h, Math.max(10, Math.round(P.levels > 0 ? P.minArea * 0.12 : P.minArea * 0.06)));
    for (let i = 0; i < line.length; i++) line[i] |= edges[i];
    onProgress?.(0.72);
  }

  removeSpecks(line, w, h, Math.max(8, Math.round(P.minArea * 0.04)));
  onProgress?.(0.8);
  line = dilateBinary(line, w, h, P.lineRadius);

  // --- なめらかな線に（軽くぼかしてアンチエイリアス） ---
  const f = new Float32Array(w * h);
  for (let i = 0; i < f.length; i++) f[i] = line[i];
  const soft = gaussian(f, w, h, 0.9);
  const out = new Uint8ClampedArray(w * h * 4);
  for (let i = 0, p = 0; i < soft.length; i++, p += 4) {
    const ink = clamp01(Math.max(line[i] * 0.85, soft[i] * 1.8));
    const v = Math.round(255 - (255 - 40) * ink); // 墨色(40)〜白
    out[p] = out[p + 1] = out[p + 2] = v;
    out[p + 3] = 255;
  }
  onProgress?.(0.95);
  return out;
}
