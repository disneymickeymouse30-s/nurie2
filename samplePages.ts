/**
 * サンプル塗り絵（すべてコードで描いたオリジナル線画 = 著作権の心配なし）
 * viewBox 1000x1000 の SVG。白い塗り＋墨色の線で、重なり順で閉じた領域を作る。
 */
import type { CategoryId, ColoringPage, Difficulty } from '../types';

const STROKE = '#2b2b2b';
const wrap = (body: string, sw = 4) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">` +
  `<rect width="1000" height="1000" fill="#fff"/>` +
  `<g fill="#fff" stroke="${STROKE}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round">${body}</g>` +
  `<rect x="12" y="12" width="976" height="976" fill="none" stroke="${STROKE}" stroke-width="6"/></svg>`;

const f = (n: number) => Math.round(n * 10) / 10;
const P = (cx: number, cy: number, r: number, a: number): [number, number] => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
const circle = (cx: number, cy: number, r: number, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" ${extra}/>`;
const ellipse = (cx: number, cy: number, rx: number, ry: number, rot = 0) =>
  `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${f(rot)} ${f(cx)} ${f(cy)})"/>`;
const path = (d: string, extra = '') => `<path d="${d}" ${extra}/>`;
const poly = (pts: [number, number][]) => `<polygon points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}"/>`;
const line = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;

/** 再現性のある乱数（mulberry32） */
function rng(seed: number) {
  let a = Math.imul(seed + 1, 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 中心から外へ伸びる花びら */
function petal(cx: number, cy: number, r0: number, r1: number, a: number, width: number, pointed = true) {
  const [x0, y0] = P(cx, cy, r0, a);
  const [x1, y1] = P(cx, cy, r1, a);
  const rm = r0 + (r1 - r0) * 0.55;
  const [la, lb] = P(cx, cy, rm, a - width);
  const [ra, rb] = P(cx, cy, rm, a + width);
  if (pointed) return path(`M${f(x0)},${f(y0)} Q${f(la)},${f(lb)} ${f(x1)},${f(y1)} Q${f(ra)},${f(rb)} ${f(x0)},${f(y0)}Z`);
  const [ta, tb] = P(cx, cy, r1 * 1.08, a - width * 0.5);
  const [ua, ub] = P(cx, cy, r1 * 1.08, a + width * 0.5);
  return path(`M${f(x0)},${f(y0)} Q${f(la)},${f(lb)} ${f(ta)},${f(tb)} Q${f(x1)},${f(y1)} ${f(ua)},${f(ub)} Q${f(ra)},${f(rb)} ${f(x0)},${f(y0)}Z`);
}

// ====================== マンダラ ======================
type Layer =
  | { t: 'petal'; n: number; r0: number; r1: number; w: number; off?: number; round?: boolean; inner?: boolean }
  | { t: 'circle'; r: number }
  | { t: 'dots'; n: number; r: number; s: number; off?: number }
  | { t: 'scallop'; n: number; r0: number; r1: number }
  | { t: 'star'; n: number; r0: number; r1: number; off?: number }
  | { t: 'spokes'; n: number; r0: number; r1: number };

function mandala(layers: Layer[]) {
  const c = 500;
  let s = '';
  for (const L of layers) {
    switch (L.t) {
      case 'circle':
        s += circle(c, c, L.r);
        break;
      case 'petal':
        for (let i = 0; i < L.n; i++) {
          const a = ((i + (L.off ?? 0)) / L.n) * Math.PI * 2 - Math.PI / 2;
          s += petal(c, c, L.r0, L.r1, a, L.w, !L.round);
          if (L.inner) s += petal(c, c, L.r0 + (L.r1 - L.r0) * 0.22, L.r0 + (L.r1 - L.r0) * 0.72, a, L.w * 0.45, true);
        }
        break;
      case 'dots':
        for (let i = 0; i < L.n; i++) {
          const [x, y] = P(c, c, L.r, ((i + (L.off ?? 0)) / L.n) * Math.PI * 2 - Math.PI / 2);
          s += circle(x, y, L.s);
        }
        break;
      case 'scallop': {
        let d = '';
        for (let i = 0; i <= L.n; i++) {
          const a = (i / L.n) * Math.PI * 2;
          const am = ((i - 0.5) / L.n) * Math.PI * 2;
          const [x, y] = P(c, c, L.r0, a);
          const [qx, qy] = P(c, c, L.r1, am);
          d += i === 0 ? `M${f(x)},${f(y)}` : ` Q${f(qx)},${f(qy)} ${f(x)},${f(y)}`;
        }
        s += path(d + 'Z');
        break;
      }
      case 'star': {
        const pts: [number, number][] = [];
        for (let i = 0; i < L.n * 2; i++) pts.push(P(c, c, i % 2 ? L.r0 : L.r1, ((i / 2 + (L.off ?? 0)) / L.n) * Math.PI * 2 - Math.PI / 2));
        s += poly(pts);
        break;
      }
      case 'spokes':
        for (let i = 0; i < L.n; i++) {
          const a = (i / L.n) * Math.PI * 2;
          const [x0, y0] = P(c, c, L.r0, a);
          const [x1, y1] = P(c, c, L.r1, a);
          s += line(x0, y0, x1, y1);
        }
        break;
    }
  }
  return s;
}

const mandalaLotus = () =>
  wrap(
    mandala([
      { t: 'scallop', n: 32, r0: 455, r1: 490 },
      { t: 'circle', r: 455 },
      { t: 'petal', n: 16, r0: 300, r1: 452, w: 0.2, round: true, inner: true },
      { t: 'petal', n: 16, r0: 300, r1: 420, w: 0.16, off: 0.5 },
      { t: 'circle', r: 300 },
      { t: 'dots', n: 32, r: 282, s: 11 },
      { t: 'circle', r: 262 },
      { t: 'petal', n: 12, r0: 140, r1: 260, w: 0.28, inner: true },
      { t: 'circle', r: 140 },
      { t: 'star', n: 8, r0: 70, r1: 136 },
      { t: 'circle', r: 62 },
      { t: 'petal', n: 8, r0: 0, r1: 60, w: 0.35, round: true },
      { t: 'circle', r: 16 },
    ]),
  );

const mandalaStar = () =>
  wrap(
    mandala([
      { t: 'star', n: 12, r0: 400, r1: 490 },
      { t: 'circle', r: 400 },
      { t: 'petal', n: 24, r0: 290, r1: 398, w: 0.12, round: true },
      { t: 'circle', r: 290 },
      { t: 'scallop', n: 18, r0: 250, r1: 288 },
      { t: 'circle', r: 250 },
      { t: 'petal', n: 9, r0: 110, r1: 248, w: 0.32, inner: true },
      { t: 'petal', n: 9, r0: 110, r1: 210, w: 0.2, off: 0.5 },
      { t: 'circle', r: 110 },
      { t: 'dots', n: 9, r: 82, s: 18 },
      { t: 'circle', r: 50 },
      { t: 'star', n: 6, r0: 18, r1: 48 },
    ]),
  );

const mandalaSimple = () =>
  wrap(
    mandala([
      { t: 'circle', r: 470 },
      { t: 'petal', n: 8, r0: 250, r1: 468, w: 0.3, round: true },
      { t: 'circle', r: 250 },
      { t: 'petal', n: 8, r0: 90, r1: 248, w: 0.36, off: 0.5 },
      { t: 'circle', r: 90 },
      { t: 'petal', n: 6, r0: 0, r1: 88, w: 0.45, round: true },
      { t: 'circle', r: 24 },
    ]),
    5,
  );

const mandalaFine = () =>
  wrap(
    mandala([
      { t: 'scallop', n: 48, r0: 470, r1: 492 },
      { t: 'circle', r: 470 },
      { t: 'petal', n: 36, r0: 380, r1: 468, w: 0.07, round: true },
      { t: 'circle', r: 380 },
      { t: 'dots', n: 48, r: 366, s: 8 },
      { t: 'circle', r: 352 },
      { t: 'petal', n: 24, r0: 240, r1: 350, w: 0.13, inner: true },
      { t: 'petal', n: 24, r0: 240, r1: 320, w: 0.09, off: 0.5 },
      { t: 'circle', r: 240 },
      { t: 'scallop', n: 24, r0: 210, r1: 238 },
      { t: 'circle', r: 210 },
      { t: 'star', n: 16, r0: 140, r1: 208 },
      { t: 'circle', r: 140 },
      { t: 'petal', n: 12, r0: 60, r1: 138, w: 0.25, inner: true },
      { t: 'circle', r: 60 },
      { t: 'dots', n: 8, r: 38, s: 10 },
      { t: 'circle', r: 18 },
    ]),
    3,
  );

// ====================== 幾何学 ======================
function hexTiles() {
  let s = '';
  const R = 70;
  const hw = Math.sqrt(3) * R;
  for (let row = -1; row < 11; row++) {
    for (let col = -1; col < 9; col++) {
      const cx = col * hw + (row % 2 ? hw / 2 : 0);
      const cy = row * R * 1.5;
      const hex = (r: number, rot = 0) => poly(Array.from({ length: 6 }, (_, i) => P(cx, cy, r, (i / 6) * Math.PI * 2 + Math.PI / 6 + rot)));
      s += hex(R) + hex(R * 0.62, Math.PI / 6) + hex(R * 0.28);
    }
  }
  return wrap(s);
}

function triangles() {
  let s = '';
  const n = 8;
  const size = 1000 / n;
  const r = rng(7);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const x0 = x * size, y0 = y * size, x1 = x0 + size, y1 = y0 + size;
      const cx = x0 + size / 2, cy = y0 + size / 2;
      s += poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
      const k = r();
      if (k < 0.33) {
        s += poly([[x0, y0], [x1, y0], [cx, cy]]) + poly([[x0, y1], [x1, y1], [cx, cy]]);
      } else if (k < 0.66) {
        s += circle(cx, cy, size * 0.38) + circle(cx, cy, size * 0.18);
      } else {
        s += poly([[cx, y0], [x1, cy], [cx, y1], [x0, cy]]) + poly([[cx, cy - size * 0.2], [cx + size * 0.2, cy], [cx, cy + size * 0.2], [cx - size * 0.2, cy]]);
      }
    }
  }
  return wrap(s, 3.5);
}

function artDeco() {
  let s = '';
  const step = 250;
  for (let row = -1; row < 9; row++) {
    for (let col = 0; col < 6; col++) {
      const cx = col * step + (row % 2 ? step / 2 : 0) - step / 2;
      const cy = row * step * 0.5;
      for (let k = 4; k >= 1; k--) {
        const r = (step / 2) * (k / 4);
        s += path(`M${f(cx - r)},${f(cy + step / 2)} A${f(r)},${f(r)} 0 0 1 ${f(cx + r)},${f(cy + step / 2)}Z`);
      }
    }
  }
  return wrap(s);
}

// ====================== 花 ======================
function bigFlower() {
  let s = '';
  // 葉
  s += path('M500,640 C380,700 260,760 150,900 C300,880 420,800 500,700Z');
  s += path('M500,640 C620,700 740,760 850,900 C700,880 580,800 500,700Z');
  s += path('M480,600 L470,990 L530,990 L520,600Z');
  for (let i = 0; i < 12; i++) s += petal(500, 420, 80, 330, (i / 12) * Math.PI * 2, 0.27, true);
  for (let i = 0; i < 12; i++) s += petal(500, 420, 70, 240, ((i + 0.5) / 12) * Math.PI * 2, 0.3, true);
  s += circle(500, 420, 100);
  for (let ring = 0; ring < 3; ring++) {
    const n = [1, 8, 14][ring];
    const rr = [0, 40, 76][ring];
    for (let i = 0; i < n; i++) {
      const [x, y] = P(500, 420, rr, (i / n) * Math.PI * 2);
      s += circle(x, y, ring === 0 ? 22 : 14);
    }
  }
  return wrap(s);
}

function bouquet() {
  let s = '';
  // 花瓶
  s += path('M360,640 C330,760 350,900 420,960 L580,960 C650,900 670,760 640,640Z');
  s += path('M350,640 L650,640 L640,600 L360,600Z');
  s += path('M380,760 C460,740 540,780 620,760 L630,820 C540,840 460,800 370,820Z');
  // 茎と葉
  s += path('M420,600 Q380,450 300,330', 'fill="none"') + path('M500,600 L500,260', 'fill="none"') + path('M580,600 Q620,450 700,330', 'fill="none"');
  s += path('M440,520 C380,500 330,520 300,560 C360,570 410,560 440,520Z') + path('M560,520 C620,500 670,520 700,560 C640,570 590,560 560,520Z');
  const flower = (cx: number, cy: number, R: number, n: number) => {
    let t = '';
    for (let i = 0; i < n; i++) t += petal(cx, cy, R * 0.25, R, (i / n) * Math.PI * 2, 0.32, false);
    t += circle(cx, cy, R * 0.32) + circle(cx, cy, R * 0.14);
    return t;
  };
  s += flower(300, 300, 130, 8) + flower(700, 300, 130, 6) + flower(500, 230, 160, 10);
  // 小さなつぼみ
  s += ellipse(390, 160, 30, 45, -20) + ellipse(620, 140, 30, 45, 20);
  return wrap(s);
}

function tulips() {
  let s = '';
  s += path('M0,780 Q250,700 500,760 T1000,740 L1000,1000 L0,1000Z');
  s += path('M0,880 Q300,820 600,880 T1000,860 L1000,1000 L0,1000Z');
  const r = rng(3);
  const xs = [150, 320, 500, 680, 850];
  xs.forEach((x, i) => {
    const top = 340 + (i % 2) * 90 + r() * 40;
    s += path(`M${x},${top + 120} Q${x + 10},${top + 300} ${x},${800}`, 'fill="none"');
    s += path(`M${x},${760} C${x - 90},${700} ${x - 110},${600} ${x - 70},${520} C${x - 40},${600} ${x - 20},${680} ${x},${740}Z`);
    s += path(`M${x - 70},${top} C${x - 80},${top + 90} ${x - 40},${top + 140} ${x},${top + 140} C${x + 40},${top + 140} ${x + 80},${top + 90} ${x + 70},${top} L${x + 35},${top + 40} L${x},${top - 10} L${x - 35},${top + 40}Z`);
    s += path(`M${x - 35},${top + 40} Q${x},${top + 110} ${x + 35},${top + 40}`, 'fill="none"');
  });
  s += circle(830, 150, 80);
  for (let i = 0; i < 12; i++) {
    const [a, b] = P(830, 150, 100, (i / 12) * Math.PI * 2);
    const [c, d] = P(830, 150, 130, (i / 12) * Math.PI * 2);
    s += line(a, b, c, d);
  }
  return wrap(s, 4.5);
}

// ====================== 動物 ======================
function cat() {
  let s = '';
  s += circle(720, 260, 160) + circle(670, 220, 30) + circle(780, 330, 20);
  s += path('M0,830 L1000,830 L1000,1000 L0,1000Z');
  for (let i = 0; i < 6; i++) s += path(`M${i * 180 - 20},830 L${i * 180 + 70},830 L${i * 180 + 50},1000 L${i * 180 - 40},1000Z`);
  // しっぽ
  s += path('M600,780 C760,800 820,700 780,600 C760,560 720,560 730,600 C760,690 700,740 600,740Z');
  // 体
  s += path('M330,820 C280,700 300,520 420,460 L560,460 C680,520 700,700 650,820Z');
  s += path('M400,820 C390,760 420,720 460,720 C470,760 460,800 460,820Z') + path('M520,820 C520,800 510,760 520,720 C560,720 590,760 580,820Z');
  s += path('M430,560 C470,600 510,600 550,560 C540,640 520,700 490,700 C460,700 440,640 430,560Z');
  // 頭
  s += path('M360,310 L380,170 L460,250Z') + path('M620,310 L600,170 L520,250Z');
  s += path('M385,290 L392,210 L440,258Z') + path('M595,290 L588,210 L540,258Z');
  s += ellipse(490, 360, 150, 125);
  s += ellipse(440, 350, 26, 32) + ellipse(540, 350, 26, 32);
  s += ellipse(446, 356, 10, 18) + ellipse(546, 356, 10, 18);
  s += path('M478,400 L502,400 L490,414Z');
  s += path('M490,414 Q475,438 455,428', 'fill="none"') + path('M490,414 Q505,438 525,428', 'fill="none"');
  for (const d of [-1, 1]) {
    s += line(490 + d * 60, 405, 490 + d * 150, 390) + line(490 + d * 60, 418, 490 + d * 150, 425);
  }
  // 首輪と鈴
  s += path('M400,470 Q490,500 580,470 L585,495 Q490,525 395,495Z') + circle(490, 525, 22);
  return wrap(s);
}

function koi() {
  let s = '';
  s += circle(500, 500, 470);
  const r = rng(11);
  for (let i = 0; i < 5; i++) {
    const cx = 160 + r() * 680, cy = 160 + r() * 680;
    if (Math.hypot(cx - 500, cy - 500) < 180) continue;
    s += circle(cx, cy, 70) + circle(cx, cy, 40);
  }
  // 蓮の葉
  const pad = (cx: number, cy: number, r: number, a: number) => {
    const [x1, y1] = P(cx, cy, r, a - 0.35);
    const [x2, y2] = P(cx, cy, r, a + 0.35);
    return path(`M${f(cx)},${f(cy)} L${f(x1)},${f(y1)} A${r},${r} 0 1 0 ${f(x2)},${f(y2)}Z`);
  };
  s += pad(220, 760, 100, -0.8) + pad(790, 240, 85, 2.3);
  const fish = (cx: number, cy: number, rot: number) => {
    let t = `<g transform="rotate(${rot} ${cx} ${cy})">`;
    t += path(`M${cx + 150},${cy} L${cx + 240},${cy - 70} Q${cx + 220},${cy} ${cx + 240},${cy + 70}Z`);
    t += path(`M${cx + 20},${cy - 55} Q${cx + 70},${cy - 130} ${cx + 110},${cy - 60}Z`);
    t += ellipse(cx, cy, 170, 70);
    t += path(`M${cx - 40},${cy + 50} Q${cx - 10},${cy + 120} ${cx + 30},${cy + 60}Z`);
    t += circle(cx - 120, cy - 15, 12);
    t += path(`M${cx - 100},${cy - 60} Q${cx - 60},${cy} ${cx - 100},${cy + 60}`, 'fill="none"');
    for (let k = 0; k < 3; k++) t += ellipse(cx - 20 + k * 60, cy - 15 + (k % 2) * 25, 26, 18);
    t += '</g>';
    return t;
  };
  s += fish(430, 390, 25) + fish(560, 640, -155);
  return wrap(s);
}

function owl() {
  let s = '';
  s += circle(170, 160, 90);
  const r = rng(3);
  for (let i = 0; i < 40; i++) {
    s += circle(80 + r() * 860, 60 + r() * 300, 4 + r() * 5);
  }
  // 枝
  s += path('M0,820 C300,790 700,800 1000,770 L1000,830 C700,860 300,850 0,880Z');
  s += path('M780,795 C840,720 900,700 960,710 C900,740 860,780 830,800Z');
  // 体
  s += path('M340,340 L300,170 L420,250 Q500,230 580,250 L700,170 L660,340 C720,460 720,700 600,800 L400,800 C280,700 280,460 340,340Z');
  s += path('M400,470 C380,580 410,700 500,760 C590,700 620,580 600,470 C560,440 440,440 400,470Z');
  for (let row = 0; row < 4; row++)
    for (let c = 0; c < 4 - (row === 3 ? 1 : 0); c++) {
      const x = 440 + c * 40 + (row % 2) * 20 - (row === 3 ? 0 : 0);
      const y = 510 + row * 55;
      s += path(`M${x - 18},${y} Q${x},${y + 30} ${x + 18},${y}`, 'fill="none"');
    }
  // 翼
  s += path('M340,420 C270,520 290,680 380,760 C360,640 360,520 400,450Z') + path('M660,420 C730,520 710,680 620,760 C640,640 640,520 600,450Z');
  // 顔
  s += circle(420, 360, 72) + circle(580, 360, 72) + circle(420, 360, 40) + circle(580, 360, 40) + circle(430, 350, 14) + circle(590, 350, 14);
  s += path('M480,400 L520,400 L500,450Z');
  // 足
  for (const x of [440, 560]) s += path(`M${x - 30},800 Q${x - 20},830 ${x},830 Q${x + 20},830 ${x + 30},800Z`);
  return wrap(s);
}

function butterfly() {
  let s = '';
  const r = rng(20);
  for (let i = 0; i < 8; i++) {
    const cx = 100 + r() * 800, cy = 820 + r() * 120;
    for (let k = 0; k < 5; k++) s += petal(cx, cy, 6, 40, (k / 5) * Math.PI * 2, 0.4, false);
    s += circle(cx, cy, 9);
  }
  const wing = (sx: number) => {
    let t = `<g transform="translate(500 0) scale(${sx} 1) translate(-500 0)">`;
    t += path('M500,420 C420,180 220,110 140,180 C80,240 130,380 260,440 C360,480 450,460 500,420Z');
    t += path('M500,450 C400,470 250,500 210,600 C180,690 260,740 340,700 C420,660 480,560 500,450Z');
    t += circle(260, 260, 55) + circle(260, 260, 28) + circle(390, 360, 35);
    t += ellipse(300, 620, 50, 32, -30) + circle(400, 540, 22);
    t += path('M180,210 Q240,180 300,190', 'fill="none"');
    t += '</g>';
    return t;
  };
  s += wing(1) + wing(-1);
  s += ellipse(500, 470, 26, 150) + circle(500, 300, 32);
  s += path('M490,275 Q450,180 420,150', 'fill="none"') + path('M510,275 Q550,180 580,150', 'fill="none"') + circle(420, 148, 9) + circle(580, 148, 9);
  for (let k = 0; k < 5; k++) s += line(478, 380 + k * 40, 522, 380 + k * 40);
  return wrap(s);
}

// ====================== 風景 ======================
function mountains() {
  let s = '';
  s += circle(700, 220, 90);
  s += path('M150,200 a50,40 0 0 1 90,-20 a50,40 0 0 1 90,20 a40,30 0 0 1 0,50 l-170,0 a40,30 0 0 1 -10,-50Z');
  s += path('M0,560 L180,300 L300,430 L460,230 L640,470 L760,340 L1000,580 L1000,620 L0,620Z');
  s += path('M460,230 L520,310 L490,300 L460,330 L430,300 L410,300Z') + path('M180,300 L220,360 L190,350 L160,370 L150,345Z');
  s += path('M0,640 L250,470 L420,600 L600,500 L800,620 L1000,520 L1000,700 L0,700Z');
  s += path('M0,700 L1000,700 L1000,1000 L0,1000Z');
  for (let i = 0; i < 6; i++) s += path(`M${120 + i * 140},${760 + (i % 3) * 50} l120,0`, 'fill="none"');
  const tree = (x: number, y: number, h: number) => {
    let t = path(`M${x - 8},${y} L${x - 8},${y + 30} L${x + 8},${y + 30} L${x + 8},${y}Z`);
    for (let k = 0; k < 3; k++) {
      const ty = y - k * h * 0.3;
      t += poly([[x - h * (0.4 - k * 0.08), ty], [x + h * (0.4 - k * 0.08), ty], [x, ty - h * 0.45]]);
    }
    return t;
  };
  s += tree(80, 660, 160) + tree(170, 680, 120) + tree(900, 650, 170) + tree(820, 680, 120);
  return wrap(s);
}

function seaside() {
  let s = '';
  s += circle(500, 470, 170);
  for (let i = 0; i < 4; i++) s += line(360 + i * 15, 520 + i * 30, 640 - i * 15, 520 + i * 30);
  // 鳥
  for (const [x, y] of [[180, 180], [260, 230], [780, 160]] as const)
    s += path(`M${x - 40},${y} Q${x - 20},${y - 25} ${x},${y} Q${x + 20},${y - 25} ${x + 40},${y}`, 'fill="none"');
  const wave = (y: number, amp: number, len: number, ph: number) => {
    let d = `M0,${y}`;
    for (let x = 0; x <= 1000; x += len) d += ` q${len / 4},${-amp} ${len / 2},0 t${len / 2},0`;
    return path(`${d} L1000,1000 L0,1000Z`.replace('M0,', `M${-ph},`));
  };
  s += wave(600, 25, 200, 0) + wave(680, 30, 240, 60) + wave(770, 35, 260, 20) + wave(870, 40, 300, 90);
  // ヨット
  s += path('M640,560 L760,560 L740,600 L660,600Z') + path('M700,560 L700,380 L780,550Z') + path('M695,560 L695,410 L630,550Z');
  return wrap(s);
}

function forest() {
  let s = '';
  s += circle(200, 170, 80);
  s += path('M0,520 Q250,420 500,500 T1000,460 L1000,1000 L0,1000Z');
  s += path('M430,1000 C470,850 520,700 500,520 L540,520 C560,700 560,850 600,1000Z');
  const r = rng(5);
  const trees: [number, number, number][] = [];
  for (let i = 0; i < 11; i++) trees.push([60 + r() * 880, 480 + r() * 380, 140 + r() * 120]);
  trees.sort((a, b) => a[1] - b[1]).forEach(([x, y, h]) => {
    if (Math.abs(x - 520) < 90 && y > 560) x += x < 520 ? -110 : 110;
    s += path(`M${x - 10},${y} L${x - 10},${y + 40} L${x + 10},${y + 40} L${x + 10},${y}Z`);
    if (r() < 0.5) {
      for (let k = 0; k < 3; k++) {
        const ty = y - k * h * 0.28;
        s += poly([[x - h * (0.38 - k * 0.08), ty], [x + h * (0.38 - k * 0.08), ty], [x, ty - h * 0.42]]);
      }
    } else {
      s += circle(x, y - h * 0.45, h * 0.4) + circle(x - h * 0.2, y - h * 0.3, h * 0.22) + circle(x + h * 0.2, y - h * 0.32, h * 0.24);
    }
  });
  return wrap(s);
}

// ====================== 建物 ======================
function cottage() {
  let s = '';
  s += circle(830, 150, 70);
  s += path('M100,160 a50,40 0 0 1 90,-20 a50,40 0 0 1 90,20 a40,30 0 0 1 0,50 l-170,0 a40,30 0 0 1 -10,-50Z');
  s += path('M0,800 L1000,800 L1000,1000 L0,1000Z');
  s += path('M440,1000 L480,800 L560,800 L620,1000Z');
  // 煙突
  s += path('M620,260 L620,170 L690,170 L690,320Z');
  // 壁と屋根
  s += path('M240,480 L760,480 L760,800 L240,800Z');
  s += path('M200,500 L500,220 L800,500Z');
  s += circle(500, 380, 50) + line(450, 380, 550, 380) + line(500, 330, 500, 430);
  s += path('M460,800 L460,640 Q500,600 540,640 L540,800Z') + circle(525, 720, 8);
  for (const x of [290, 610]) {
    s += path(`M${x},560 L${x + 100},560 L${x + 100},680 L${x},680Z`) + line(x + 50, 560, x + 50, 680) + line(x, 620, x + 100, 620);
    s += path(`M${x - 10},690 L${x + 110},690 L${x + 100},730 L${x},730Z`);
    for (let k = 0; k < 4; k++) s += circle(x + 12 + k * 26, 688, 12);
  }
  // 柵
  for (let i = 0; i < 6; i++) {
    for (const base of [20, 640]) {
      const x = base + i * 60;
      if (x > 990) continue;
      s += path(`M${x},880 L${x},800 L${x + 18},780 L${x + 36},800 L${x + 36},880Z`);
    }
  }
  s += path('M20,820 L380,820 L380,840 L20,840Z') + path('M640,820 L990,820 L990,840 L640,840Z');
  return wrap(s);
}

function castle() {
  let s = '';
  s += path('M0,880 Q500,820 1000,880 L1000,1000 L0,1000Z');
  const tower = (x: number, w: number, top: number, roof: number) => {
    let t = path(`M${x},880 L${x},${top} L${x + w},${top} L${x + w},880Z`);
    t += poly([[x - 15, top], [x + w + 15, top], [x + w / 2, top - roof]]);
    t += path(`M${x + w / 2},${top - roof} L${x + w / 2},${top - roof - 50}`, 'fill="none"') + path(`M${x + w / 2},${top - roof - 50} L${x + w / 2 + 40},${top - roof - 38} L${x + w / 2},${top - roof - 26}Z`);
    t += path(`M${x + w / 2 - 15},${top + 70} L${x + w / 2 - 15},${top + 40} Q${x + w / 2},${top + 20} ${x + w / 2 + 15},${top + 40} L${x + w / 2 + 15},${top + 70}Z`);
    return t;
  };
  // 城壁
  let wall = 'M200,880 L200,560';
  for (let x = 200; x < 800; x += 50) wall += ` L${x},540 L${x + 25},540 L${x + 25},560 L${x + 50},560`;
  s += path(wall + ' L800,880Z');
  s += tower(420, 160, 330, 200);
  s += tower(130, 120, 460, 160) + tower(750, 120, 460, 160);
  s += path('M440,880 L440,720 Q500,640 560,720 L560,880Z');
  for (let k = 0; k < 4; k++) s += line(455 + k * 30, 700, 455 + k * 30, 880);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) if ((r + c) % 2 === 0) s += path(`M${230 + c * 50 + (c > 1 ? 330 : 0)},${600 + r * 80} l40,0 l0,25 l-40,0Z`);
  for (const [x, y] of [[150, 160], [850, 220]] as const)
    s += path(`M${x - 60},${y} a40,32 0 0 1 70,-15 a40,32 0 0 1 70,15 a30,24 0 0 1 0,40 l-130,0 a30,24 0 0 1 -10,-40Z`);
  return wrap(s);
}

