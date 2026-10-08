import { memo, useMemo } from 'react';
import { CATEGORY_LABEL } from '../data/samplePages';
import { svgDataUrl } from '../lib/image';
import { navigate } from '../lib/router';
import { useObjectUrl } from '../store/artworks';
import type { Artwork, ColoringPage } from '../types';
import { Icon } from './Icon';
import { relativeTime, Stars } from './ui';

export const PageCard = memo(function PageCard({ page, favorite }: { page: ColoringPage; favorite?: boolean }) {
  const src = useMemo(() => svgDataUrl(page.svg!), [page.svg]);
  return (
    <button
      onClick={() => navigate(`/page/${page.id}`)}
      className="group flex min-w-0 flex-col overflow-hidden rounded-[18px] bg-surface text-left shadow-[var(--shadow)] transition active:scale-[0.98]"
    >
      <div className="relative aspect-square w-full bg-white">
        <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain p-2" />
        {page.isNew && (
          <span className="absolute left-2 top-2 rounded-full bg-mist px-2 py-0.5 text-[11px] tracking-wider text-mist-deep">NEW</span>
        )}
        {favorite && (
          <span className="absolute right-2 top-2 text-danger">
            <Icon name="heart" size={18} />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1 px-3 pb-3 pt-2">
        <div className="truncate text-[14px] font-medium">{page.title}</div>
        <div className="flex items-center justify-between gap-2 text-[12px] text-ink-soft">
          <Stars value={page.difficulty} size={11} />
          <span className="num inline-flex items-center gap-1">
            <Icon name="clock" size={13} />
            {page.minutes}分
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-ink-soft">
          <span>{CATEGORY_LABEL[page.category]}</span>
          <span className="num" aria-label="人気度">♡ {page.popularity}</span>
        </div>
      </div>
    </button>
  );
});

export const ArtworkCard = memo(function ArtworkCard({ art, onOpen }: { art: Artwork; onOpen?: () => void }) {
  const url = useObjectUrl(art.thumbnail);
  return (
    <button
      onClick={onOpen ?? (() => navigate(art.status === 'completed' ? `/done/${art.id}` : `/edit/${art.id}`))}
      className="flex min-w-0 flex-col overflow-hidden rounded-[18px] bg-surface text-left shadow-[var(--shadow)] transition active:scale-[0.98]"
    >
      <div className="relative aspect-square w-full bg-white">
        {url ? <img src={url} alt="" className="h-full w-full object-contain" /> : <div className="h-full w-full bg-sunken" />}
        {art.favorite && (
          <span className="absolute right-2 top-2 text-danger">
            <Icon name="heart" size={18} />
          </span>
        )}
        {art.isCustom && (
          <span className="absolute left-2 top-2 rounded-full bg-blush px-2 py-0.5 text-[11px] text-ink">写真から</span>
        )}
      </div>
      <div className="px-3 pb-3 pt-2">
        <div className="truncate text-[14px] font-medium">{art.title}</div>
        <div className="text-[12px] text-ink-soft">
          {art.status === 'completed' ? '完成' : '制作中'}・{relativeTime(art.updatedAt)}
        </div>
      </div>
    </button>
  );
});
