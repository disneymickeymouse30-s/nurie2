/**
 * 塗り絵エディターの中核（React に依存しないクラス）
 *
 * レイヤー構成:
 *   stage (CSS transform でズーム/パン)
 *     ├ colorCanvas … ユーザーが塗る層
 *     └ lineCanvas  … 線画（mix-blend-mode: multiply で色の上に重ねる）
 *
 * ジェスチャー:
 *   - 塗りつぶし: タップで塗る / 1本指ドラッグでパン
 *   - ブラシ・消しゴム: 1本指で描く
 *   - 移動: 1本指でパン
 *   - どのツールでも 2本指でピンチズーム＋パン、ダブルタップでズーム切替
 */
import { buildLineMasks, computeFillRegion, hexToRgb, paintRegion, type FillRegion, type LineMasks } from '../lib/floodFill';
import { createCanvas, ctx2d } from '../lib/image';
import type { BrushSize, Tool } from '../types';
import { History, type Patch } from './History';

export interface EngineState {
  canUndo: boolean;
  canRedo: boolean;
  zoom: number; // fit を 1 とした倍率
}

interface Pt {
  x: number;
  y: number;
}

const TAP_MOVE = 10; // px: これ以下の移動はタップとみなす
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DIST = 36;

export class ColoringEngine {
  readonly width: number;
  readonly height: number;
  readonly colorCanvas: HTMLCanvasElement;
  readonly lineCanvas: HTMLCanvasElement;
  private colorCtx: CanvasRenderingContext2D;
  private masks: LineMasks;
  private history: History;

  // 表示
  private stage: HTMLDivElement | null = null;
  private host: HTMLElement | null = null;
  private scale = 1;
  private fitScale = 1;
  private tx = 0;
  private ty = 0;
  private raf = 0;

  // ツール
  tool: Tool = 'fill';
  color = '#F6C5C0';
  brushSize: BrushSize = 'm';
  /** ブラシが線をはみ出さないようにする */
  stayInside = true;
  readonly usedColors = new Set<string>();

  // ジェスチャー
  private pointers = new Map<number, Pt>();
  private mode: 'none' | 'stroke' | 'pan' | 'pinch' | 'tap' = 'none';
  private downAt: Pt = { x: 0, y: 0 };
  private downTime = 0;
  private lastTap = { t: 0, x: 0, y: 0 };
  private panStart = { x: 0, y: 0, tx: 0, ty: 0 };
  private pinchStart = { d: 1, cx: 0, cy: 0, scale: 1, tx: 0, ty: 0 };

  // ストローク
  private strokeSnapshot: ImageData | null = null;
  private strokeLast: Pt | null = null;
  private strokeBox = { x0: 0, y0: 0, x1: 0, y1: 0 };
  private clipCanvas: HTMLCanvasElement | null = null; // はみ出し防止マスク
  private tmpCanvas: HTMLCanvasElement | null = null;

  private listeners = new Set<(s: EngineState) => void>();
  private changeListeners = new Set<() => void>();

  constructor(lineArt: HTMLCanvasElement, colorLayer?: CanvasImageSource) {
    this.width = lineArt.width;
    this.height = lineArt.height;
    this.lineCanvas = lineArt;
    this.lineCanvas.className = 'cl-line';
    this.colorCanvas = createCanvas(this.width, this.height);
    this.colorCanvas.className = 'cl-color';
    this.colorCtx = ctx2d(this.colorCanvas, true);
    if (colorLayer) this.colorCtx.drawImage(colorLayer, 0, 0);
    const data = ctx2d(lineArt, true).getImageData(0, 0, this.width, this.height).data;
    this.masks = buildLineMasks(data, this.width, this.height, 1);
    this.history = new History(() => this.emit());
  }

  // ===================== 外部 API =====================
  onState(fn: (s: EngineState) => void) {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }
  /** 着色が変わったとき（自動保存のトリガー） */
  onChange(fn: () => void) {
    this.changeListeners.add(fn);
    return () => this.changeListeners.delete(fn);
  }
  get state(): EngineState {
    return { canUndo: this.history.canUndo, canRedo: this.history.canRedo, zoom: this.scale / this.fitScale };
  }
  private emit() {
    const s = this.state;
    this.listeners.forEach((l) => l(s));
  }
  private changed() {
    this.changeListeners.forEach((l) => l());
  }