// ====================== 和風 ======================
function fujiTorii() {
  let s = '';
  s += circle(780, 220, 80);
  s += path('M0,600 L380,240 Q420,210 460,215 L540,215 Q580,210 620,240 L1000,600 L1000,640 L0,640Z');
  s += path('M380,240 Q420,210 460,215 L540,215 Q580,210 620,240 L560,300 L530,280 L500,310 L470,280 L440,300Z');
  // 雲
  s += path('M60,330 q40,-50 100,-20 q50,-40 110,0 q40,0 40,30 l-250,0Z') + path('M640,420 q40,-40 90,-15 q50,-35 100,0 q35,0 35,25 l-225,0Z');
  // 水面と桜
  s += path('M0,640 L1000,640 L1000,1000 L0,1000Z');
  for (let i = 0; i < 5; i++) s += line(80 + i * 190, 700 + (i % 2) * 40, 180 + i * 190, 700 + (i % 2) * 40);
  // 鳥居
  s += path('M240,520 L260,980 L300,980 L310,520Z') + path('M690,520 L700,980 L740,980 L760,520Z');
  s += path('M150,460 Q500,420 850,460 L860,500 Q500,470 140,500Z');
  s += path('M200,540 L800,540 L800,575 L200,575Z');
  s += path('M470,500 L530,500 L530,540 L470,540Z');
  const r = rng(9);
  for (let i = 0; i < 9; i++) {
    const cx = 60 + r() * 880, cy = 760 + r() * 200;
    for (let k = 0; k < 5; k++) s += petal(cx, cy, 4, 26, (k / 5) * Math.PI * 2 + r(), 0.45, false);
    s += circle(cx, cy, 6);
  }
  return wrap(s);
}

