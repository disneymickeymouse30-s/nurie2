import { useMemo, useState } from 'react';
import { ArtworkCard, PageCard } from '../components/cards';
import { Icon, type IconName } from '../components/Icon';
import { AppHeader, BottomNav } from '../components/Navigation';
import { Stars, toast } from '../components/ui';
import { getSamplePages } from '../data/samplePages';
import { svgDataUrl } from '../lib/image';
import { navigate } from '../lib/router';
import { startFromSample, useArtworks } from '../store/artworks';
import { streakDays, useSettings } from '../store/settings';

const CHALLENGES = ['今日は花を塗ってみませんか', '10分だけ、ゆっくり塗ってみましょう', '好きな3色だけで塗ってみる日', 'いつもと違うパレットを使ってみる日', '背景から塗ってみましょう'];

function dayIndex() {
  const d = new Date();
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
}

export function HomePage() {
  const pages = getSamplePages();
  const settings = useSettings();
  const { items } = useArtworks();
  const inProgress = items.filter((a) => a.status === 'in_progress');
  const streak = streakDays(settings.activeDays);
  const [starting, setStarting] = useState(false);

  const today = useMemo(() => {
    const idx = dayIndex();
    const easy = pages.filter((p) => p.difficulty <= 3);
    return { page: easy[idx % easy.length], text: CHALLENGES[idx % CHALLENGES.length] };
  }, [pages]);

  const popular = useMemo(() => [...pages].sort((a, b) => b.popularity - a.popularity).slice(0, 6), [pages]);

  const startToday = async () => {
    setStarting(true);
    try {
      const a = await startFromSample(today.page.id);
      navigate(`/edit/${a.id}`);
    } catch {
      toast('うまく開けませんでした。もう一度お試しください。');
      setStarting(false);
    }
  };

  return (
    <div className="pb-28">
      <AppHeader />
      <main className="mx-auto flex max-w-lg flex-col gap-7 px-4 pt-2">
        {/* 今日の1枚 */}
        <section className="card rise flex items-center gap-4 overflow-hidden p-4">
          <img src={svgDataUrl(today.page.svg!)} alt="" className="h-28 w-28 shrink-0 rounded-2xl border border-line bg-white object-contain p-1.5" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between text-[12px] tracking-wider text-ink-soft">
              <span>今日の1枚</span>
              {streak > 0 && (
                <span className="num inline-flex items-center gap-1 text-sage-deep">
                  <Icon name="leaf" size={14} /> {streak}日つづけています
                </span>
              )}
            </div>
            <p className="font-display text-[17px] font-semibold leading-snug">{today.text}</p>
            <div className="flex items-center gap-2 text-[12px] text-ink-soft">
              <span className="truncate">{today.page.title}</span>
              <Stars value={today.page.difficulty} size={11} />
            </div>
            <button
              onClick={startToday}
              disabled={starting}
              className="mt-1 inline-flex h-11 items-center justify-center gap-1.5 self-start rounded-full bg-sage-deep px-5 text-[14px] font-medium text-surface disabled:opacity-60"
            >
              <Icon name="brush" size={18} /> {starting ? '準備しています…' : 'すぐに塗る'}
            </button>
          </div>
        </section>

        {/* メインメニュー */}
        <section className="flex flex-col gap-3" aria-label="メインメニュー">
          <MenuCard
            big
            icon="camera"
            title="写真から作る"
            text="お気に入りの写真を、自分だけの塗り絵に"
            tone="bg-blush"
            onClick={() => navigate('/create')}
          />
          <div className="grid grid-cols-3 gap-3">
          <MenuCard icon="search" title="塗り絵を探す" text={`${pages.length}種類`} tone="bg-sage-wash" onClick={() => navigate('/explore')} />
          <MenuCard icon="sparkle" title="AIで作る" text="文章から" tone="bg-mist" onClick={() => navigate('/ai')} />
          <MenuCard
            icon="brush"
            title="続きを塗る"
            text={inProgress.length ? `${inProgress.length}件` : 'まだなし'}
            tone="bg-sunken"
            onClick={() => navigate('/works?tab=progress')}
          />
          </div>
        </section>

        {inProgress.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionTitle title="続きから" action={{ label: 'すべて', to: '/works?tab=progress' }} />
            <div className="chips -mx-4 px-4 pb-1">
              {inProgress.slice(0, 8).map((a) => (
                <div key={a.id} className="w-36 shrink-0">
                  <ArtworkCard art={a} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <SectionTitle title="人気の塗り絵" action={{ label: 'もっと見る', to: '/explore' }} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {popular.map((p) => (
              <PageCard key={p.id} page={p} favorite={settings.favoritePages.includes(p.id)} />
            ))}
          </div>
        </section>
      </main>
      <BottomNav active="home" />
    </div>
  );
}

function SectionTitle({ title, action }: { title: string; action?: { label: string; to: string } }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="font-display text-[19px] font-semibold">{title}</h2>
      {action && (
        <button onClick={() => navigate(action.to)} className="text-[13px] text-sage-deep">
          {action.label}
        </button>
      )}
    </div>
  );
}

function MenuCard({
  icon,
  title,
  text,
  tone,
  onClick,
  big,
}: {
  icon: IconName;
  title: string;
  text: string;
  tone: string;
  onClick: () => void;
  big?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-w-0 flex-col gap-2 rounded-[20px] p-4 text-left transition active:scale-[0.98] ${tone} ${
        big ? 'flex-row items-center gap-4 py-5' : 'items-start px-3'
      }`}
    >
      <span className={`grid shrink-0 place-items-center rounded-full bg-surface/80 text-ink ${big ? 'h-14 w-14' : 'h-11 w-11'}`}>
        <Icon name={icon} size={big ? 28 : 22} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={`font-display font-semibold leading-snug ${big ? 'text-[20px]' : 'text-[14px]'}`}>{title}</span>
        <span className={`text-ink-soft ${big ? 'text-[13px]' : 'text-[12px]'}`}>{text}</span>
      </span>
      {big && <Icon name="back" className="ml-auto rotate-180 text-ink-soft" />}
    </button>
  );
}
