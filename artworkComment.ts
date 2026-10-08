/**
 * 完成作品へのひとこと（仕様 §23 の将来機能を見越した端末内版）。
 * 否定的な評価は出さず、色使いの「よいところ」だけを言葉にする。
 */
import { hexToRgb } from './floodFill';

function hsl(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (d) h = (max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  return { h, s, l };
}

export function commentFor(colors: string[]): string {
  if (!colors.length) return 'やさしい余白が生きた、静かな作品です。';
  const hs = colors.map(hsl);
  const avgL = hs.reduce((a, c) => a + c.l, 0) / hs.length;
  const avgS = hs.reduce((a, c) => a + c.s, 0) / hs.length;
  const warm = hs.filter((c) => c.s > 0.15 && (c.h < 70 || c.h > 330)).length;
  const cool = hs.filter((c) => c.s > 0.15 && c.h > 160 && c.h < 280).length;
  const parts: string[] = [];
  if (avgL > 0.72 && avgS < 0.6) parts.push('淡くやわらかな色合いで、見ているだけで心がほどけるような仕上がりです。');
  else if (avgS > 0.6) parts.push('いきいきとした色づかいで、画面に明るいリズムが生まれています。');
  else if (avgL < 0.45) parts.push('深みのある色が重なり、落ち着いた大人っぽい雰囲気の作品です。');
  else parts.push('とても落ち着いた、バランスのよい色づかいです。');
  if (warm > cool + 1) parts.push('暖かい色が多く、ぬくもりを感じます。');
  else if (cool > warm + 1) parts.push('涼しげな色が、すっきりとした空気をつくっています。');
  if (colors.length >= 8) parts.push(`${colors.length}色を使い分けた、ていねいな一枚です。`);
  return parts.join('');
}