  undo() {
    if (this.history.undo(this.colorCtx)) this.changed();
  }
  redo() {
    if (this.history.redo(this.colorCtx)) this.changed();
  }

  /** stage 要素に canvas を取り付けてジェスチャーを有効化 */
  mount(host: HTMLElement, stage: HTMLDivElement) {
    this.host = host;
    this.stage = stage;
    stage.style.width = this.width + 'px';
    stage.style.height = this.height + 'px';
    stage.append(this.colorCanvas, this.lineCanvas);
    host.addEventListener('pointerdown', this.onDown);
    host.addEventListener('pointermove', this.onMove);
    host.addEventListener('pointerup', this.onUp);
    host.addEventListener('pointercancel', this.onCancel);
    host.addEventListener('wheel', this.onWheel, { passive: false });
    // iOS Safari のページズーム・スクロールを止める
    host.addEventListener('touchstart', preventOnCanvas, { passive: false });
    host.addEventListener('touchmove', prevent, { passive: false });
    host.addEventListener('gesturestart', prevent as EventListener);
    this.fit();
  }

  unmount() {
    const h = this.host;
    if (h) {
      h.removeEventListener('pointerdown', this.onDown);
      h.removeEventListener('pointermove', this.onMove);
      h.removeEventListener('pointerup', this.onUp);
      h.removeEventListener('pointercancel', this.onCancel);
      h.removeEventListener('wheel', this.onWheel);
      h.removeEventListener('touchstart', preventOnCanvas);
      h.removeEventListener('touchmove', prevent);
      h.removeEventListener('gesturestart', prevent as EventListener);
    }
    cancelAnimationFrame(this.raf);
    this.stage?.replaceChildren();
    this.host = this.stage = null;
  }

  /** 画面サイズに合わせて全体表示 */
  fit() {
    if (!this.host) return;
    const { clientWidth: cw, clientHeight: ch } = this.host;
    this.fitScale = Math.min(cw / this.width, ch / this.height) * 0.94;
    this.scale = this.fitScale;
    this.tx = (cw - this.width * this.scale) / 2;
    this.ty = (ch - this.height * this.scale) / 2;
    this.applyTransform();
  }

  zoomBy(factor: number, cx?: number, cy?: number) {
    if (!this.host) return;
    const x = cx ?? this.host.clientWidth / 2;
    const y = cy ?? this.host.clientHeight / 2;
    this.zoomTo(this.scale * factor, x, y);
  }

  /** 白背景＋着色＋線画を合成した完成画像 */
  compose(maxSide = Math.max(this.width, this.height), watermark = false): HTMLCanvasElement {
    const k = maxSide / Math.max(this.width, this.height);
    const w = Math.round(this.width * k), h = Math.round(this.height * k);
    const out = createCanvas(w, h);
    const ctx = ctx2d(out);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.colorCanvas, 0, 0, w, h);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(this.lineCanvas, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    if (watermark) drawWatermark(ctx, w, h);
    return out;
  }

  /** 何か塗られているか */
  hasPaint(): boolean {
    const d = this.colorCtx.getImageData(0, 0, this.width, this.height).data;
    for (let i = 3; i < d.length; i += 16) if (d[i] > 0) return true;
    return false;
  }

  // ===================== 座標・表示 =====================
  private toImage(clientX: number, clientY: number): Pt {
    const r = this.host!.getBoundingClientRect();
    return { x: (clientX - r.left - this.tx) / this.scale, y: (clientY - r.top - this.ty) / this.scale };
  }
  private local(clientX: number, clientY: number): Pt {
    const r = this.host!.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  private zoomTo(next: number, cx: number, cy: number) {
    const min = this.fitScale * 0.8;
    const max = Math.max(this.fitScale * 10, 4);
    next = Math.min(max, Math.max(min, next));
    const ix = (cx - this.tx) / this.scale;
    const iy = (cy - this.ty) / this.scale;
    this.scale = next;
    this.tx = cx - ix * next;
    this.ty = cy - iy * next;
    this.applyTransform();
  }

  /** 画像が画面の外へ飛んでいかないように位置を制限 */
  private clampPan() {
    if (!this.host) return;
    const { clientWidth: cw, clientHeight: ch } = this.host;
    const w = this.width * this.scale, h = this.height * this.scale;
    const margin = 80;
    if (w <= cw) this.tx = Math.min(Math.max(this.tx, -w + margin), cw - margin);
    else this.tx = Math.min(margin, Math.max(cw - w - margin, this.tx));
    if (h <= ch) this.ty = Math.min(Math.max(this.ty, -h + margin), ch - margin);
    else this.ty = Math.min(margin, Math.max(ch - h - margin, this.ty));
  }

  private applyTransform() {
    this.clampPan();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => {
      if (this.stage) this.stage.style.transform = `translate3d(${this.tx}px, ${this.ty}px, 0) scale(${this.scale})`;
    });
    this.emit();
  }

