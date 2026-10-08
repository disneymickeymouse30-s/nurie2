import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { ErrorView, IconButton, Loading, relativeTime, toast } from '../components/ui';
import { getSamplePage } from '../data/samplePages';
import { ColoringEngine, type EngineState } from '../editor/ColoringEngine';
import { PaletteSheet, paletteName, resolvePalette, Swatch } from '../editor/PaletteSheet';
import { blobToCanvas, canvasToBlob, ctx2d, drawResized } from '../lib/image';
import { back, navigate } from '../lib/router';
import { dominantColors, suggestForCategory } from '../lib/suggestColors';
import { makeThumb } from '../store/artworks';
import { artworkRepo } from '../store/db';
import { markActiveToday, pushRecentColor, updateSettings, useSettings } from '../store/settings';
import type { Artwork, BrushSize, Tool } from '../types';

type SaveState = { kind: 'idle' | 'saving' | 'saved' | 'error'; at?: number };

const TOOLS: { id: Tool; label: string; icon: IconName }[] = [
  { id: 'fill', label: '塗る', icon: 'bucket' },
  { id: 'brush', label: 'ブラシ', icon: 'brush' },
  { id: 'eraser', label: '消しゴム', icon: 'eraser' },
  { id: 'move', label: '移動', icon: 'hand' },
];

