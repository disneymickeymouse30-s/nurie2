import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Button, TopBar } from '../components/ui';
import { coloringProvider } from '../lib/coloringProvider';
import { UserFacingError } from '../lib/image';
import { navigate } from '../lib/router';

const EXAMPLES = ['桜の木の下で猫が昼寝している', '幻想的な日本庭園', '海辺のカフェ', '細密なヨーロッパの街並み'];

/** AI で作る（Phase 2）。UI と入口だけ用意し、プロバイダ差し替えで動くようにしてある */
export function AiCreatePage() {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setMsg(null);
    try {
      await coloringProvider.generateFromPrompt(text);
    } catch (e) {
      setMsg(e instanceof UserFacingError ? e.message : 'うまく塗り絵を作れませんでした。もう一度試してみてください。');
    }
  };

  return (
    <div className="pb-12">
      <TopBar title="AIで作る" />
      <main className="mx-auto flex max-w-lg flex-col gap-5 px-4">
        <p className="text-ink-soft">描きたい情景を文章で書くと、塗りやすい白黒の線画をつくります。</p>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) submit();
          }}
        >
          <textarea
            id="prompt"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 200))}
            rows={4}
            placeholder="例：桜の木の下で猫が昼寝している"
            className="rounded-2xl border border-line bg-surface p-4 text-[16px] outline-none focus:border-sage-deep"
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setText(ex)} className="rounded-full border border-line px-3 py-2 text-[13px]">
                {ex}
              </button>
            ))}
          </div>
          <Button type="submit" icon="sparkle" disabled={!text.trim()}>
            線画を作る
          </Button>
        </form>
        {msg && (
          <div className="flex flex-col gap-3 rounded-2xl bg-mist p-4">
            <p className="flex items-start gap-2">
              <Icon name="sparkle" size={20} className="mt-0.5 shrink-0" />
              {msg}
            </p>
            <p className="text-[13px] text-ink-soft">いまは写真から塗り絵を作れます。思い出の一枚で試してみませんか。</p>
            <Button variant="soft" icon="camera" onClick={() => navigate('/create')}>
              写真から作る
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
