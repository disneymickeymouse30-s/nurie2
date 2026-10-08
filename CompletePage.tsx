import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';
import { Button, ErrorView, formatDate, formatDuration, IconButton, Loading, Sheet, TopBar, toast } from '../components/ui';
import { getSamplePage } from '../data/samplePages';
import { commentFor } from '../lib/artworkComment';
import { composeArtwork, downloadBlob, exportBlob, fileName, shareImage } from '../lib/export';
import { canvasToBlob } from '../lib/image';
import { navigate } from '../lib/router';
import { useObjectUrl } from '../store/artworks';
import { artworkRepo } from '../store/db';
import { updateSettings, useSettings } from '../store/settings';
import type { Artwork } from '../types';

export function CompletePage({ id }: { id: string }) {
  const settings = useSettings();
  const [art, setArt] = useState<Artwork | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [preview, setPreview] = useState<Blob>();
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState<Blob | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const previewUrl = useObjectUrl(preview);
  const savedUrl = useObjectUrl(saved ?? undefined);

  useEffect(() => {
    artworkRepo
      .get(id)
      .then(async (a) => {
        if (!a) throw new Error();
        setArt(a);
        setPreview(await canvasToBlob(await composeArtwork(a, { watermark: false, maxSide: 1200 }), 'image/jpeg', 0.9));
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [id]);

  if (state === 'error') {
    return (
      <>
        <TopBar title="作品" fallback="/works" />
        <ErrorView message="この作品を開けませんでした。" onRetry={() => navigate('/works')} />
      </>
    );
  }
  if (!art || state === 'loading') {
    return (
      <>
        <TopBar title="作品" fallback="/works" />
        <Loading label="作品を準備しています…" />
      </>
    );
  }

  const source = art.isCustom ? 'あなたの写真から作った塗り絵' : getSamplePage(art.coloringPageId)?.title ?? art.title;

  const onShare = async () => {
    setBusy('share');
    try {
      const fmt = settings.shareFormat;
      const blob = await exportBlob(art, fmt, settings.watermark);
      const r = await shareImage(blob, fileName(art, fmt));
      if (r === 'unsupported') setSaved(blob); // 共有シートがない環境では画像を表示して長押し保存してもらう
    } catch {
      toast('うまく書き出せませんでした。もう一度お試しください。');
    } finally {
      setBusy(null);
    }
  };

  const onSave = async (fmt: 'png' | 'jpg') => {
    setBusy(fmt);
    try {
      const blob = await exportBlob(art, fmt, settings.watermark);
      downloadBlob(blob, fileName(art, fmt));
      setSaved(blob);
    } catch {
      toast('うまく書き出せませんでした。もう一度お試しください。');
    } finally {
      setBusy(null);
    }
  };

  const toggleFav = async () => {
    const next = await artworkRepo.patch(art.id, { favorite: !art.favorite });
    if (next) setArt(next);
  };

  const continueColoring = async () => {
    await artworkRepo.patch(art.id, { status: 'in_progress' });
    navigate(`/edit/${art.id}`);
  };

  return (
    <div className="pb-12">
      <TopBar
        title={art.status === 'completed' ? '完成しました' : '作品'}
        fallback="/works"
        right={<IconButton icon="heart" label={art.favorite ? 'お気に入りから外す' : 'お気に入りに追加'} onClick={toggleFav} active={art.favorite} className={art.favorite ? '!text-danger' : ''} />}
      />
      <main className="mx-auto flex max-w-lg flex-col gap-5 px-4">
        <figure className="card rise overflow-hidden bg-white p-2">
          {previewUrl ? <img src={previewUrl} alt={`${art.title} の完成作品`} className="w-full rounded-xl" /> : <div className="aspect-square" />}
        </figure>

        <p className="rounded-2xl bg-sage-wash px-4 py-3 font-display text-[16px] leading-relaxed text-ink">{commentFor(art.usedColors)}</p>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[14px]">
          <Row label="作品">{art.title}</Row>
          <Row label="制作時間">{formatDuration(art.elapsedMs)}</Row>
          <Row label="使用した塗り絵">{source}</Row>
          <Row label="完成日時">{formatDate(art.completedAt ?? art.updatedAt)}</Row>
          <div className="col-span-2 flex flex-col gap-1.5">
            <dt className="text-[12px] text-ink-soft">使用した色（{art.usedColors.length}色）</dt>
            <dd className="flex flex-wrap gap-1.5">
              {art.usedColors.map((c) => (
                <span key={c} className="h-7 w-7 rounded-full border border-black/10" style={{ background: c }} title={c} />
              ))}
            </dd>
          </div>
        </dl>

        <section className="flex flex-col gap-3">
          <Button icon="share" onClick={onShare} disabled={!!busy}>
            {busy === 'share' ? '準備しています…' : '共有する（LINE・Instagram など）'}
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="ghost" icon="download" onClick={() => onSave('png')} disabled={!!busy}>
              PNGで保存
            </Button>
            <Button variant="ghost" icon="download" onClick={() => onSave('jpg')} disabled={!!busy}>
              JPGで保存
            </Button>
          </div>
          <label className="flex items-center justify-between rounded-2xl bg-sunken px-4 py-3 text-[14px]">
            <span>
              「Created with Coloria」を入れる
              <span className="block text-[12px] text-ink-soft">共有・保存する画像の右下に小さく入ります</span>
            </span>
            <input id="watermark" type="checkbox" checked={settings.watermark} onChange={(e) => updateSettings({ watermark: e.target.checked })} className="h-6 w-6 accent-[var(--sage-deep)]" />
          </label>
          <p className="text-center text-[12px] text-ink-soft">保存される画像は {art.width}×{art.height}px の高解像度です</p>
        </section>

        <section className="flex flex-col gap-3 border-t border-line pt-5">
          <Button variant="soft" icon="brush" onClick={continueColoring}>
            もう少し塗る
          </Button>
          <Button variant="ghost" icon="palette" onClick={() => navigate('/works')}>
            マイギャラリーへ
          </Button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="mx-auto h-11 text-[13px] text-danger">
              この作品を削除
            </button>
          ) : (
            <div className="flex flex-col gap-2 rounded-2xl border border-line p-4 text-center">
              <p className="text-[14px]">この作品を削除しますか？元に戻せません。</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                  やめる
                </Button>
                <Button
                  variant="danger"
                  icon="trash"
                  onClick={async () => {
                    await artworkRepo.remove(art.id);
                    toast('削除しました');
                    navigate('/works', true);
                  }}
                >
                  削除する
                </Button>
              </div>
            </div>
          )}
        </section>
      </main>

      <Sheet open={!!saved} onClose={() => setSaved(null)} title="画像ができました">
        <div className="flex flex-col gap-3">
          {savedUrl && <img src={savedUrl} alt="書き出した作品" className="w-full rounded-xl border border-line" />}
          <p className="flex items-start gap-2 text-[13px] text-ink-soft">
            <Icon name="download" size={18} className="mt-0.5 shrink-0" />
            ダウンロードが始まらないときは、上の画像を長押しして「写真に保存」や「共有」を選んでください。
          </p>
        </div>
      </Sheet>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-[12px] text-ink-soft">{label}</dt>
      <dd className="truncate">{children}</dd>
    </div>
  );
}
