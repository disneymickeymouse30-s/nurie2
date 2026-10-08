/**
 * 作品の作成・保存まわりのユースケース
 */
import { useEffect, useState } from 'react';
import { getSamplePage } from '../data/samplePages';
import { canvasToBlob, drawResized, svgToCanvas } from '../lib/image';
import type { Artwork } from '../types';
import { artworkRepo } from './db';
import { getSettings, newId } from './settings';

/** サンプル線画の解像度（拡大しても線がきれいな大きさ） */
export const SAMPLE_SIZE = 1400;

export async function startFromSample(pageId: string): Promise<Artwork> {
  const page = getSamplePage(pageId);
  if (!page?.svg) throw new Error('page not found');
  const c = await svgToCanvas(page.svg, SAMPLE_SIZE);
  const now = Date.now();
  const a: Artwork = {
    id: newId(),
    userId: getSettings().guestId,
    coloringPageId: page.id,
    title: page.title,
    status: 'in_progress',
    favorite: false,
    isCustom: false,
    width: c.width,
    height: c.height,
    lineArt: await canvasToBlob(c, 'image/png'),
    thumbnail: await makeThumb(c),
    usedColors: [],
    elapsedMs: 0,
    createdAt: now,
    updatedAt: now,
  };
  await artworkRepo.put(a);
  return a;
}

export async function startFromPhoto(lineArt: HTMLCanvasElement, original: HTMLCanvasElement, title: string): Promise<Artwork> {
  const now = Date.now();
  const id = newId();
  const a: Artwork = {
    id,
    userId: getSettings().guestId,
    coloringPageId: 'photo-' + id,
    title,
    status: 'in_progress',
    favorite: false,
    isCustom: true,
    width: lineArt.width,
    height: lineArt.height,
    lineArt: await canvasToBlob(lineArt, 'image/png'),
    // 元画像は縮小して JPEG で再エンコード（EXIF は残らない）
    originalImage: await canvasToBlob(drawResized(original, 1400), 'image/jpeg', 0.85),
    thumbnail: await makeThumb(lineArt),
    usedColors: [],
    elapsedMs: 0,
    createdAt: now,
    updatedAt: now,
  };
  await artworkRepo.put(a);
  return a;
}

export async function makeThumb(src: HTMLCanvasElement, size = 420): Promise<Blob> {
  const c = drawResized(src, size);
  return canvasToBlob(c, 'image/jpeg', 0.82);
}

/** 塗りの途中で、同じサンプルの「制作中」作品があるか */
export async function findInProgressFor(pageId: string): Promise<Artwork | undefined> {
  const all = await artworkRepo.list();
  return all.find((a) => a.coloringPageId === pageId && a.status === 'in_progress');
}

/** 作品一覧を購読する React フック */
export function useArtworks(): { items: Artwork[]; loading: boolean; error: boolean } {
  const [state, set] = useState<{ items: Artwork[]; loading: boolean; error: boolean }>({ items: [], loading: true, error: false });
  useEffect(() => {
    let alive = true;
    const load = () =>
      artworkRepo
        .list()
        .then((items) => alive && set({ items, loading: false, error: false }))
        .catch(() => alive && set({ items: [], loading: false, error: true }));
    load();
    const off = artworkRepo.subscribe(load);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return state;
}

/** Blob → object URL（コンポーネント破棄時に解放） */
export function useObjectUrl(blob?: Blob): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return setUrl(undefined);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}


