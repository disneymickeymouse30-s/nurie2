/**
 * 塗り絵生成プロバイダ（仕様 §31）
 *
 * AI サービスを差し替えられるように、UI はこのインターフェースだけに依存する。
 * - LocalLineArtProvider: 端末内で動く簡易線画変換（API キー不要・オフラインでも動く）
 * - 将来: ServerAIProvider（/api/coloring/* をサーバー経由で呼ぶ。API キーはサーバーの環境変数にのみ置く）
 */
import type { ConvertOptions } from '../types';
import { createCanvas, ctx2d, drawResized, UserFacingError } from './image';
import { photoToLineArt, toGray } from './lineArt';

export interface GenerateResult {
  /** 白背景・黒線の線画 */
  lineArt: HTMLCanvasElement;
}

export type ProgressFn = (p: number) => void;

export interface ImageToColoringProvider {
  readonly id: string;
  readonly supportsPrompt: boolean;
  generateFromPhoto(photo: HTMLCanvasElement, opts: ConvertOptions, onProgress?: ProgressFn): Promise<GenerateResult>;
  generateFromPrompt(prompt: string, onProgress?: ProgressFn): Promise<GenerateResult>;
}

/** 変換に使う解像度（長辺）。スマホでも数秒以内に終わる大きさ */
const WORK_SIZE = 1100;

let worker: Worker | null | undefined;
let reqId = 0;

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./lineArt.worker.ts', import.meta.url), { type: 'module' });
  } catch {
    worker = null; // Worker が使えない環境ではメインスレッドで実行
  }
  return worker;
}

function runConversion(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  opts: ConvertOptions,
  onProgress?: ProgressFn,
): Promise<Uint8ClampedArray> {
  const wk = getWorker();
  if (!wk) {
    return new Promise((resolve, reject) =>
      setTimeout(() => {
        try { resolve(photoToLineArt(toGray(rgba, w, h), opts, onProgress)); } catch (e) { reject(e); }
      }, 30),
    );
  }
  const id = ++reqId;
  return new Promise((resolve, reject) => {
    const onMsg = (e: MessageEvent) => {
      if (e.data.id !== id) return;
      if (e.data.progress !== undefined) onProgress?.(e.data.progress);
      if (e.data.done) { wk.removeEventListener('message', onMsg); resolve(e.data.rgba); }
      if (e.data.error) { wk.removeEventListener('message', onMsg); reject(new Error(e.data.error)); }
    };
    const onErr = () => {
      // Worker 読み込みに失敗した場合はメインスレッドへ切り替えて再実行
      wk.removeEventListener('message', onMsg);
      worker = null;
      runConversion(rgba, w, h, opts, onProgress).then(resolve, reject);
    };
    wk.addEventListener('message', onMsg);
    wk.addEventListener('error', onErr, { once: true });
    const copy = new Uint8ClampedArray(rgba);
    wk.postMessage({ id, rgba: copy, w, h, opts }, [copy.buffer]);
  });
}

/** マンダラ風：写真の線画を円の中に収め、まわりを装飾リングで囲む */
function decorateMandala(inner: HTMLCanvasElement): HTMLCanvasElement {
  const S = 1100;
  const c = createCanvas(S, S);
  const ctx = ctx2d(c);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, S, S);
  const cx = S / 2, cy = S / 2;
  const R = S * 0.3;

  // 中央：写真の線画を円形に切り抜き
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  const scale = (R * 2) / Math.min(inner.width, inner.height);
  const dw = inner.width * scale, dh = inner.height * scale;
  ctx.drawImage(inner, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();

  ctx.strokeStyle = '#282828';
  ctx.lineJoin = 'round';
  const ring = (r: number, lw = 4) => { ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); };
  ring(R, 5);

  // 花びらリング
  const petals = 16;
  const r1 = R + 10, r2 = R * 1.32;
  ctx.lineWidth = 4;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const a0 = a - Math.PI / petals, a1 = a + Math.PI / petals;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1);
    ctx.quadraticCurveTo(cx + Math.cos(a0) * r2 * 1.02, cy + Math.sin(a0) * r2 * 1.02, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.quadraticCurveTo(cx + Math.cos(a1) * r2 * 1.02, cy + Math.sin(a1) * r2 * 1.02, cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1);
    ctx.stroke();
    // 花びらの中の小さなしずく
    const rm = (r1 + r2) / 2;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * rm, cy + Math.sin(a) * rm, (r2 - r1) * 0.28, (r2 - r1) * 0.12, a, 0, Math.PI * 2);
    ctx.stroke();
  }
  ring(r1, 4);
  // 外側：ビーズのリング
  const r3 = r2 + 22;
  ring(r3, 4);
  const beads = 40;
  for (let i = 0; i < beads; i++) {
    const a = (i / beads) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * (r2 + 11), cy + Math.sin(a) * (r2 + 11), 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  // 外周：波形（スカラップ）
  const r4 = r3 + 60;
  const scallops = 24;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i <= scallops; i++) {
    const a = (i / scallops) * Math.PI * 2;
    const am = ((i - 0.5) / scallops) * Math.PI * 2;
    const x = cx + Math.cos(a) * r3, y = cy + Math.sin(a) * r3;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.quadraticCurveTo(cx + Math.cos(am) * r4 * 1.08, cy + Math.sin(am) * r4 * 1.08, x, y);
  }
  ctx.stroke();
  // 四隅のアーチ
  const corner = S * 0.2;
  for (const [x, y, s] of [[0, 0, 0], [S, 0, 1], [S, S, 2], [0, S, 3]] as const) {
    for (let k = 1; k <= 3; k++) {
      ctx.beginPath();
      ctx.arc(x, y, (corner * k) / 3, (s * Math.PI) / 2, ((s + 1) * Math.PI) / 2);
      ctx.stroke();
    }
  }
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, S - 28, S - 28);
  return c;
}

export class LocalLineArtProvider implements ImageToColoringProvider {
  readonly id = 'local';
  readonly supportsPrompt = false;

  async generateFromPhoto(photo: HTMLCanvasElement, opts: ConvertOptions, onProgress?: ProgressFn) {
    const src = drawResized(photo, WORK_SIZE, '#ffffff', true);
    const { width: w, height: h } = src;
    const rgba = ctx2d(src, true).getImageData(0, 0, w, h).data;
    const out = await runConversion(rgba, w, h, opts, onProgress);
    let c = createCanvas(w, h);
    ctx2d(c).putImageData(new ImageData(out as unknown as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0);
    if (opts.style === 'mandala') c = decorateMandala(c);
    onProgress?.(1);
    return { lineArt: c };
  }

  async generateFromPrompt(): Promise<GenerateResult> {
    throw new UserFacingError('文章から塗り絵を作る機能は、まもなく使えるようになります。');
  }
}

/** 使用するプロバイダ。サーバー側 AI を用意したらここを切り替える */
export const coloringProvider: ImageToColoringProvider = new LocalLineArtProvider();
