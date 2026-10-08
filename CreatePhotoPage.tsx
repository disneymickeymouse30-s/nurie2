import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '../components/Icon';
import { BottomNav } from '../components/Navigation';
import { Button, Loading, TopBar, toast } from '../components/ui';
import { coloringProvider } from '../lib/coloringProvider';
import { ACCEPT_ATTR, decodeImage, drawResized, UserFacingError, validateImageFile } from '../lib/image';
import { navigate } from '../lib/router';
import { startFromPhoto } from '../store/artworks';
import { updateSettings, useSettings } from '../store/settings';
import type { BackgroundMode, ConvertOptions, ConvertStyle, SubjectKind } from '../types';

const STYLES: { id: ConvertStyle; name: string; text: string; preset: Pick<ConvertOptions, 'detail' | 'density' | 'thickness'> }[] = [
  { id: 'easy', name: 'やさしい', text: '線が少なく、大きな面で塗れる', preset: { detail: 25, density: 30, thickness: 4 } },
  { id: 'standard', name: 'スタンダード', text: 'ほどよい細かさの大人の塗り絵', preset: { detail: 50, density: 50, thickness: 3 } },
  { id: 'detailed', name: '精密', text: '細かな線と模様をたっぷり', preset: { detail: 80, density: 75, thickness: 2 } },
  { id: 'art', name: 'アート', text: 'ペン画のような味のある線', preset: { detail: 60, density: 50, thickness: 2 } },
  { id: 'mandala', name: 'マンダラ風', text: '写真のまわりを装飾で囲む', preset: { detail: 45, density: 45, thickness: 3 } },
];

const BACKGROUNDS: { id: BackgroundMode; label: string }[] = [
  { id: 'keep', label: 'そのまま' },
  { id: 'simplify', label: '簡略化' },
  { id: 'remove', label: '背景を削除' },
];

const SUBJECTS: { id: SubjectKind; label: string }[] = [
  { id: 'auto', label: '自動' },
  { id: 'person', label: '人物' },
  { id: 'pet', label: 'ペット' },
  { id: 'building', label: '建物' },
  { id: 'flower', label: '花' },
  { id: 'landscape', label: '風景' },
];

const TIPS = ['線を整えています', '塗りやすい面に分けています', '小さすぎる部分をまとめています', 'もうすぐできあがります'];

type Step = 'pick' | 'options' | 'generating' | 'preview';

