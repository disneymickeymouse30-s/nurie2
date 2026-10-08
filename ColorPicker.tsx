/**
 * 自由に色を作るピッカー（色相・彩度・明るさ + HEX / RGB 入力）
 */
import { useEffect, useState } from 'react';
import { hexToRgb } from '../lib/floodFill';
import { Button } from './ui';

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number) {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

export const isHex = (v: string) => /^#?[0-9a-fA-F]{6}$/.test(v.trim());

export function ColorPicker({ initial, onPick, onSave }: { initial: string; onPick: (hex: string) => void; onSave: (hex: string) => void }) {
  const [hsl, setHsl] = useState<[number, number, number]>(() => hexToHsl(initial));
  const hex = hslToHex(...hsl);
  const [hexText, setHexText] = useState(hex);
  const rgb = hexToRgb(hex);

  useEffect(() => setHexText(hex), [hex]);

  const setFromHex = (v: string) => {
    setHexText(v);
    if (isHex(v)) setHsl(hexToHsl(v.startsWith('#') ? v : '#' + v));
  };

  const track = (kind: 'h' | 's' | 'l') => {
    const [h, s, l] = hsl;
    if (kind === 'h') return 'linear-gradient(to right,' + [0, 60, 120, 180, 240, 300, 360].map((x) => hslToHex(x, Math.max(s, 50), 55)).join(',') + ')';
    if (kind === 's') return `linear-gradient(to right, ${hslToHex(h, 0, l)}, ${hslToHex(h, 100, l)})`;
    return `linear-gradient(to right, #000, ${hslToHex(h, s, 50)}, #fff)`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 rounded-full border border-line" style={{ background: hex }} />
        <div className="grid flex-1 grid-cols-4 gap-2">
          <label className="col-span-4 flex items-center gap-2 text-[13px] text-ink-soft">
            HEX
            <input
              id="hex-input"
              value={hexText}
              onChange={(e) => setFromHex(e.target.value)}
              className="num h-10 min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 text-[15px] uppercase text-ink"
              maxLength={7}
              inputMode="text"
              autoCapitalize="characters"
            />
          </label>
          {(['R', 'G', 'B'] as const).map((k, i) => (
            <label key={k} className="flex flex-col text-[11px] text-ink-soft">
              {k}
              <input
                id={`rgb-${k}`}
                type="number"
                min={0}
                max={255}
                value={rgb[i]}
                onChange={(e) => {
                  const next = [...rgb] as [number, number, number];
                  next[i] = Math.max(0, Math.min(255, Number(e.target.value) || 0));
                  setHsl(hexToHsl(rgbToHex(...next)));
                }}
                className="num h-10 rounded-xl border border-line bg-paper px-2 text-[15px] text-ink"
              />
            </label>
          ))}
        </div>
      </div>

      {(
        [
          ['h', '色相', 360],
          ['s', '鮮やかさ', 100],
          ['l', '明るさ', 100],
        ] as const
      ).map(([k, label, max], i) => (
        <label key={k} className="flex flex-col gap-1 text-[13px] text-ink-soft">
          {label}
          <input
            id={`hsl-${k}`}
            type="range"
            min={0}
            max={max}
            value={hsl[i]}
            onChange={(e) => {
              const next = [...hsl] as [number, number, number];
              next[i] = Number(e.target.value);
              setHsl(next);
            }}
            className="h-8 w-full appearance-none rounded-full"
            style={{ background: track(k) }}
          />
        </label>
      ))}

      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" onClick={() => onSave(hex)}>
          色を保存
        </Button>
        <Button onClick={() => onPick(hex)}>この色で塗る</Button>
      </div>
    </div>
  );
}