function seigaiha() {
  let s = '';
  const R = 90;
  for (let row = 0; row < 22; row++) {
    for (let col = -1; col < 7; col++) {
      const cx = col * R * 2 + (row % 2 ? R : 0);
      const cy = row * R * 0.55 + 40;
      for (let k = 4; k >= 1; k--) s += circle(cx, cy, (R * k) / 4);
    }
  }
  return wrap(s, 3.5);
}

// ====================== ファンタジー ======================
function balloons() {
  let s = '';
  s += path('M0,860 Q300,800 600,860 T1000,840 L1000,1000 L0,1000Z');
  for (const [x, y] of [[120, 250], [820, 600]] as const)
    s += path(`M${x - 70},${y} a45,36 0 0 1 80,-18 a45,36 0 0 1 80,18 a34,26 0 0 1 0,44 l-150,0 a34,26 0 0 1 -10,-44Z`);
  const balloon = (cx: number, cy: number, R: number, stripes: number) => {
    let t = '';
    t += line(cx - R * 0.45, cy + R * 0.95, cx - R * 0.22, cy + R * 1.45) + line(cx + R * 0.45, cy + R * 0.95, cx + R * 0.22, cy + R * 1.45);
    t += path(`M${cx - R * 0.26},${cy + R * 1.45} L${cx + R * 0.26},${cy + R * 1.45} L${cx + R * 0.2},${cy + R * 1.75} L${cx - R * 0.2},${cy + R * 1.75}Z`);
    const body = `M${cx},${cy + R * 1.0} C${cx - R * 1.3},${cy + R * 0.2} ${cx - R * 1.1},${cy - R * 1.1} ${cx},${cy - R * 1.1} C${cx + R * 1.1},${cy - R * 1.1} ${cx + R * 1.3},${cy + R * 0.2} ${cx},${cy + R * 1.0}Z`;
    t += path(body);
    for (let i = 1; i < stripes; i++) {
      const k = (i / stripes) * 2 - 1;
      t += path(`M${cx},${cy - R * 1.1} C${cx + k * R * 1.15},${cy - R * 1.05} ${cx + k * R * 1.2},${cy + R * 0.3} ${cx},${cy + R * 1.0}`, 'fill="none"');
    }
    t += path(`M${cx - R * 0.98},${cy - R * 0.1} Q${cx},${cy + R * 0.15} ${cx + R * 0.98},${cy - R * 0.1}`, 'fill="none"');
    return t;
  };
  s += balloon(330, 380, 160, 6) + balloon(720, 260, 110, 4) + balloon(650, 640, 70, 4);
  return wrap(s);
}

