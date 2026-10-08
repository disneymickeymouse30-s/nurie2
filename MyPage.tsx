import { useEffect, useState } from 'react';
import { ArtworkCard } from '../components/cards';
import { Icon } from '../components/Icon';
import { BottomNav, Logo } from '../components/Navigation';
import { Sheet } from '../components/ui';
import { useArtworks } from '../store/artworks';
import { streakDays, updateSettings, useSettings } from '../store/settings';

export function MyPage() {
  const s = useSettings();
  const { items } = useArtworks();
  const [usage, setUsage] = useState<string | null>(null);
  const [terms, setTerms] = useState(false);
  const done = items.filter((a) => a.status === 'completed').length;
  const fav = items.filter((a) => a.favorite).length + s.favoritePages.length;

  useEffect(() => {
    navigator.storage
      ?.estimate?.()
      .then((e) => e.usage !== undefined && setUsage(`${(e.usage / 1024 / 1024).toFixed(1)}MB`))
      .catch(() => {});
  }, [items.length]);

  return (
    <div className="pb-28">
      <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 pt-4">
        <section className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-sage-wash text-ink">
            <Logo size={36} />
          </div>
          <div className="min-w-0 flex-1">
            <input
              id="display-name"
              aria-label="表示名"
              value={s.displayName}
              onChange={(e) => updateSettings({ displayName: e.target.value.slice(0, 20) })}
              className="w-full bg-transparent font-display text-[22px] font-semibold outline-none"
            />
            <p className="text-[12px] text-ink-soft">ゲストとして利用中・作品はこの端末に保存されています</p>
          </div>
        </section>

        <section className="grid grid-cols-4 gap-2 text-center">
          {[
            ['作品', items.length],
            ['完成', done],
            ['お気に入り', fav],
            ['連続日数', streakDays(s.activeDays)],
          ].map(([label, n]) => (
            <div key={label} className="rounded-2xl bg-surface py-3 shadow-[var(--shadow)]">
              <div className="num font-display text-[22px] font-semibold">{n}</div>
              <div className="text-[11px] text-ink-soft">{label}</div>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-[17px] font-semibold">最近使った色</h2>
          {s.recentColors.length ? (
            <div className="flex flex-wrap gap-2">
              {s.recentColors.map((c) => (
                <span key={c} className="h-9 w-9 rounded-full border border-black/10" style={{ background: c }} title={c} />
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-ink-soft">塗りはじめると、ここに並びます。</p>
          )}
        </section>

        {items.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="font-display text-[17px] font-semibold">最近の作品</h2>
            <div className="chips -mx-4 px-4 pb-1">
              {items.slice(0, 8).map((a) => (
                <div key={a.id} className="w-32 shrink-0">
                  <ArtworkCard art={a} />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-[17px] font-semibold">設定</h2>
          <div className="divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow)]">
            <label className="flex min-h-14 items-center justify-between gap-3 px-4">
              <span>共有画像に「Created with Coloria」を入れる</span>
              <input id="set-watermark" type="checkbox" checked={s.watermark} onChange={(e) => updateSettings({ watermark: e.target.checked })} className="h-6 w-6 shrink-0 accent-[var(--sage-deep)]" />
            </label>
            <div className="flex min-h-14 items-center justify-between gap-3 px-4">
              <span>共有する画像の形式</span>
              <div className="flex rounded-full bg-sunken p-1">
                {(['png', 'jpg'] as const).map((f) => (
                  <button key={f} onClick={() => updateSettings({ shareFormat: f })} className={`h-9 w-14 rounded-full text-[13px] uppercase ${s.shareFormat === f ? 'bg-surface shadow-sm' : 'text-ink-soft'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex min-h-14 items-center justify-between gap-3 px-4">
              <span>保存に使っている容量</span>
              <span className="num text-ink-soft">{usage ?? '—'}</span>
            </div>
            <button onClick={() => setTerms(true)} className="flex min-h-14 w-full items-center justify-between px-4 text-left">
              <span>写真・著作権についてのご案内</span>
              <Icon name="back" size={18} className="rotate-180 text-ink-soft" />
            </button>
          </div>
          <p className="px-1 text-[12px] leading-relaxed text-ink-soft">
            アカウント登録（Google・Apple・メール）とクラウド保存は今後追加予定です。今はブラウザのデータを消すと作品も消えるため、お気に入りの作品は画像として保存しておくと安心です。
          </p>
        </section>
      </main>

      <Sheet open={terms} onClose={() => setTerms(false)} title="写真・著作権について">
        <div className="flex flex-col gap-3 text-[14px] leading-relaxed">
          <p>アップロードできるのは、あなたが権利を持っている写真、または利用の許可を得ている画像です。</p>
          <p>他の人が写っている写真を使うときは、その方の気持ちやプライバシーに配慮してください。キャラクターやイラストなど、第三者の作品を元にした塗り絵は、個人で楽しむ範囲でご利用ください。</p>
          <p>写真の変換はこの端末の中だけで行われ、写真が外部に送られることはありません。位置情報などの撮影データは取り除いて保存します。</p>
          <p>アプリに収録されているサンプル塗り絵は、すべて Coloria のオリジナル線画です。完成作品は自由に共有していただけます。</p>
        </div>
      </Sheet>
      <BottomNav active="me" />
    </div>
  );
}
