-- =====================================================================
-- Migration 09: Spam-/Missbrauchs-Haertung der Widerrufsfunktion (Claras Auflagen)
-- Projekt: Admin-Panel-Supabase (dort liegen die shop_*-Funktionen). Voraussetzung: 05_shop_widerruf.sql.
-- Inhalt:
--   1. shop_widerruf_ziel_anzahl(p_secret, p_email): zaehlt versendete Eingangsbestaetigungen an eine Adresse
--      (24 h) und die Widerrufe der letzten Stunde (global, fuer die Telegram-Warnung im Code).
--   2. Globaler Deckel in shop_widerruf_anlegen von 40/h auf 400/h (Widerruf muss immer moeglich sein;
--      die IP-Grenze 5/h bleibt). Als DO-Block-Patch per replace() auf pg_get_functiondef.
--   3. Index fuer die Zaehlung.
-- Risiko: gering. Neue Funktion + Index (kleine Tabelle, kurzer Lock), create or replace einer bestehenden
--         Funktion (Execute-Rechte bleiben erhalten). Kein Datenverlust.
-- Rollback:
--   drop function if exists public.shop_widerruf_ziel_anzahl(text,text);
--   drop index if exists public.shop_widerrufe_bestaetigt_email_idx;
--   Deckel zurueck: DO-Block aus Abschnitt 2 mit vertauschtem replace('>= 400','>= 40') ausfuehren.
-- Hinweis: bewusst kein begin/commit (Orchestrator wendet als Ganzes an). Idempotent.
-- Der Code (lib/shop/server/widerruf.ts) funktioniert auch VOR dieser Migration: fehlt die Funktion, wird
-- die Bestaetigung wie bisher gesendet (Fail-open) - das Limit je Adresse greift erst nach Anwendung.
-- =====================================================================

-- 1. Zaehler je Ziel-Adresse -------------------------------------------------
create index if not exists shop_widerrufe_bestaetigt_email_idx
  on public.shop_widerrufe (pg_catalog.lower(email), bestaetigung_gesendet_am)
  where bestaetigung_gesendet_am is not null;

create or replace function public.shop_widerruf_ziel_anzahl(p_secret text, p_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_jetzt  timestamptz := pg_catalog.now();
  v_anzahl int;
  v_stunde int;
begin
  if not public.shop_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'grund', 'nicht_berechtigt');
  end if;
  if p_email is null or pg_catalog.char_length(p_email) not between 5 and 200 then
    return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
  end if;
  select pg_catalog.count(*) into v_anzahl from public.shop_widerrufe w
   where pg_catalog.lower(w.email) = pg_catalog.lower(p_email)
     and w.bestaetigung_gesendet_am is not null
     and w.bestaetigung_gesendet_am > v_jetzt - interval '24 hours';
  select pg_catalog.count(*) into v_stunde from public.shop_widerrufe w
   where w.eingegangen_am > v_jetzt - interval '1 hour';
  return jsonb_build_object('ok', true, 'anzahl', v_anzahl, 'stunde', v_stunde);
end;
$$;

revoke all on function public.shop_widerruf_ziel_anzahl(text,text) from public;
grant execute on function public.shop_widerruf_ziel_anzahl(text,text) to anon, authenticated;

-- 2. Globalen Deckel anheben (40 -> 400 pro Stunde) --------------------------
do $patch$
declare
  v_def text;
  v_neu text;
  v_alt constant text := '  if v_anzahl >= 40 then';
  v_ziel constant text := '  if v_anzahl >= 400 then';
begin
  v_def := pg_catalog.pg_get_functiondef('public.shop_widerruf_anlegen(text,text,text,text,text,text,text)'::pg_catalog.regprocedure);
  if pg_catalog.strpos(v_def, v_ziel) > 0 then
    raise notice 'shop_widerruf_anlegen: Deckel steht bereits auf 400, nichts zu tun';
    return;
  end if;
  if pg_catalog.strpos(v_def, v_alt) = 0 then
    raise exception 'shop_widerruf_anlegen: Textstelle "%" nicht gefunden - Funktion manuell pruefen', v_alt;
  end if;
  v_neu := pg_catalog.replace(v_def, v_alt, v_ziel);
  execute v_neu;
end
$patch$;

-- 3. Pruefen (nach dem Anwenden): beide Zeilen muessen true liefern
-- select pg_get_functiondef('public.shop_widerruf_anlegen(text,text,text,text,text,text,text)'::regprocedure) like '%>= 400 then%' as deckel_400,
--        has_function_privilege('anon', 'public.shop_widerruf_ziel_anzahl(text,text)', 'execute') as anon_darf;

-- =====================================================================
-- Hinweis zu Namen/Vertrag/Positionen ohne Links: bewusst NUR in TypeScript geprueft
-- (lib/shop/server/validierung.ts). shop_widerruf_anlegen bleibt unveraendert; der DB-Zugriff
-- erfolgt ausschliesslich ueber die Vercel-Route mit Geheimnis.
--
-- Optional, nur nach Alex' Go (Befund zu 02_shop_rpc_storage.sql, siehe Bericht):
-- Speicher-Deckel fuer Anfragebilder. 30 Anfragen/h global x 3 Bilder x 4 MB = bis 360 MB/h Upload-Potenzial;
-- der Free-Plan hat 1 GB Storage. Vorschlag: in shop_anfrage_anlegen nach dem globalen Limit
--   if p_bild_anzahl > 0 and (select coalesce(sum((o.metadata->>'size')::bigint), 0)
--        from storage.objects o where o.bucket_id = 'shop-anfragen') > 400000000 then
--     return jsonb_build_object('ok', false, 'grund', 'ueberlastet');
--   end if;
-- (Funktion hat search_path = '' -> dort bereits schema-qualifiziert; der Zugriff auf storage.objects
--  gelingt als security definer. Alternativ: globales Limit von 30 auf 10 pro Stunde senken.)
-- =====================================================================
