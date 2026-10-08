/**
 * 画像ファイルの検証・読み込み・リサイズ・書き出し（仕様 §29, §30）
 * Canvas で再エンコードするため EXIF（位置情報など）は自動的に取り除かれる。
 */

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const ACCEPT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ACCEPT_ATTR = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';

export class UserFacingError extends Error {}

/** 拡張子や MIME を偽装したファイルを弾くため、先頭バイト（マジックナンバー）も確認する */
async function sniffType(file: Blob): Promise<string | null> {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return 'image/webp';
  return null;
}

export async function validateImageFile(file: File): Promise<void> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UserFacingError('画像が大きすぎます。20MB以下の写真を選んでください。');
  }
  if (file.size === 0) throw new UserFacingError('画像を読み込めませんでした。別の写真をお試しください。');
  const sniffed = await sniffType(file);
  if (!sniffed) {
    throw new UserFacingError('JPG・PNG・WEBP の写真を選んでください。（iPhoneの HEIC は「互換性優先」設定で撮影した写真をお使いください）');
  }
}

export async function decodeImage(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // 古い Safari 向けフォールバック
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      return img;
    } catch {
      throw new UserFacingError('画像を読み込めませんでした。別の写真をお試しください。');
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}

export function createCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function ctx2d(c: HTMLCanvasElement, willRead = false): CanvasRenderingContext2D {
  const ctx = c.getContext('2d', { willReadFrequently: willRead });
  if (!ctx) throw new UserFacingError('この端末では描画機能を使えませんでした。');
  return ctx;
}

/** 長辺を maxSide 以下に縮小して canvas に描く（大きな画像をそのまま扱わない） */
export function drawResized(
  src: CanvasImageSource & { width: number; height: number },
  maxSide: number,
  background = '#ffffff',
  allowUpscale = false,
): HTMLCanvasElement {
  const fit = maxSide / Math.max(src.width, src.height);
  const scale = allowUpscale ? fit : Math.min(1, fit);
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const c = createCanvas(w, h);
  const ctx = ctx2d(c);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  return c;
}

export function canvasToBlob(c: HTMLCanvasElement, type = 'image/png', quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new UserFacingError('画像を保存できませんでした。'))), type, quality),
  );
}

export async function blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const img = await decodeImage(blob);
  const c = createCanvas(img.width, img.height);
  ctx2d(c).drawImage(img, 0, 0);
  if ('close' in img) img.close();
  return c;
}

/** SVG 文字列を指定サイズの白背景 canvas に描く */
export async function svgToCanvas(svg: string, size: number): Promise<HTMLCanvasElement> {
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = createCanvas(size, size);
    const ctx = ctx2d(c);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function svgDataUrl(svg: string): string {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
