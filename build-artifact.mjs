// dist/index.html を、ページ断片（head/body タグなし）に変換して out/artifact/ に置く
import { readFileSync, writeFileSync, mkdirSync, cpSync } from 'fs';
const html = readFileSync('dist/index.html', 'utf8');
const head = html.match(/<head>([\s\S]*)<\/head>/)[1];
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
const keep = head
  .split('\n')
  .filter((l) => /<title>|fonts\.g|<script|stylesheet|theme-color/.test(l) && !/preconnect/.test(l))
  .join('\n');
mkdirSync('out/artifact', { recursive: true });
// 自前の CSS はページ内に埋め込む（アーティファクトの CSP 対策）
const inlined = keep.replace(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/, (_, f) => `<style>${readFileSync('dist/' + f, 'utf8')}</style>`);
writeFileSync('out/artifact/index.html', inlined.trim() + '\n' + body.trim() + '\n');
cpSync('dist/assets', 'out/artifact/assets', { recursive: true });
console.log(readFileSync('out/artifact/index.html', 'utf8').slice(0, 600));