  private animateZoom(target: number, cx: number, cy: number) {
    const from = this.scale;
    const start = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 220);
      const e = 1 - Math.pow(1 - k, 3);
      this.zoomTo(from + (target - from) * e, cx, cy);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ===================== ジェスチャー =====================
  private onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if ((e.target as Element | null)?.closest?.('button')) return; // ズームボタンなどの UI
    this.host!.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pointers.size === 2) {
      // 2本目の指 → 描きかけの線は取り消してピンチへ
      if (this.mode === 'stroke') this.cancelStroke();
      this.startPinch();
      return;
    }
    if (this.pointers.size > 2) return;

    this.downAt = { x: e.clientX, y: e.clientY };
    this.downTime = performance.now();
    if (this.tool === 'brush' || this.tool === 'eraser') {
      this.mode = 'stroke';
      this.beginStroke(this.toImage(e.clientX, e.clientY));
    } else {
      this.mode = 'tap'; // 動けばパンに切り替わる
      this.panStart = { x: e.clientX, y: e.clientY, tx: this.tx, ty: this.ty };
    }
  };

  private onMove = (e: PointerEvent) => {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.mode === 'pinch' && this.pointers.size >= 2) return this.updatePinch();
    if (this.mode === 'stroke') {
      const evs = (e.getCoalescedEvents?.() ?? []).length ? e.getCoalescedEvents() : [e];
      for (const ce of evs) this.continueStroke(this.toImage(ce.clientX, ce.clientY));
      return;
    }
    if (this.mode === 'tap' || this.mode === 'pan') {
      const dx = e.clientX - this.panStart.x, dy = e.clientY - this.panStart.y;
      if (this.mode === 'tap' && Math.hypot(dx, dy) > TAP_MOVE) this.mode = 'pan';
      if (this.mode === 'pan') {
        this.tx = this.panStart.tx + dx;
        this.ty = this.panStart.ty + dy;
        this.applyTransform();
      }
    }
  };

  private onUp = (e: PointerEvent) => {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);

    if (this.mode === 'pinch') {
      if (this.pointers.size === 1) {
        // 残った1本指はパンとして継続（意図しない塗りを防ぐ）
        const [p] = [...this.pointers.values()];
        this.mode = 'pan';
        this.panStart = { x: p.x, y: p.y, tx: this.tx, ty: this.ty };
      } else if (this.pointers.size === 0) this.mode = 'none';
      return;
    }

    const isTap =
      Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) <= TAP_MOVE &&
      performance.now() - this.downTime < 400;
    const now = performance.now();
    const isDoubleTap =
      isTap &&
      now - this.lastTap.t < DOUBLE_TAP_MS &&
      Math.hypot(e.clientX - this.lastTap.x, e.clientY - this.lastTap.y) < DOUBLE_TAP_DIST;

    if (this.mode === 'stroke') {
      if (isDoubleTap) this.cancelStroke();
      else this.endStroke();
    } else if (this.mode === 'tap' && isTap && !isDoubleTap) {
      if (this.tool === 'fill') this.fillAt(this.toImage(e.clientX, e.clientY));
    }

    if (isDoubleTap) {
      const p = this.local(e.clientX, e.clientY);
      const zoomed = this.scale > this.fitScale * 1.3;
      if (zoomed) {
        this.animateZoom(this.fitScale, p.x, p.y);
        setTimeout(() => this.fit(), 240);
      } else this.animateZoom(this.fitScale * 2.6, p.x, p.y);
      this.lastTap = { t: 0, x: 0, y: 0 };
    } else if (isTap) {
      this.lastTap = { t: now, x: e.clientX, y: e.clientY };
    }
    this.mode = 'none';
  };

  private onCancel = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    if (this.mode === 'stroke') this.cancelStroke();
    if (this.pointers.size === 0) this.mode = 'none';
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const p = this.local(e.clientX, e.clientY);
    if (e.ctrlKey || Math.abs(e.deltaY) > 0) {
      this.zoomTo(this.scale * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), p.x, p.y);
    }
  };

  private startPinch() {
    const [a, b] = [...this.pointers.values()];
    const c = this.local((a.x + b.x) / 2, (a.y + b.y) / 2);
    this.mode = 'pinch';
    this.pinchStart = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: c.x, cy: c.y, scale: this.scale, tx: this.tx, ty: this.ty };
  }

  private updatePinch() {
    const [a, b] = [...this.pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const c = this.local((a.x + b.x) / 2, (a.y + b.y) / 2);
    const s0 = this.pinchStart;
    const next = Math.min(Math.max(this.fitScale * 0.8, s0.scale * (d / s0.d)), Math.max(this.fitScale * 10, 4));
    // 開始時の中心点にあった画像上の点を、現在の中心点に合わせる
    const ix = (s0.cx - s0.tx) / s0.scale;
    const iy = (s0.cy - s0.ty) / s0.scale;
    this.scale = next;
    this.tx = c.x - ix * next;
    this.ty = c.y - iy * next;
    this.applyTransform();
  }

  // ===================== 塗りつぶし =====================
  fillAt(p: Pt) {
    const region = computeFillRegion(this.masks, p.x, p.y);
    if (!region) return;
    const { x0, y0, x1, y1 } = region;
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const before = this.colorCtx.getImageData(x0, y0, w, h);
    const painted = paintRegion(region, before, this.width, hexToRgb(this.color));
    const after = new ImageData(painted as unknown as Uint8ClampedArray<ArrayBuffer>, w, h);
    if (sameData(before.data, after.data)) return;
    this.colorCtx.putImageData(after, x0, y0);
    this.history.push({ x: x0, y: y0, w, h, before, after });
    this.usedColors.add(this.color);
    this.changed();
  }

  // ===================== ブラシ / 消しゴム =====================
  private get brushPx() {
    const base = Math.max(this.width, this.height) / 1000;
    return { s: 5, m: 14, l: 36 }[this.brushSize] * base;
  }

  private beginStroke(p: Pt) {
    this.strokeSnapshot = this.colorCtx.getImageData(0, 0, this.width, this.height);
    this.strokeLast = null;
    const r = this.brushPx / 2 + 2;
    this.strokeBox = { x0: p.x - r, y0: p.y - r, x1: p.x + r, y1: p.y + r };
    this.clipCanvas = null;
    if (this.stayInside) {
      const region = computeFillRegion(this.masks, p.x, p.y);
      if (region) this.clipCanvas = regionToCanvas(region, this.width, this.height);
    }
    this.continueStroke(p);
  }

  private continueStroke(p: Pt) {
    const from = this.strokeLast ?? p;
    const r = this.brushPx / 2 + 2;
    const bx0 = Math.floor(Math.min(from.x, p.x) - r), by0 = Math.floor(Math.min(from.y, p.y) - r);
    const bx1 = Math.ceil(Math.max(from.x, p.x) + r), by1 = Math.ceil(Math.max(from.y, p.y) + r);
    const sb = this.strokeBox;
    sb.x0 = Math.min(sb.x0, bx0); sb.y0 = Math.min(sb.y0, by0);
    sb.x1 = Math.max(sb.x1, bx1); sb.y1 = Math.max(sb.y1, by1);

    const erase = this.tool === 'eraser';
    const drawSeg = (ctx: CanvasRenderingContext2D) => {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = this.brushPx;
      ctx.strokeStyle = erase ? '#000' : this.color;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(p.x + (from === p ? 0.01 : 0), p.y);
      ctx.stroke();
    };

    if (!this.clipCanvas) {
      const ctx = this.colorCtx;
      ctx.save();
      ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
      drawSeg(ctx);
      ctx.restore();
    } else {
      // はみ出し防止：線分を一時 canvas に描き、領域マスクで切り抜いてから合成
      const x = Math.max(0, bx0), y = Math.max(0, by0);
      const w = Math.min(this.width, bx1) - x, h = Math.min(this.height, by1) - y;
      if (w <= 0 || h <= 0) { this.strokeLast = p; return; }
      if (!this.tmpCanvas || this.tmpCanvas.width < w || this.tmpCanvas.height < h) {
        this.tmpCanvas = createCanvas(Math.max(w, 256), Math.max(h, 256));
      }
      const t = ctx2d(this.tmpCanvas);
      t.clearRect(0, 0, this.tmpCanvas.width, this.tmpCanvas.height);
      t.save();
      t.translate(-x, -y);
      drawSeg(t);
      t.restore();
      t.globalCompositeOperation = 'destination-in';
      t.drawImage(this.clipCanvas, x, y, w, h, 0, 0, w, h);
      t.globalCompositeOperation = 'source-over';
      const ctx = this.colorCtx;
      ctx.save();
      ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
      ctx.drawImage(this.tmpCanvas, 0, 0, w, h, x, y, w, h);
      ctx.restore();
    }
    this.strokeLast = p;
  }

  private endStroke() {
    const snap = this.strokeSnapshot;
    if (!snap) return;
    const sb = this.strokeBox;
    const x = Math.max(0, Math.floor(sb.x0)), y = Math.max(0, Math.floor(sb.y0));
    const w = Math.min(this.width, Math.ceil(sb.x1)) - x, h = Math.min(this.height, Math.ceil(sb.y1)) - y;
    this.strokeSnapshot = null;
    this.clipCanvas = null;
    if (w <= 0 || h <= 0) return;
    const before = cropImageData(snap, x, y, w, h);
    const after = this.colorCtx.getImageData(x, y, w, h);
    if (sameData(before.data, after.data)) return;
    const patch: Patch = { x, y, w, h, before, after };
    this.history.push(patch);
    if (this.tool === 'brush') this.usedColors.add(this.color);
    this.changed();
  }

  private cancelStroke() {
    if (this.strokeSnapshot) this.colorCtx.putImageData(this.strokeSnapshot, 0, 0);
    this.strokeSnapshot = null;
    this.clipCanvas = null;
    this.mode = 'none';
  }
}