function mushroomHouse() {
  let s = '';
  s += path('M0,820 Q500,760 1000,820 L1000,1000 L0,1000Z');
  const r = rng(40);
  for (let i = 0; i < 18; i++) {
    s += circle(60 + r() * 880, 60 + r() * 260, 3 + r() * 4);
  }
  s += path('M150,180 a60,60 0 1 0 60,80 a50,50 0 1 1 -60,-80Z');
  // 家（茎）
  s += path('M360,820 C350,680 360,560 380,500 L620,500 C640,560 650,680 640,820Z');
  s += path('M455,820 L455,700 Q500,650 545,700 L545,820Z') + circle(530, 760, 7);
  s += circle(420, 600, 34) + line(386, 600, 454, 600) + circle(585, 620, 28);
  // かさ
  s += path('M180,520 C180,260 340,170 500,170 C660,170 820,260 820,520 C700,560 300,560 180,520Z');
  for (const [x, y, r] of [[330, 330, 55], [520, 260, 45], [680, 380, 60], [460, 430, 38], [250, 460, 28]] as const) s += circle(x, y, r);
  // 階段と花
  for (let k = 0; k < 3; k++) s += path(`M${440 - k * 15},${820 + k * 30} L${560 + k * 15},${820 + k * 30} L${560 + k * 15},${850 + k * 30} L${440 - k * 15},${850 + k * 30}Z`);
  for (const x of [120, 260, 760, 880]) {
    s += path(`M${x},900 L${x},820`, 'fill="none"');
    for (let k = 0; k < 6; k++) s += petal(x, 800, 6, 34, (k / 6) * Math.PI * 2, 0.45, false);
    s += circle(x, 800, 10);
  }
  return wrap(s);
}

