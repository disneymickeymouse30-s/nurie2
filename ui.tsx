/** 再利用する小さな UI 部品 */
import { useEffect, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { back } from '../lib/router';
import type { Difficulty } from '../types';

export function Stars({ value, size = 12 }: { value: Difficulty | number; size?: number }) {
  return (
    <span className="inline-flex gap-[1px] text-[#c9a25a]" aria-label={`難易度 ${value} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8L12 3.5Z"
            fill={i <= value ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
            opacity={i <= value ? 1 : 0.45}
          />
        </svg>
      ))}
    </span>
  );
}

type BtnVariant = 'primary' | 'soft' | 'ghost' | 'danger';

export function Button({
  children,
  onClick,
  variant = 'primary',
  icon,
  disabled,
  className = '',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  icon?: IconName;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const styles: Record<BtnVariant, string> = {
    primary: 'bg-sage-deep text-surface shadow-sm active:brightness-95',
    soft: 'bg-sage-wash text-sage-deep active:brightness-95',
    ghost: 'bg-transparent text-ink border border-line active:bg-sunken',
    danger: 'bg-transparent text-danger border border-line active:bg-sunken',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium transition disabled:opacity-45 ${styles[variant]} ${className}`}
    >
      {icon && <Icon name={icon} size={20} />}
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  onClick,
  disabled,
  active,
  className = '',
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-12 w-12 place-items-center rounded-full transition disabled:opacity-30 ${
        active ? 'bg-sage-wash text-sage-deep' : 'text-ink active:bg-sunken'
      } ${className}`}
    >
      <Icon name={icon} />
    </button>
  );
}

/** 戻るボタン付きのページ見出し */
export function TopBar({ title, right, fallback = '/' }: { title: string; right?: ReactNode; fallback?: string }) {
  return (
    <header
      className="sticky z-20 flex h-14 items-center gap-1 bg-paper/90 px-2 backdrop-blur"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <IconButton icon="back" label="戻る" onClick={() => back(fallback)} />
      <h1 className="min-w-0 flex-1 truncate font-display text-[18px] font-semibold">{title}</h1>
      {right}
    </header>
  );
}

/** 待ち時間用の表示。呼吸するような円で「待たされ感」をやわらげる */
export function Loading({ label = '読み込んでいます…', progress }: { label?: string; progress?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16 text-center" role="status" aria-live="polite">
      <div className="relative h-20 w-20">
        <div className="breathe absolute inset-0 rounded-full bg-sage-wash" />
        <div className="breathe absolute inset-3 rounded-full bg-mist" style={{ animationDelay: '0.4s' }} />
        <div className="breathe absolute inset-6 rounded-full bg-blush" style={{ animationDelay: '0.8s' }} />
      </div>
      <p className="text-[15px] text-ink">{label}</p>
      {progress !== undefined && (
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-sunken">
          <div className="h-full rounded-full bg-sage transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
      <p className="max-w-xs text-[15px] text-ink">{message}</p>
      {onRetry && (
        <Button variant="soft" onClick={onRetry}>
          もう一度試す
        </Button>
      )}
    </div>
  );
}

/** 下から出てくるシート */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="閉じる" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        className="rise relative max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-surface px-5 pt-3"
        style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-semibold">{title}</h2>
          <IconButton icon="close" label="閉じる" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

// ===== トースト =====
let pushToast: (m: string) => void = () => {};
export function toast(message: string) {
  pushToast(message);
}
export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let t: number | undefined;
    pushToast = (m) => {
      setMsg(m);
      clearTimeout(t);
      t = window.setTimeout(() => setMsg(null), 2600);
    };
    return () => clearTimeout(t);
  }, []);
  if (!msg) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
      style={{ bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }}
      role="status"
      aria-live="polite"
    >
      <div className="rise rounded-full bg-ink px-5 py-3 text-[14px] text-paper shadow-lg">{msg}</div>
    </div>
  );
}

/** 「3分前」などの相対時間 */
export function relativeTime(ts: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 10) return 'たった今';
  if (s < 60) return `${s}秒前`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}分前`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.round(h / 24);
  return `${d}日前`;
}

export function formatDuration(ms: number) {
  const m = Math.round(ms / 60000);
  if (m < 1) return '1分未満';
  if (m < 60) return `${m}分`;
  return `${Math.floor(m / 60)}時間${m % 60 ? `${m % 60}分` : ''}`;
}

export function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}
