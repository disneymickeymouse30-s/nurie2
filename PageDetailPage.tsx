import { useEffect, useMemo, useState } from 'react';
import { PageCard } from '../components/cards';
import { Icon } from '../components/Icon';
import { Button, ErrorView, IconButton, Stars, TopBar, toast } from '../components/ui';
import { CATEGORY_LABEL, getSamplePage, getSamplePages } from '../data/samplePages';
import { svgDataUrl } from '../lib/image';
import { navigate } from '../lib/router';
import { findInProgressFor, startFromSample } from '../store/artworks';
import { toggleFavoritePage, useSettings } from '../store/settings';
import type { Artwork } from '../types';

export function PageDetailPage({ id }: { id: string }) {
  const page = getSamplePage(id);
  const settings = useSettings();
  const [existing, setExisting] = useState<Artwork | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    findInProgressFor(id).then(setExisting).catch(() => {});
  }, [id]);

  const related = useMemo(
    () => (page ? getSamplePages().filter((p) => p.category === page.category && p.id !== page.id).slice(0, 4) : []),
    [page],
  );

  if (!page) {
    return (
      <>
        <TopBar title="塗り絵" fallback="/explore" />
        <ErrorView message="この塗り絵は見つかりませんでした。" />
      </>
    );
  }

  const fav = settings.favoritePages.includes(page.id);

  const start = async () => {
    setBusy(true);
    try {
      const a = await startFromSample(page.id);
      navigate(`/edit/${a.id}`);
    } catch {
      toast('うまく開けませんでした。もう一度お試しください。');
      setBusy(false);
    }
  };

  return (
    <div className="pb-10">
      <TopBar
        title={page.title}
        fallback="/explore"
        right={
          <IconButton
            icon="heart"
            label={fav ? 'お気に入りから外す' : 'お気に入りに追加'}
            active={fav}
            onClick={() => {
              toggleFavoritePage(page.id);
              toast(fav ? 'お気に入りから外しました' : 'お気に入りに追加しました');
            }}
            className={fav ? '!text-danger' : ''}
          />
        }
      />
      <main className="mx-auto flex max-w-lg flex-col gap-5 px-4">
        <div className="card overflow-hidden bg-white p-3">
          <img src={svgDataUrl(page.svg!)} alt={`${page.title}の線画`} className="aspect-square w-full object-contain" />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="font-display text-[24px] font-semibold">{page.title}</h2>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <Info label="難易度">
              <Stars value={page.difficulty} size={13} />
            </Info>
            <Info label="目安">
              <span className="num">{page.minutes}分</span>
            </Info>
            <Info label="カテゴリー">{CATEGORY_LABEL[page.category]}</Info>
          </dl>
        </div>

        <div className="flex flex-col gap-3">
          {existing ? (
            <>
              <Button icon="brush" onClick={() => navigate(`/edit/${existing.id}`)}>
                続きから塗る
              </Button>
              <Button variant="ghost" onClick={start} disabled={busy}>
                新しく塗りはじめる
              </Button>
            </>
          ) : (
            <Button icon="brush" onClick={start} disabled={busy}>
              {busy ? '準備しています…' : '塗りはじめる'}
            </Button>
          )}
          <p className="flex items-center justify-center gap-1.5 text-[12px] text-ink-soft">
            <Icon name="shield" size={14} /> 登録なしで使えます。作品はこの端末に自動で保存されます
          </p>
        </div>

        {related.length > 0 && (
          <section className="mt-2 flex flex-col gap-3">
            <h3 className="font-display text-[17px] font-semibold">同じカテゴリーの塗り絵</h3>
            <div className="grid grid-cols-2 gap-3">
              {related.map((p) => (
                <PageCard key={p.id} page={p} favorite={settings.favoritePages.includes(p.id)} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-sunken px-2 py-3">
      <dt className="text-[11px] tracking-wider text-ink-soft">{label}</dt>
      <dd className="text-[14px]">{children}</dd>
    </div>
  );
}