// ====================== 食べ物 ======================
function sweets() {
  let s = '';
  // テーブル
  s += path('M0,860 L1000,860 L1000,1000 L0,1000Z');
  // カップケーキ
  s += path('M150,620 L470,620 L430,860 L190,860Z');
  for (let k = 1; k < 6; k++) s += line(150 + k * 53, 620, 190 + k * 40, 860);
  s += path('M130,620 C120,520 190,470 230,480 C240,400 380,400 390,480 C440,470 500,520 490,620Z');
  s += path('M210,500 C250,450 370,450 410,500 C380,540 240,540 210,500Z');
  s += circle(310, 400, 40) + path('M310,360 Q330,320 360,310', 'fill="none"');
  for (const [x, y] of [[200, 560], [280, 590], [380, 570], [430, 600], [250, 530]] as const) s += ellipse(x, y, 12, 6, 30);
  // マカロン
  const mac = (x: number, y: number) =>
    ellipse(x, y + 30, 110, 45) + path(`M${x - 105},${y + 10} L${x + 105},${y + 10} L${x + 105},${y + 30} L${x - 105},${y + 30}Z`) + ellipse(x, y - 10, 110, 50);
  s += mac(720, 800) + mac(700, 680);
  // ティーカップ
  s += path('M560,330 L860,330 C860,470 800,540 710,540 C620,540 560,470 560,330Z');
  s += path('M860,370 C940,370 940,470 845,470 L850,440 C900,440 900,400 855,400Z');
  s += ellipse(710, 555, 190, 30);
  s += path('M600,400 Q710,430 820,400', 'fill="none"');
  for (const x of [660, 720, 780]) s += path(`M${x},300 C${x - 30},250 ${x + 30},220 ${x},170`, 'fill="none"');
  return wrap(s);
}

