import { useState } from 'react';
import { ColorPicker } from '../components/ColorPicker';
import { Sheet, toast } from '../components/ui';
import { PALETTES } from '../data/palettes';
import { updateSettings, useSettings } from '../store/settings';

/** 色チップ（丸） */
export function Swatch({ color, selected, onClick, size = 40 }: { color: string; selected?: boolean; onClick: () => void; size?: number }) {
  return (
    <button
      onClick={onClick}
      aria-label={`色 ${color}`}
      aria-pressed={selected}
      className="relative shrink-0 rounded-full transition active:scale-90"
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0 rounded-full border border-black/10"
        style={{ background: color, boxShadow: selected ? `0 0 0 3px var(--surface), 0 0 0 5px var(--ink)` : undefined }}
      />
    </button>
  );
}

/** パレット一覧と自由な色作りのシート */
export function PaletteSheet({
  open,
  onClose,
  color,
  onPick,
  paletteId,
  onPalette,
  suggest,
}: {
  open: boolean;
  onClose: () => void;
  color: string;
  onPick: (hex: string) => void;
  paletteId: string;
  onPalette: (id: string) => void;
  suggest: string[];
}) {
  const settings = useSettings();
  const [tab, setTab] = useState<'palettes' | 'picker'>('palettes');

  const rows: { id: string; name: string; colors: string[]; note?: string }[] = [
    ...(settings.recentColors.length ? [{ id: 'recent', name: '最近使った色', colors: settings.recentColors }] : []),
    { id: 'custom', name: '自分で作った色', colors: settings.customColors, note: '「色を作る」で保存した色がここに並びます' },
    ...PALETTES.filter((p) => !p.mood),
    ...(suggest.length ? [{ id: 'suggest', name: 'この作品に合う色', colors: suggest }] : []),
    ...PALETTES.filter((p) => p.mood).map((p) => ({ ...p, name: `テーマ：${p.name}` })),
  ];

  return (
    <Sheet open={open} onClose={onClose} title="色をえらぶ">
      <div className="mb-4 grid grid-cols-2 rounded-full bg-sunken p-1">
        {(
          [
            ['palettes', 'パレット'],
            ['picker', '色を作る'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`h-10 rounded-full text-[14px] ${tab === id ? 'bg-surface shadow-sm' : 'text-ink-soft'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'palettes' ? (
        <div className="flex flex-col gap-5">
          {rows.map((p) => (
            <section key={p.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-medium">{p.name}</h3>
                {p.colors.length > 0 && p.id !== 'recent' && (
                  <button
                    onClick={() => {
                      onPalette(p.id);
                      onClose();
                    }}
                    className={`text-[13px] ${paletteId === p.id ? 'text-ink-soft' : 'text-sage-deep'}`}
                  >
                    {paletteId === p.id ? '使用中' : '手元に並べる'}
                  </button>
                )}
              </div>
              {p.colors.length ? (
                <div className="flex flex-wrap gap-2.5">
                  {p.colors.map((c, i) => (
                    <Swatch
                      key={c + i}
                      color={c}
                      selected={c.toLowerCase() === color.toLowerCase()}
                      onClick={() => {
                        onPick(c);
                        onClose();
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-ink-soft">{p.note}</p>
              )}
            </section>
          ))}
        </div>
      ) : (
        <ColorPicker
          initial={color}
          onPick={(hex) => {
            onPick(hex);
            onClose();
          }}
          onSave={(hex) => {
            updateSettings((s) => ({ customColors: [hex, ...s.customColors.filter((c) => c !== hex)].slice(0, 24) }));
            toast('「自分で作った色」に保存しました');
          }}
        />
      )}
    </Sheet>
  );
}

/** パレット ID から色配列を得る（recent / custom / suggest にも対応） */
export function resolvePalette(id: string, recent: string[], custom: string[], suggest: string[]): string[] {
  if (id === 'recent') return recent;
  if (id === 'custom') return custom.length ? custom : PALETTES[0].colors;
  if (id === 'suggest') return suggest.length ? suggest : PALETTES[0].colors;
  return (PALETTES.find((p) => p.id === id) ?? PALETTES[0]).colors;
}

export function paletteName(id: string) {
  if (id === 'custom') return '自分で作った色';
  if (id === 'suggest') return 'この作品に合う色';
  return PALETTES.find((p) => p.id === id)?.name ?? 'パステル';
}