export function EditorPage({ id }: { id: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ColoringEngine | null>(null);
  const artRef = useRef<Artwork | null>(null);
  const dirtyRef = useRef(false);
  const elapsedRef = useRef(0);
  const sessionStart = useRef(performance.now());
  const settings = useSettings();

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [art, setArt] = useState<Artwork | null>(null);
  const [es, setEs] = useState<EngineState>({ canUndo: false, canRedo: false, zoom: 1 });
  const [tool, setTool] = useState<Tool>('fill');
  const [brushSize, setBrushSize] = useState<BrushSize>('m');
  const [stayInside, setStayInside] = useState(true);
  const [color, setColor] = useState(settings.recentColors[0] ?? '#F6C5C0');
  const [paletteId, setPaletteId] = useState(settings.lastPaletteId);
  const [sheet, setSheet] = useState(false);
  const [save, setSave] = useState<SaveState>({ kind: 'idle' });
  const [suggest, setSuggest] = useState<string[]>([]);
  const [, tick] = useState(0);
  const [finishing, setFinishing] = useState(false);

  // ---------- 保存 ----------
  const currentElapsed = () => elapsedRef.current + (document.visibilityState === 'visible' ? performance.now() - sessionStart.current : 0);

  const persist = useCallback(async (extra: Partial<Artwork> = {}) => {
    const eng = engineRef.current, a = artRef.current;
    if (!eng || !a) return null;
    setSave({ kind: 'saving' });
    try {
      const colorLayer = await canvasToBlob(eng.colorCanvas, 'image/png');
      const thumbnail = await makeThumb(eng.compose(420));
      const next: Artwork = {
        ...a,
        colorLayer,
        thumbnail,
        usedColors: [...new Set([...a.usedColors, ...eng.usedColors])],
        elapsedMs: Math.round(currentElapsed()),
        updatedAt: Date.now(),
        ...extra,
      };
      await artworkRepo.put(next);
      artRef.current = next;
      dirtyRef.current = false;
      setSave({ kind: 'saved', at: Date.now() });
      return next;
    } catch {
      setSave({ kind: 'error' });
      return null;
    }
  }, []);

  // ---------- 読み込み ----------
  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const a = await artworkRepo.get(id);
        if (!a) throw new Error('not found');
        const line = await blobToCanvas(a.lineArt);
        const colorLayer = a.colorLayer ? await blobToCanvas(a.colorLayer) : undefined;
        if (disposed) return;
        const eng = new ColoringEngine(line, colorLayer);
        engineRef.current = eng;
        artRef.current = a;
        elapsedRef.current = a.elapsedMs;
        a.usedColors.forEach((c) => eng.usedColors.add(c));
        setArt(a);
        setSave(a.colorLayer ? { kind: 'saved', at: a.updatedAt } : { kind: 'idle' });
        setStatus('ready');

        // この作品に合う色
        if (a.originalImage) {
          const c = drawResized(await blobToCanvas(a.originalImage), 160);
          setSuggest(dominantColors(ctx2d(c, true).getImageData(0, 0, c.width, c.height).data));
        } else setSuggest(suggestForCategory(getSamplePage(a.coloringPageId)?.category));
      } catch {
        if (!disposed) setStatus('error');
      }
    })();
    return () => {
      disposed = true;
    };
  }, [id]);

  // ---------- エンジンを DOM に取り付け ----------
  useEffect(() => {
    const eng = engineRef.current;
    if (status !== 'ready' || !eng || !hostRef.current || !stageRef.current) return;
    eng.mount(hostRef.current, stageRef.current);
    const offState = eng.onState(setEs);
    let timer: number | undefined;
    const offChange = eng.onChange(() => {
      dirtyRef.current = true;
      markActiveToday();
      clearTimeout(timer);
      timer = window.setTimeout(() => persist(), 1500); // 自動保存（操作が落ち着いてから）
    });
    const ro = new ResizeObserver(() => eng.fit());
    ro.observe(hostRef.current);
    return () => {
      clearTimeout(timer);
      offState();
      offChange();
      ro.disconnect();
      eng.unmount();
    };
  }, [status, persist]);

  // ---------- アプリを閉じる・切り替える時も保存（データ消失防止） ----------
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        elapsedRef.current += performance.now() - sessionStart.current;
        if (dirtyRef.current) persist();
      } else sessionStart.current = performance.now();
    };
    const onPageHide = () => dirtyRef.current && persist();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    const iv = window.setInterval(() => tick((n) => n + 1), 20000); // 「◯分前」を更新
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      clearInterval(iv);
      // 画面を離れるとき：未保存なら保存。何も塗っていないサンプルは一覧を散らかさないよう削除
      const eng = engineRef.current, a = artRef.current;
      if (eng && a) {
        if (!a.isCustom && !a.colorLayer && !eng.hasPaint()) artworkRepo.remove(a.id).catch(() => {});
        else if (dirtyRef.current) persist();
      }
    };
  }, [persist]);

  // ---------- ツール設定をエンジンへ ----------
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    eng.tool = tool;
    eng.brushSize = brushSize;
    eng.stayInside = stayInside;
    eng.color = color;
  }, [tool, brushSize, stayInside, color, status]);

  // キーボード（PC 用）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) engineRef.current?.redo();
        else engineRef.current?.undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        engineRef.current?.redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pickColor = (hex: string) => {
    setColor(hex);
    pushRecentColor(hex);
    if (tool === 'eraser' || tool === 'move') setTool('fill');
  };

  const choosePalette = (pid: string) => {
    setPaletteId(pid);
    updateSettings({ lastPaletteId: pid });
  };

  const colors = useMemo(
    () => resolvePalette(paletteId, settings.recentColors, settings.customColors, suggest),
    [paletteId, settings.recentColors, settings.customColors, suggest],
  );

  const finish = async () => {
    const eng = engineRef.current;
    if (!eng) return;
    if (!eng.hasPaint()) {
      toast('少し塗ってから完成にしましょう');
      return;
    }
    setFinishing(true);
    const saved = await persist({ status: 'completed', completedAt: Date.now() });
    if (saved) navigate(`/done/${saved.id}`, true);
    else {
      setFinishing(false);
      toast('保存できませんでした。もう一度お試しください。');
    }
  };

  if (status === 'error') {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center px-2">
          <IconButton icon="back" label="戻る" onClick={() => back('/works')} />
        </div>
        <ErrorView message="この作品を開けませんでした。マイギャラリーからもう一度選んでください。" onRetry={() => navigate('/works')} />
      </div>
    );
  }

  const saveLabel =
    save.kind === 'saving'
      ? '保存中…'
      : save.kind === 'saved' && save.at
        ? `保存済み・${relativeTime(save.at)}`
        : save.kind === 'error'
          ? '保存できませんでした'
          : '自動で保存されます';

  return (
    <div className="fixed inset-0 flex flex-col bg-paper" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* 上部：最小限 */}
      <header className="flex h-14 shrink-0 items-center gap-1 px-1.5">
        <IconButton icon="back" label="戻る（自動保存されます）" onClick={() => back('/')} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[15px] font-medium">{art?.title ?? ''}</div>
          <div className={`text-[11px] ${save.kind === 'error' ? 'text-danger' : 'text-ink-soft'}`} aria-live="polite">
            {saveLabel}
          </div>
        </div>
        <button
          onClick={finish}
          disabled={status !== 'ready' || finishing}
          className="h-11 shrink-0 rounded-full bg-sage-deep px-4 text-[14px] font-medium text-surface disabled:opacity-50"
        >
          {finishing ? '保存中…' : '完成'}
        </button>
      </header>

      {/* 塗り絵エリア */}
      <div ref={hostRef} className="relative min-h-0 flex-1 touch-none select-none overflow-hidden" style={{ background: 'var(--canvas-bg)' }}>
        <div ref={stageRef} className="cl-stage" />
        {status === 'loading' && (
          <div className="absolute inset-0 grid place-items-center">
            <Loading label="塗り絵を開いています…" />
          </div>
        )}
        {status === 'ready' && (
          <div className="absolute right-2 top-2 flex flex-col gap-1 rounded-full bg-surface/85 p-1 shadow-sm backdrop-blur">
            <IconButton icon="zoomIn" label="拡大" onClick={() => engineRef.current?.zoomBy(1.5)} className="!h-10 !w-10" />
            <IconButton icon="zoomOut" label="縮小" onClick={() => engineRef.current?.zoomBy(1 / 1.5)} className="!h-10 !w-10" />
            <IconButton icon="fit" label="全体を表示" onClick={() => engineRef.current?.fit()} className="!h-10 !w-10" />
          </div>
        )}
        {status === 'ready' && es.zoom > 1.05 && (
          <div className="num pointer-events-none absolute left-2 top-2 rounded-full bg-surface/85 px-2.5 py-1 text-[12px] text-ink-soft">
            {Math.round(es.zoom * 100)}%
          </div>
        )}
      </div>

      {/* 下部：片手で届く操作パネル */}
      <div className="shrink-0 border-t border-line bg-surface" style={{ paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="mx-auto flex max-w-lg items-center justify-between px-2 pt-1.5">
          <div className="flex gap-0.5" role="radiogroup" aria-label="道具">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={tool === t.id}
                aria-label={t.id === 'fill' ? '塗りつぶし' : t.label}
                onClick={() => setTool(t.id)}
                className={`flex h-14 w-[60px] flex-col items-center justify-center gap-0.5 whitespace-nowrap rounded-2xl text-[10px] transition ${
                  tool === t.id ? 'bg-sage-wash text-sage-deep' : 'text-ink-soft'
                }`}
              >
                <Icon name={t.icon} size={22} stroke={tool === t.id ? 2 : 1.7} />
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-0.5">
            <IconButton icon="undo" label="元に戻す" onClick={() => engineRef.current?.undo()} disabled={!es.canUndo} className="!h-14 !w-14" />
            <IconButton icon="redo" label="やり直す" onClick={() => engineRef.current?.redo()} disabled={!es.canRedo} className="!h-14 !w-14" />
          </div>
        </div>

        {(tool === 'brush' || tool === 'eraser') && (
          <div className="mx-auto flex max-w-lg items-center gap-2 px-3 pt-1">
            <div className="flex rounded-full bg-sunken p-1" role="radiogroup" aria-label="ブラシの太さ">
              {(
                [
                  ['s', '細', 8],
                  ['m', '中', 14],
                  ['l', '太', 22],
                ] as const
              ).map(([id, label, dot]) => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={brushSize === id}
                  aria-label={`太さ ${label}`}
                  onClick={() => setBrushSize(id)}
                  className={`flex h-10 w-14 items-center justify-center gap-1 rounded-full text-[12px] ${brushSize === id ? 'bg-surface shadow-sm' : 'text-ink-soft'}`}
                >
                  <span className="rounded-full bg-ink" style={{ width: dot / 2 + 2, height: dot / 2 + 2 }} />
                  {label}
                </button>
              ))}
            </div>
            <label className="ml-auto flex h-10 items-center gap-2 text-[12px] text-ink-soft">
              <input id="stay-inside" type="checkbox" checked={stayInside} onChange={(e) => setStayInside(e.target.checked)} className="h-5 w-5 accent-[var(--sage-deep)]" />
              はみ出さない
            </label>
          </div>
        )}

        <div className="mx-auto flex max-w-lg items-center gap-2 px-2 pb-1 pt-1.5">
          <button
            onClick={() => setSheet(true)}
            aria-label={`いまの色 ${color}。パレットを開く`}
            className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full"
          >
            <span className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(#F6C5C0,#FBEAB0,#BFE3D6,#BFD8EC,#CFC8EA,#F6C5C0)' }} />
            <span className="relative h-10 w-10 rounded-full border-[3px] border-surface" style={{ background: color }} />
          </button>
          <div className="min-w-0 flex-1">
            <button onClick={() => setSheet(true)} className="mb-0.5 block text-[11px] tracking-wider text-ink-soft">
              {paletteName(paletteId)} ▾
            </button>
            <div className="chips py-1 pl-0.5 pr-2">
              {colors.map((c, i) => (
                <Swatch key={c + i} color={c} selected={c.toLowerCase() === color.toLowerCase()} onClick={() => pickColor(c)} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <PaletteSheet
        open={sheet}
        onClose={() => setSheet(false)}
        color={color}
        onPick={pickColor}
        paletteId={paletteId}
        onPalette={choosePalette}
        suggest={suggest}
      />
    </div>
  );
}