// ====================== 癒やし ======================
function cozyWindow() {
  let s = '';
  // 窓
  s += path('M150,80 L850,80 L850,620 L150,620Z');
  s += line(500, 80, 500, 620) + line(150, 350, 850, 350);
  s += circle(680, 200, 60);
  for (const [x, y] of [[260, 200], [380, 470], [720, 480]] as const) s += path(`M${x - 60},${y} a40,32 0 0 1 70,-15 a40,32 0 0 1 70,15 a30,24 0 0 1 0,40 l-130,0 a30,24 0 0 1 -10,-40Z`);
  // カーテン
  s += path('M100,60 C180,250 120,500 210,680 L60,680 L60,60Z') + path('M900,60 C820,250 880,500 790,680 L940,680 L940,60Z');
  // 窓台
  s += path('M80,620 L920,620 L940,680 L60,680Z');
  // 鉢植え
  s += path('M180,860 L340,860 L320,980 L200,980Z');
  for (let k = 0; k < 5; k++) s += path(`M260,860 C${180 + k * 40},${780 - k * 10} ${170 + k * 45},${720} ${200 + k * 30},${700 + (k % 2) * 30} C${230 + k * 25},${760} 260,800 260,860Z`);
  // 本
  s += path('M440,920 L760,920 L760,980 L440,980Z') + path('M460,860 L740,860 L740,920 L460,920Z');
  // マグ
  s += path('M800,800 L920,800 L910,970 L810,970Z') + path('M915,840 C980,840 980,920 912,920 L914,900 C950,900 950,860 916,860Z');
  for (const x of [830, 870]) s += path(`M${x},780 C${x - 20},750 ${x + 20},730 ${x},700`, 'fill="none"');
  s += line(0, 980, 1000, 980);
  return wrap(s);
}

