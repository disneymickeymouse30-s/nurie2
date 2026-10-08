// 写真→線画変換をコマンドラインで試す（out/photos/*.rgba を入力）
import { readFileSync, writeFileSync } from 'fs';
import { photoToLineArt, toGray } from '../src/lib/lineArt';
import type { ConvertStyle } from '../src/types';
for (const n of ['cat.png', 'coffee.png', 'astronaut.jpg']) {
  const [w, h] = readFileSync(`out/photos/${n}.dim`, 'utf8').split(' ').map(Number);
  const rgba = new Uint8ClampedArray(readFileSync(`out/photos/${n}.rgba`));
  for (const style of ['easy', 'standard', 'detailed', 'art'] as ConvertStyle[]) {
    const t = performance.now();
    const out = photoToLineArt(toGray(rgba, w, h), { style, detail: { easy: 25, standard: 50, detailed: 80, art: 60, mandala: 45 }[style], density: 50, thickness: 3, background: 'keep', subject: n === 'cat.png' ? 'pet' : 'auto' });
    writeFileSync(`out/photos/${n}.${style}.raw`, out);
    console.log(n, style, Math.round(performance.now() - t) + 'ms');
  }
}
