-- Letzter erfolgreich gelieferter TikTok-Wert (Windsor), als Fallback wenn Windsor down ist.
-- Genau eine Zeile (id = 1). Lesen: öffentlich (Zahlen stehen ohnehin auf der Website).
-- Schreiben: nur service_role (serverseitig in /api/tiktok-stats), nie anon.
create table if not exists public.pixldrop_tiktok_stats_cache (
  id int primary key default 1 check (id = 1),
  followers bigint,
  likes bigint,
  updated_at timestamptz not null default now()
);

alter table public.pixldrop_tiktok_stats_cache enable row level security;

drop policy if exists "tiktok_stats_cache_public_read" on public.pixldrop_tiktok_stats_cache;
create policy "tiktok_stats_cache_public_read"
  on public.pixldrop_tiktok_stats_cache for select
  to anon, authenticated
  using (true);

-- Explizite Grants (ab 30.10.2026 Pflicht für neue public-Tabellen)
grant select on public.pixldrop_tiktok_stats_cache to anon, authenticated;
grant select, insert, update on public.pixldrop_tiktok_stats_cache to service_role;

-- Startwert aus Metricool (Stand 2026-10-05)
insert into public.pixldrop_tiktok_stats_cache (id, followers, likes, updated_at)
values (1, 9471, 136321, '2026-10-05')
on conflict (id) do nothing;
