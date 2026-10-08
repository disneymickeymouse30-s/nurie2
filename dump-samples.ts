// サンプル塗り絵を SVG ファイルとして書き出す（確認・印刷用）: npx vite-node scripts/dump-samples.ts
import { getSamplePages } from '../src/data/samplePages';
import { mkdirSync, writeFileSync } from 'fs';
mkdirSync('out/sv', { recursive: true });
for (const p of getSamplePages()) writeFileSync(`out/sv/${p.id}.svg`, p.svg!);
console.log(getSamplePages().length, 'pages');
