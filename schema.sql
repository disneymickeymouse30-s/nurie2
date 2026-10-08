-- Coloria データベース設計（Supabase / PostgreSQL 想定）
-- Phase 1 では同じ形のデータを端末内の IndexedDB に保存している（src/types.ts と対応）。
-- 画像本体は Storage に置き、DB にはパスだけを保存する。

create table public.users (
  id          uuid primary key references auth.users on delete cascade,
  name        text not null default 'ゲスト',
  email       text,
  avatar      text,
  plan        text not null default 'free' check (plan in ('free', 'premium')),
  created_at  timestamptz not null default now()
);

create table public.coloring_pages (
  id             text primary key,
  title          text not null,
  category       text not null,
  difficulty     smallint not null check (difficulty between 1 and 5),
  minutes        smallint not null default 15,
  popularity     integer not null default 0,
  image_path     text not null,          -- Storage: pages/{id}.svg|png
  thumbnail_path text not null,
  source         text not null check (source in ('sample', 'photo', 'ai')),
  owner_id       uuid references public.users on delete cascade, -- 写真/AI から作った場合の作成者
  is_premium     boolean not null default false,
  created_at     timestamptz not null default now()
);

create table public.artworks (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users on delete cascade,
  coloring_page_id    text not null references public.coloring_pages,
  title               text not null,
  status              text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  favorite            boolean not null default false,
  original_image_path text,      -- 元写真（EXIF 除去済み）。線画とは別に管理
  colored_image_path  text,      -- 完成画像
  progress_path       text,      -- 着色レイヤー PNG（塗り途中の状態）
  used_colors         text[] not null default '{}',
  elapsed_ms          bigint not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  completed_at        timestamptz
);
create index artworks_user_updated on public.artworks (user_id, updated_at desc);

create table public.color_palettes (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users on delete cascade,
  name    text not null,
  colors  text[] not null check (array_length(colors, 1) <= 64)
);

create table public.favorites (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.users on delete cascade,
  coloring_page_id text not null references public.coloring_pages on delete cascade,
  unique (user_id, coloring_page_id)
);

-- AI 変換の利用記録（不正利用対策・月間上限の判定用）
create table public.ai_usage (
  id         bigserial primary key,
  user_id    uuid not null references public.users on delete cascade,
  kind       text not null check (kind in ('photo', 'prompt')),
  created_at timestamptz not null default now()
);
create index ai_usage_user_month on public.ai_usage (user_id, created_at);

-- ===== 行レベルセキュリティ：自分のデータだけ読み書きできる =====
alter table public.users          enable row level security;
alter table public.artworks       enable row level security;
alter table public.color_palettes enable row level security;
alter table public.favorites      enable row level security;
alter table public.coloring_pages enable row level security;
alter table public.ai_usage       enable row level security;

create policy "own profile"   on public.users          for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own artworks"  on public.artworks       for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own palettes"  on public.color_palettes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own favorites" on public.favorites      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "read pages"    on public.coloring_pages for select using (owner_id is null or owner_id = auth.uid());
create policy "own ai usage"  on public.ai_usage       for select using (user_id = auth.uid()); -- 追加はサーバーのみ

-- Storage バケット（例）
--   pages     : 公開読み取り（サンプル線画）
--   user-art  : 非公開。パスは {user_id}/... とし、ポリシーで auth.uid() と一致する場合のみ許可
