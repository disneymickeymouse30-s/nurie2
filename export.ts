/**
 * 完成作品の書き出し・共有（仕様 §16, §17）
 */
import { drawWatermark } from '../editor/ColoringEngine';
import type { Artwork } from '../types';
import { blobToCanvas, canvasToBlob, createCanvas, ctx2d } from './image';

export async function composeArtwork(a: Artwork, opts: { watermark: boolean; maxSide?: number }): Promise<HTMLCanvasElement> {
  const line = await blobToCanvas(a.lineArt);
  const color = a.colorLayer ? await blobToCanvas(a.colorLayer) : null;
  const k = (opts.maxSide ?? Math.max(a.width, a.height)) / Math.max(a.width, a.height);
  const w = Math.round(a.width * k), h = Math.round(a.height * k);
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  if (color) ctx.drawImage(color, 0, 0, w, h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(line, 0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  if (opts.watermark) drawWatermark(ctx, w, h);
  return c;
}

export function fileName(a: Artwork, ext: string) {
  const d = new Date(a.completedAt ?? a.updatedAt);
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `coloria-${stamp}-${a.id.slice(0, 6)}.${ext}`;
}

export async function exportBlob(a: Artwork, format: 'png' | 'jpg', watermark: boolean): Promise<Blob> {
  const c = await composeArtwork(a, { watermark });
  return canvasToBlob(c, format === 'png' ? 'image/png' : 'image/jpeg', 0.92);
}

/**
 * スマホの共有シートへ渡す。対応していない環境では false を返す
 * （呼び出し側で「画像を保存」の代替手段を出す）
 */
export async function shareImage(blob: Blob, name: string): Promise<'shared' | 'cancelled' | 'unsupported'> {
  const file = new File([blob], name, { type: blob.type });
  const data: ShareData = { files: [file], title: 'Coloria', text: 'Coloria で塗った作品です' };
  try {
    if (!navigator.share || !navigator.canShare?.(data)) return 'unsupported';
    await navigator.share(data);
    return 'shared';
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    return 'unsupported';
  }
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
