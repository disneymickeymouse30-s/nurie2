import { navigate } from '../lib/router';
import { Icon, type IconName } from './Icon';

type Tab = 'home' | 'explore' | 'create' | 'works' | 'me';

const ITEMS: { id: Tab; label: string; icon: IconName; to: string }[] = [
  { id: 'home', label: 'ホーム', icon: 'home', to: '/' },
  { id: 'explore', label: '探す', icon: 'search', to: '/explore' },
  { id: 'create', label: '作る', icon: 'plus', to: '/create' },
  { id: 'works', label: '作品', icon: 'palette', to: '/works' },
  { id: 'me', label: 'マイページ', icon: 'user', to: '/me' },
];

export function BottomNav({ active }: { active: Tab }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="メインナビゲーション"
    >
      <ul className="mx-auto flex max-w-lg items-end justify-around px-2">
        {ITEMS.map((it) =>
          it.id === 'create' ? (
            <li key={it.id} className="-mt-5">
              <button
                onClick={() => navigate(it.to)}
                aria-label="写真から塗り絵を作る"
                className="flex flex-col items-center gap-0.5"
              >
                <span className="grid h-14 w-14 place-items-center rounded-full bg-sage-deep text-surface shadow-[0_6px_18px_rgba(95,122,89,0.35)] active:scale-95">
                  <Icon name="plus" size={28} stroke={2} />
                </span>
                <span className={`text-[11px] ${active === it.id ? 'text-sage-deep' : 'text-ink-soft'}`}>{it.label}</span>
              </button>
            </li>
          ) : (
            <li key={it.id}>
              <button
                onClick={() => navigate(it.to)}
                aria-current={active === it.id ? 'page' : undefined}
                className={`flex h-16 w-16 flex-col items-center justify-center gap-0.5 ${active === it.id ? 'text-sage-deep' : 'text-ink-soft'}`}
              >
                <Icon name={it.icon} size={23} stroke={active === it.id ? 2 : 1.7} />
                <span className="text-[11px]">{it.label}</span>
              </button>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

/** ホーム用ヘッダー：ロゴ・検索・マイページ */
export function AppHeader() {
  return (
    <header
      className="sticky z-20 flex h-14 items-center justify-between bg-paper/90 px-4 backdrop-blur"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <button onClick={() => navigate('/')} className="flex items-center gap-2" aria-label="Coloria ホーム">
        <Logo />
        <span className="font-display text-[21px] font-semibold tracking-wide">Coloria</span>
      </button>
      <div className="flex items-center">
        <button aria-label="塗り絵を検索" onClick={() => navigate('/explore?focus=1')} className="grid h-12 w-12 place-items-center rounded-full active:bg-sunken">
          <Icon name="search" />
        </button>
        <button aria-label="マイページ" onClick={() => navigate('/me')} className="grid h-12 w-12 place-items-center rounded-full active:bg-sunken">
          <Icon name="user" />
        </button>
      </div>
    </header>
  );
}

/** ロゴ：3色の絵の具が重なった円 */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="12" cy="13" r="8" fill="#B9CDB2" />
      <circle cx="20" cy="13" r="8" fill="#BFD3DC" style={{ mixBlendMode: 'multiply' }} />
      <circle cx="16" cy="20" r="8" fill="#F1CFC4" style={{ mixBlendMode: 'multiply' }} />
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
    </svg>
  );
}
