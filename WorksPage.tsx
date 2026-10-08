import { useMemo } from 'react';
import { ArtworkCard } from '../components/cards';
import { BottomNav } from '../components/Navigation';
import { Button, ErrorView, Loading } from '../components/ui';
import { navigate, useRoute } from '../lib/router';
import { useArtworks } from '../store/artworks';

const TABS = [
  { id: 'progress', label: '制作中' },
  { id: 'done', label: '完成' },
  { id: 'fav', label: 'お気に入り' },
  { id: 'custom', label: '自分で作った塗り絵' },
] as const;

export function WorksPage() {
  const { query } = useRoute();
  const tab = (query.get('tab') ?? 'progress') as (typeof TABS)[number]['id'];
  const { items, loading, error } = useArtworks();

  const list = useMemo(
    () =>
      items.filter((a) =>
        tab === 'progress' ? a.status === 'in_progress' : tab === 'done' ? a.status === 'completed' : tab === 'fav' ? a.favorite : a.isCustom,
      ),
    [items, tab],
  );
  const count = (id: string) =>
    items.filter((a) => (id === 'progress' ? a.status === 'in_progress' : id === 'done' ? a.status === 'completed' : id === 'fav' ? a.favorite : a.isCustom)).length;

  const empty = {
    progress: { text: '塗りかけの作品はありません。気になる塗り絵から始めてみましょう。', cta: '塗り絵を探す', to: '/explore' },
    done: { text: '完成した作品がここに並びます。', cta: '塗り絵を探す', to: '/explore' },
    fav: { text: '作品の ♡ を押すと、ここに集まります。', cta: '作品を見る', to: '/works?tab=done' },
    custom: { text: '写真から作った塗り絵がここに並びます。', cta: '写真から作る', to: '/create' },
  }[tab];

  return (
    <div className="pb-28">
      <header className="sticky z-20 bg-paper/95 backdrop-blur" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
        <div className="mx-auto max-w-lg px-4 pt-3">
          <h1 className="font-display text-[22px] font-semibold">マイギャラリー</h1>
        </div>
        <div className="chips mx-auto max-w-lg px-4 py-3" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => navigate(`/works?tab=${t.id}`, true)}
              className={`num h-10 shrink-0 rounded-full px-4 text-[14px] ${tab === t.id ? 'bg-ink text-paper' : 'border border-line bg-surface'}`}
            >
              {t.label} {count(t.id) > 0 && <span className="opacity-70">{count(t.id)}</span>}
            </button>
          ))}
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorView message="作品を読み込めませんでした。ブラウザのプライベートモードでは保存できない場合があります。" />
        ) : list.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {list.map((a) => (
              <ArtworkCard key={a.id} art={a} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="max-w-xs text-ink-soft">{empty.text}</p>
            <Button variant="soft" onClick={() => navigate(empty.to)}>
              {empty.cta}
            </Button>
          </div>
        )}
        <p className="mt-8 text-center text-[12px] text-ink-soft">作品はこの端末のブラウザ内に保存されています</p>
      </main>
      <BottomNav active="works" />
    </div>
  );
}
