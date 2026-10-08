-- =====================================================================
-- Migration 06: 3D-Druck-Shop - Kontaktformular (nur Rate-Limit-Zaehler)
-- Projekt:   Admin Panel (gvtthlwopumnbuakqvbe, EU) - gleiche DB wie 01-05
-- Datum:     2026-10-08
-- Autor:     Ben (Backend) - NICHT live angewendet, Anwendung durch Orchestrator nach Alex Go
-- Voraussetzung: 01 (shop_secret_ok)
--
-- Inhalt: Tabelle shop_kontakte (NUR ip_hash + Zeit, KEIN Nachrichteninhalt, keine Kundendaten)
--         und RPC shop_kontakt_zaehlen (Geheimnis-Pruefung, Rate-Limit je IP-Hash und global).
--         Die Nachricht selbst geht nur per Mail an Alex und wird nicht gespeichert.
--
-- Risiko: reine Neuanlage, kein Datenverlust, keine Locks. Eintraege werden nach 1 Tag geloescht.
-- Erwarteter Advisor-Hinweis wie bei 02/05: anon_security_definer fuer shop_kontakt_zaehlen
-- (Schutz: Geheimnis-Pruefung am Anfang, Validierung, kein Lesezugriff auf Daten).
--
-- Rollback:
--   drop function if exists public.shop_kontakt_zaehlen(text,text);
--   drop table if exists public.shop_kontakte;
-- Hinweis: bewusst kein begin/commit (Orchestrator wendet als Ganzes an).
-- =====================================================================

create table if not exists public.shop_kontakte (
  id          bigint generated always as identity primary key,
  ip_hash     text not null check (char_length(ip_hash) between 16 and 128),
  erstellt_am timestamptz not null default now()
);

create index if not exists shop_kontakte_ip_idx   on public.shop_kontakte (ip_hash, erstellt_am desc);
create index if not exists shop_kontakte_zeit_idx on public.shop_kontakte (erstellt_am desc);

alter table public.shop_kontakte enable row level security;

drop policy if exists auth_only on public.shop_kontakte;
create policy auth_only on public.shop_kontakte for all to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

-- Grants (Pflicht ab 30.10.2026): anon NICHTS; Admin Panel darf lesen/aufraeumen; Schreiben nur ueber RPC
revoke all on public.shop_kontakte from public, anon, authenticated;
grant select, delete on public.shop_kontakte to authenticated;
grant all on public.shop_kontakte to service_role;

-- Rueckgabe: {ok:true} | {ok:false, grund: nicht_berechtigt | ungueltige_eingabe | zu_viele | ueberlastet}
create or replace function public.shop_kontakt_zaehlen(
  p_secret  text,
  p_ip_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jetzt  timestamptz := pg_catalog.now();
  v_anzahl int;
begin
  if not public.shop_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'grund', 'nicht_berechtigt');
  end if;
  if p_ip_hash is null or char_length(p_ip_hash) not between 16 and 128 then
    return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
  end if;

  delete from public.shop_kontakte k where k.erstellt_am < v_jetzt - interval '1 day';

  select count(*) into v_anzahl from public.shop_kontakte k
   where k.ip_hash = p_ip_hash and k.erstellt_am > v_jetzt - interval '1 hour';
  if v_anzahl >= 3 then
    return jsonb_build_object('ok', false, 'grund', 'zu_viele');
  end if;
  select count(*) into v_anzahl from public.shop_kontakte k
   where k.erstellt_am > v_jetzt - interval '1 hour';
  if v_anzahl >= 30 then
    return jsonb_build_object('ok', false, 'grund', 'ueberlastet');
  end if;

  insert into public.shop_kontakte (ip_hash, erstellt_am) values (p_ip_hash, v_jetzt);
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.shop_kontakt_zaehlen(text,text) from public;
grant execute on function public.shop_kontakt_zaehlen(text,text) to anon, authenticated;