// ====================== カタログ ======================
interface Def {
  id: string;
  title: string;
  category: CategoryId;
  difficulty: Difficulty;
  minutes: number;
  popularity: number;
  isNew?: boolean;
  make: () => string;
}

const DEFS: Def[] = [
  { id: 's-cat', title: '月夜のねこ', category: 'animal', difficulty: 2, minutes: 15, popularity: 96, make: cat },
  { id: 's-mandala-lotus', title: '蓮のマンダラ', category: 'mandala', difficulty: 4, minutes: 40, popularity: 92, make: mandalaLotus },
  { id: 's-flower', title: '大輪の花', category: 'flower', difficulty: 2, minutes: 15, popularity: 90, make: bigFlower },
  { id: 's-fuji', title: '鳥居と富士', category: 'japanese', difficulty: 3, minutes: 25, popularity: 88, make: fujiTorii },
  { id: 's-cottage', title: '森の小さな家', category: 'building', difficulty: 3, minutes: 25, popularity: 85, make: cottage },
  { id: 's-butterfly', title: '花畑のちょうちょ', category: 'animal', difficulty: 2, minutes: 15, popularity: 84, make: butterfly },
  { id: 's-mandala-simple', title: 'はじめてのマンダラ', category: 'mandala', difficulty: 1, minutes: 8, popularity: 83, make: mandalaSimple },
  { id: 's-sweets', title: '午後のティータイム', category: 'food', difficulty: 2, minutes: 18, popularity: 82, make: sweets },
  { id: 's-koi', title: '池の錦鯉', category: 'japanese', difficulty: 3, minutes: 25, popularity: 80, make: koi },
  { id: 's-balloons', title: '空飛ぶ気球', category: 'fantasy', difficulty: 2, minutes: 15, popularity: 79, make: balloons },
  { id: 's-owl', title: '星空のふくろう', category: 'animal', difficulty: 3, minutes: 20, popularity: 78, make: owl },
  { id: 's-mountains', title: '山と湖', category: 'landscape', difficulty: 2, minutes: 15, popularity: 77, make: mountains },
  { id: 's-cozy', title: '窓辺のひととき', category: 'healing', difficulty: 2, minutes: 18, popularity: 76, isNew: true, make: cozyWindow },
  { id: 's-mushroom', title: 'きのこの家', category: 'fantasy', difficulty: 3, minutes: 22, popularity: 75, isNew: true, make: mushroomHouse },
  { id: 's-bouquet', title: '花瓶のブーケ', category: 'flower', difficulty: 3, minutes: 25, popularity: 74, make: bouquet },
  { id: 's-sea', title: '海辺の夕日', category: 'landscape', difficulty: 1, minutes: 10, popularity: 73, isNew: true, make: seaside },
  { id: 's-mandala-star', title: '星のマンダラ', category: 'mandala', difficulty: 3, minutes: 30, popularity: 72, make: mandalaStar },
  { id: 's-tulips', title: 'チューリップの丘', category: 'flower', difficulty: 1, minutes: 10, popularity: 71, make: tulips },
  { id: 's-castle', title: '丘の上のお城', category: 'building', difficulty: 3, minutes: 25, popularity: 70, isNew: true, make: castle },
  { id: 's-forest', title: '森の小道', category: 'landscape', difficulty: 3, minutes: 25, popularity: 68, make: forest },
  { id: 's-hex', title: '六角形のモザイク', category: 'geometric', difficulty: 4, minutes: 40, popularity: 66, make: hexTiles },
  { id: 's-seigaiha', title: '青海波', category: 'japanese', difficulty: 4, minutes: 45, popularity: 65, isNew: true, make: seigaiha },
  { id: 's-tri', title: 'モザイクタイル', category: 'geometric', difficulty: 4, minutes: 40, popularity: 62, make: triangles },
  { id: 's-deco', title: 'アールデコの扇', category: 'geometric', difficulty: 3, minutes: 30, popularity: 60, isNew: true, make: artDeco },
  { id: 's-mandala-fine', title: '精密マンダラ', category: 'mandala', difficulty: 5, minutes: 60, popularity: 58, make: mandalaFine },
];