export function CreatePhotoPage() {
  const settings = useSettings();
  const [step, setStep] = useState<Step>('pick');
  const [photo, setPhoto] = useState<HTMLCanvasElement | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [opts, setOpts] = useState<ConvertOptions>({ style: 'standard', detail: 50, density: 50, thickness: 3, background: 'keep', subject: 'auto' });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<HTMLCanvasElement | null>(null);
  const [resultUrl, setResultUrl] = useState<string>();
  const [view, setView] = useState<'line' | 'photo'>('line');
  const [error, setError] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [starting, setStarting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);
  useEffect(() => () => { if (resultUrl) URL.revokeObjectURL(resultUrl); }, [resultUrl]);

  const onFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    setLoadingFile(true);
    try {
      await validateImageFile(file);
      const img = await decodeImage(file);
      // 大きな写真はそのまま扱わず、作業用に縮小（EXIF もここで消える）
      const c = drawResized(img, 1600);
      if ('close' in img) img.close();
      setPhoto(c);
      c.toBlob((b) => b && setPhotoUrl(URL.createObjectURL(b)), 'image/jpeg', 0.85);
      setStep('options');
    } catch (e) {
      setError(e instanceof UserFacingError ? e.message : '写真を読み込めませんでした。別の写真をお試しください。');
    } finally {
      setLoadingFile(false);
      if (fileRef.current) fileRef.current.value = '';
      if (camRef.current) camRef.current.value = '';
    }
  };

  const generate = async () => {
    if (!photo) return;
    setStep('generating');
    setProgress(0.03);
    setError(null);
    const t0 = performance.now();
    try {
      const { lineArt } = await coloringProvider.generateFromPhoto(photo, opts, setProgress);
      // 早すぎると「何が起きたか」分かりにくいので最低 0.8 秒は見せる
      const wait = 800 - (performance.now() - t0);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      setResult(lineArt);
      lineArt.toBlob((b) => b && setResultUrl(URL.createObjectURL(b)), 'image/png');
      setView('line');
      setStep('preview');
    } catch (e) {
      setError(e instanceof UserFacingError ? e.message : 'うまく塗り絵を作れませんでした。もう一度試してみてください。');
      setStep('options');
    }
  };

  const begin = async () => {
    if (!result || !photo) return;
    setStarting(true);
    try {
      const d = new Date();
      const a = await startFromPhoto(result, photo, `写真の塗り絵 ${d.getMonth() + 1}/${d.getDate()}`);
      navigate(`/edit/${a.id}`, true);
    } catch {
      toast('保存できませんでした。端末の空き容量をご確認ください。');
      setStarting(false);
    }
  };

  const tipIndex = Math.min(TIPS.length - 1, Math.floor(progress * TIPS.length));

  return (
    <div className="pb-32">
      <TopBar
        title={step === 'preview' ? 'できあがりを確認' : '写真から作る'}
        fallback="/"
      />
      <main className="mx-auto flex max-w-lg flex-col gap-5 px-4">
        {step === 'pick' && (
          <>
            <section className="flex flex-col gap-2 pt-2">
              <h2 className="font-display text-[24px] font-semibold leading-snug">見るだけだった写真を、<br />自分だけのアートに。</h2>
              <p className="text-ink-soft">ペット、旅先の景色、庭の花。写真を選ぶと、塗りやすい線画に変わります。</p>
            </section>

            <div className="grid grid-cols-2 gap-3">
              <PickButton icon="image" title="写真を選ぶ" text="アルバムやファイルから" onClick={() => fileRef.current?.click()} disabled={loadingFile || !settings.uploadNoticeAccepted} />
              <PickButton icon="camera" title="カメラで撮る" text="その場で撮影" onClick={() => camRef.current?.click()} disabled={loadingFile || !settings.uploadNoticeAccepted} />
            </div>
            <input ref={fileRef} id="photo-file" type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <input ref={camRef} id="photo-camera" type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

            <label className="flex items-start gap-3 rounded-2xl bg-sunken p-4 text-[13px] leading-relaxed">
              <input
                id="rights"
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 accent-[var(--sage-deep)]"
                checked={settings.uploadNoticeAccepted}
                onChange={(e) => updateSettings({ uploadNoticeAccepted: e.target.checked })}
              />
              <span>
                権利を保有している、または利用許諾を得ている画像をアップロードしてください。人が写っている写真は、写っている方の気持ちにも配慮しましょう。
                <span className="mt-1 block text-ink-soft">写真はこの端末の中だけで変換され、外部には送信されません。位置情報などの撮影データは取り除いて保存します。</span>
              </span>
            </label>
            {!settings.uploadNoticeAccepted && <p className="-mt-2 text-center text-[13px] text-ink-soft">上の確認にチェックすると写真を選べます</p>}
            {loadingFile && <Loading label="写真を読み込んでいます…" />}
            <p className="text-center text-[12px] text-ink-soft">JPG・PNG・WEBP／20MBまで</p>
          </>
        )}

        {step === 'options' && photo && (
          <>
            <div className="flex items-center gap-3">
              {photoUrl && <img src={photoUrl} alt="選んだ写真" className="h-20 w-20 rounded-2xl object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="font-display text-[19px] font-semibold">どんな塗り絵にしますか？</p>
                <button className="text-[13px] text-sage-deep" onClick={() => setStep('pick')}>
                  別の写真にする
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2" role="radiogroup" aria-label="塗り絵のスタイル">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  role="radio"
                  aria-checked={opts.style === s.id}
                  onClick={() => setOpts((o) => ({ ...o, style: s.id, ...s.preset }))}
                  className={`flex min-h-16 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    opts.style === s.id ? 'border-sage-deep bg-sage-wash' : 'border-line bg-surface'
                  }`}
                >
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${opts.style === s.id ? 'border-sage-deep bg-sage-deep text-surface' : 'border-line'}`}>
                    {opts.style === s.id && <Icon name="check" size={14} stroke={2.6} />}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-[13px] text-ink-soft">{s.text}</span>
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={showAdvanced}
              className="flex h-12 items-center justify-between rounded-2xl bg-sunken px-4 text-[14px]"
            >
              <span className="inline-flex items-center gap-2">
                <Icon name="sliders" size={18} /> 細かく調整する
              </span>
              <Icon name="back" size={18} className={`transition ${showAdvanced ? 'rotate-90' : '-rotate-90'}`} />
            </button>

            {showAdvanced && (
              <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-4">
                <Slider id="detail" label="線の細かさ" left="粗い" right="細かい" min={0} max={100} value={opts.detail} onChange={(v) => setOpts((o) => ({ ...o, detail: v }))} />
                <Slider id="thickness" label="線の太さ" left="細い" right="太い" min={1} max={5} value={opts.thickness} onChange={(v) => setOpts((o) => ({ ...o, thickness: v }))} />
                <Slider id="density" label="塗り絵密度" left="低" right="高" min={0} max={100} value={opts.density} onChange={(v) => setOpts((o) => ({ ...o, density: v }))} />
                <Segmented label="背景" value={opts.background} items={BACKGROUNDS} onChange={(v) => setOpts((o) => ({ ...o, background: v }))} />
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] text-ink-soft">被写体</span>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECTS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setOpts((o) => ({ ...o, subject: s.id }))}
                        aria-pressed={opts.subject === s.id}
                        className={`h-10 rounded-full px-4 text-[14px] ${opts.subject === s.id ? 'bg-ink text-paper' : 'border border-line'}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && <p className="rounded-2xl bg-blush p-3 text-center text-[14px]">{error}</p>}
            <Button icon="sparkle" onClick={generate}>
              塗り絵を作る
            </Button>
          </>
        )}

        {step === 'generating' && <Loading label={`塗り絵を作っています…　${TIPS[tipIndex]}`} progress={progress} />}

        {step === 'preview' && result && (
          <>
            <div className="mx-auto flex rounded-full bg-sunken p-1" role="tablist" aria-label="表示の切り替え">
              {(['line', 'photo'] as const).map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={`h-10 rounded-full px-5 text-[14px] ${view === v ? 'bg-surface shadow-sm' : 'text-ink-soft'}`}
                >
                  {v === 'line' ? '塗り絵' : '元の写真'}
                </button>
              ))}
            </div>
            <div className="card overflow-hidden bg-white">
              <img src={view === 'line' ? resultUrl : photoUrl} alt={view === 'line' ? '生成された塗り絵' : '元の写真'} className="max-h-[62vh] w-full object-contain" />
            </div>
            <p className="text-center text-[13px] text-ink-soft">
              {STYLES.find((s) => s.id === opts.style)?.name}・イメージと違うときは「調整する」で細かさを変えてみてください
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="ghost" icon="sliders" onClick={() => { setShowAdvanced(true); setStep('options'); }}>
                調整する
              </Button>
              <Button variant="soft" icon="undo" onClick={generate}>
                もう一度生成
              </Button>
            </div>
            <Button icon="brush" onClick={begin} disabled={starting}>
              {starting ? '準備しています…' : 'この塗り絵で始める'}
            </Button>
          </>
        )}
        {step === 'pick' && error && <p className="rounded-2xl bg-blush p-3 text-center text-[14px]">{error}</p>}
      </main>
      <BottomNav active="create" />
    </div>
  );
}

function PickButton({ icon, title, text, onClick, disabled }: { icon: IconName; title: string; text: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-sage bg-sage-wash/60 p-4 text-center transition active:scale-[0.98] disabled:opacity-45"
    >
      <span className="grid h-14 w-14 place-items-center rounded-full bg-surface text-sage-deep">
        <Icon name={icon} size={28} />
      </span>
      <span className="font-display text-[17px] font-semibold">{title}</span>
      <span className="text-[12px] text-ink-soft">{text}</span>
    </button>
  );
}

function Slider({ id, label, left, right, min, max, value, onChange }: { id: string; label: string; left: string; right: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[13px] text-ink-soft">
        {label}
      </label>
      <input id={id} type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
      <div className="flex justify-between text-[12px] text-ink-soft">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

function Segmented<T extends string>({ label, value, items, onChange }: { label: string; value: T; items: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] text-ink-soft">{label}</span>
      <div className="grid rounded-full bg-sunken p-1" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((it) => (
          <button
            key={it.id}
            aria-pressed={value === it.id}
            onClick={() => onChange(it.id)}
            className={`h-10 rounded-full text-[13px] ${value === it.id ? 'bg-surface shadow-sm' : 'text-ink-soft'}`}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
