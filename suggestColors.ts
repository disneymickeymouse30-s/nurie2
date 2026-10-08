/**
 * 「この作品に合う色を提案」（AI カラーパレットの端末内版）
 * - 写真から作った塗り絵：元の写真の代表色を取り出して、塗りやすいトーンに整える
 * - サンプル：カテゴリーに合うテーマパレット
 */
import { PALETTES } from '../data/palettes';
import type { CategoryId } from '../types';

const CATEGORY_MOOD: Partial<Record<CategoryId, string>> = {
  flower: 'm-spring',
  landscape: 'm-forest',
  japanese: 'm-wa',
  fantasy: 'm-fantasy',
  mandala: 'm-dusk',
  animal: 'earth',
  healing: 'pastel',
  food: 'pastel',
  building: 'nature',
  geometric: 'm-fantasy',
};

export function suggestForCategory(c?: CategoryId): string[] {
  const id = (c && CATEGORY_MOOD[c]) || 'pastel';
  return PALETTES.find((p) => p.id === id)?.colors ?? [];
}

/** 写真の代表色（最大8色） */
export function dominantColors(rgba: Uint8ClampedArray, max = 8): string[] {
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < rgba.length; i += 16) {
    const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const e = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += g; e.b += b;
    bins.set(key, e);
  }
  const sorted = [...bins.values()].sort((a, b) => b.n - a.n);
  const out: [number, number, number][] = [];
  for (const e of sorted) {
    const c: [number, number, number] = [e.r / e.n, e.g / e.n, e.b / e.n];
    if (out.some((o) => Math.hypot(o[0] - c[0], o[1] - c[1], o[2] - c[2]) < 48)) continue;
    out.push(c);
    if (out.length >= max) break;
  }
  // 少し明るく柔らかく（塗り絵向けのトーンに）
  return out.map(([r, g, b]) => {
    const soften = (v: number) => Math.round(v * 0.82 + 255 * 0.18);
    return '#' + [r, g, b].map((v) => soften(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  });
}
