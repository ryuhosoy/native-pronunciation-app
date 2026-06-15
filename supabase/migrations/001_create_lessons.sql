create table if not exists public.lessons (
  id integer primary key,
  casual text not null,
  spoken_text text not null,
  breakdowns jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lessons_casual_idx on public.lessons (casual);

alter table public.lessons enable row level security;

drop policy if exists "Allow public read access" on public.lessons;
create policy "Allow public read access"
  on public.lessons
  for select
  using (true);
