import { useEffect, useMemo, useRef, useState } from 'react';
import { PageCard } from '../components/cards';
import { Icon } from '../components/Icon';
import { BottomNav } from '../components/Navigation';
import { CATEGORY_LABEL, GALLERY_FILTERS, getSamplePages } from '../data/samplePages';
import { navigate, useRoute } from '../lib/router';
import { useSettings } from '../store/settings';

export function ExplorePage() {
  const { query } = useRoute();
  const filter = query.get('c') ?? 'popular';
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const settings = useSettings();
  const pages = getSamplePages();

  useEffect(() => {
    if (query.get('focus')) inputRef.current?.focus();
  }, [query]);

  const filters = useMemo(() => [...GALLERY_FILTERS, { id: 'fav', label: 'お気に入り', match: (p: { id: string }) => settings.favoritePages.includes(p.id) }], [settings.favoritePages]);

  const list = useMemo(() => {
    const f = filters.find((x) => x.id === filter) ?? filters[0];
    const kw = q.trim().toLowerCase();
    return pages
      .filter((p) => f.match(p))
      .filter((p) => !kw || p.title.toLowerCase().includes(kw) || CATEGORY_LABEL[p.category].includes(kw))
      .sort((a, b) => (filter === 'new' ? Number(!!b.isNew) - Number(!!a.isNew) : b.popularity - a.popularity));
  }, [pages, filters, filter, q]);

  return (
    <div className="pb-28">
      <header className="sticky z-20 bg-paper/95 pb-2 backdrop-blur" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="mx-auto max-w-lg px-4 pt-3">
          <h1 className="mb-3 font-display text-[22px] font-semibold">塗り絵を探す</h1>
          <label className="flex h-12 items-center gap-2 rounded-full border border-line bg-surface px-4">
            <Icon name="search" size={20} className="text-ink-soft" />
            <input
              id="search"
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ねこ、花、マンダラ…"
              className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-soft"
              enterKeyHint="search"
            />
            {q && (
              <button aria-label="検索語を消す" onClick={() => setQ('')} className="text-ink-soft">
                <Icon name="close" size={18} />
              </button>
            )}
          </label>
        </div>
        <div className="chips mx-auto mt-3 max-w-lg px-4" role="tablist" aria-label="カテゴリー">
          {filters.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => navigate(`/explore?c=${f.id}`, true)}
              className={`h-10 shrink-0 rounded-full px-4 text-[14px] transition ${
                filter === f.id ? 'bg-ink text-paper' : 'border border-line bg-surface text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 pt-3">
        <p className="num mb-3 text-[13px] text-ink-soft">{list.length}件</p>
        {list.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {list.map((p) => (
              <PageCard key={p.id} page={p} favorite={settings.favoritePages.includes(p.id)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-ink-soft">
            <p>{filter === 'fav' ? 'お気に入りはまだありません。塗り絵の詳細画面で ♡ を押すと追加できます。' : '見つかりませんでした。別の言葉で探してみてください。'}</p>
          </div>
        )}
      </main>
      <BottomNav active="explore" />
    </div>
  );
}