let cache: ColoringPage[] | null = null;

export function getSamplePages(): ColoringPage[] {
  if (cache) return cache;
  cache = DEFS.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    difficulty: d.difficulty,
    minutes: d.minutes,
    popularity: d.popularity,
    source: 'sample' as const,
    isNew: d.isNew,
    createdAt: 0,
    svg: d.make(),
  }));
  return cache;
}

export function getSamplePage(id: string): ColoringPage | undefined {
  return getSamplePages().find((p) => p.id === id);
}

export const CATEGORY_LABEL: Record<CategoryId, string> = {
  animal: '動物',
  flower: '花・植物',
  landscape: '風景',
  building: '建物',
  food: '食べ物',
  fantasy: 'ファンタジー',
  japanese: '和風',
  geometric: '幾何学',
  mandala: 'マンダラ',
  healing: '癒やし',
};

/** ギャラリーのフィルタ（カテゴリー＋人気・新着・高難易度） */
export const GALLERY_FILTERS: { id: string; label: string; match: (p: ColoringPage) => boolean }[] = [
  { id: 'popular', label: '人気', match: () => true },
  { id: 'new', label: '新着', match: (p) => !!p.isNew },
  ...(Object.keys(CATEGORY_LABEL) as CategoryId[]).map((c) => ({ id: c, label: CATEGORY_LABEL[c], match: (p: ColoringPage) => p.category === c })),
  { id: 'hard', label: '高難易度', match: (p) => p.difficulty >= 4 },
];