// ===================== ヘルパー =====================
function prevent(e: Event) {
  e.preventDefault();
}
/** ボタン以外（キャンバス上）のタッチだけ既定動作を止める。ボタンのタップは通す */
function preventOnCanvas(e: Event) {
  if ((e.target as Element | null)?.closest?.('button')) return;
  e.preventDefault();
}

function sameData(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function cropImageData(src: ImageData, x: number, y: number, w: number, h: number): ImageData {
  const out = new ImageData(w, h);
  for (let row = 0; row < h; row++) {
    const s = ((y + row) * src.width + x) * 4;
    out.data.set(src.data.subarray(s, s + w * 4), row * w * 4);
  }
  return out;
}

function regionToCanvas(region: FillRegion, width: number, height: number): HTMLCanvasElement {
  const c = createCanvas(width, height);
  const ctx = ctx2d(c);
  const { x0, y0, x1, y1 } = region;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const row = (y0 + y) * width + x0;
    for (let x = 0; x < w; x++) if (region.mask[row + x]) img.data[(y * w + x) * 4 + 3] = 255;
  }
  ctx.putImageData(img, x0, y0);
  return c;
}

export function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const size = Math.max(14, Math.round(Math.min(w, h) * 0.026));
  ctx.save();
  ctx.font = `500 ${size}px "Zen Kaku Gothic New", system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  const text = 'Created with Coloria';
  const pad = size * 0.8;
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.roundRect?.(w - tw - pad * 1.8, h - size * 1.9 - pad * 0.4, tw + pad * 1.4, size * 1.7, size * 0.85);
  ctx.fill();
  ctx.fillStyle = 'rgba(74,59,48,0.85)';
  ctx.fillText(text, w - pad * 1.1, h - pad * 0.75);
  ctx.restore();
}
