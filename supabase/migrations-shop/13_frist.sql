-- =====================================================================
-- Migration 13: Frist-Automatik Freigabe (Wunschtext muss binnen 24 h nach Zahlung entschieden sein)
-- Projekt: Admin-Panel-Supabase (dort liegen die shop_*-Funktionen). NICHT live angewendet; Anwendung durch den Orchestrator.
-- Voraussetzung: 10_freigabe.sql (und 12_mail_claim.sql) sind angewendet. Idempotent, kein begin/commit.
-- Inhalt:
--   1. shop_bestellungen_freigabe_grund_chk um 'frist' erweitern
--   2. shop_freigabe_setzen: p_grund-Liste um 'frist' + DB-Sperre: 'ok' nach 23,5 h -> {ok:false, grund:'frist_abgelaufen'}
--      (Patch per replace auf pg_get_functiondef, bricht mit Fehler ab, wenn die Textstelle nicht gefunden wird)
--   3. Neue RPC shop_freigabe_frist_liste(p_secret, p_stunden): offene Freigaben aelter als p_stunden (ohne Erinnerungs-Bedingung)
-- Risiko: gering. Kurzer Lock auf shop_bestellungen fuer den Check (kleine Tabelle, bestehende Werte bleiben gueltig),
--   create or replace einer Funktion (Rechte bleiben). Kein Datenverlust.
-- Reihenfolge: VOR dem Code-Deploy anwenden. Alter Code + neue DB ist sicher (neuer Grund wird nur vom neuen Code gesendet).
-- Rollback: Check wieder ohne 'frist' (vorher: update ... set freigabe_grund = 'sonstiges' where freigabe_grund = 'frist'),
--   shop_freigabe_setzen aus 10_freigabe.sql erneut ausfuehren, drop function if exists public.shop_freigabe_frist_liste(text,int);
-- =====================================================================

-- 1. Check erweitern -------------------------------------------------------
alter table public.shop_bestellungen drop constraint if exists shop_bestellungen_freigabe_grund_chk;
alter table public.shop_bestellungen add constraint shop_bestellungen_freigabe_grund_chk
  check (freigabe_grund is null or freigabe_grund in ('marke', 'unzulaessig', 'unleserlich', 'sonstiges', 'frist'));

-- 2. shop_freigabe_setzen patchen --------------------------------------------
do $p$
declare
  v_def  text;
  v_neu  text;
  v_alt1 constant text := $a$p_grund not in ('marke', 'unzulaessig', 'unleserlich', 'sonstiges')$a$;
  v_neu1 constant text := $a$p_grund not in ('marke', 'unzulaessig', 'unleserlich', 'sonstiges', 'frist')$a$;
  v_alt2 constant text := $a$if p_aktion = 'ok' then$a$;
  v_neu2 constant text := $a$if p_aktion = 'ok' and b.freigabe_angefordert_am < pg_catalog.now() - interval '23 hours 30 minutes' then
      return jsonb_build_object('ok', false, 'grund', 'frist_abgelaufen');   -- Frist-Sperre (Migration 13)
    end if;
    if p_aktion = 'ok' then$a$;
begin
  v_def := pg_catalog.pg_get_functiondef('public.shop_freigabe_setzen(text,uuid,text,text)'::pg_catalog.regprocedure);
  v_neu := v_def;
  if pg_catalog.strpos(v_neu, '''frist''') = 0 then
    if pg_catalog.strpos(v_neu, v_alt1) = 0 then
      raise exception 'Migration 13: Textstelle p_grund-Liste nicht gefunden (shop_freigabe_setzen von Hand pruefen)';
    end if;
    v_neu := pg_catalog.replace(v_neu, v_alt1, v_neu1);
  end if;
  if pg_catalog.strpos(v_neu, 'frist_abgelaufen') = 0 then
    if pg_catalog.strpos(v_neu, v_alt2) = 0 then
      raise exception 'Migration 13: Textstelle "if p_aktion = ok" nicht gefunden (shop_freigabe_setzen von Hand pruefen)';
    end if;
    v_neu := pg_catalog.replace(v_neu, v_alt2, v_neu2);
  end if;
  if v_neu is distinct from v_def then
    execute v_neu;
  end if;
end
$p$;

-- 3. Offene Freigaben aelter als p_stunden (nur id + Nummer), fuer die automatische Absage im Cron ----
create or replace function public.shop_freigabe_frist_liste(p_secret text, p_stunden int)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_liste jsonb;
begin
  if not public.shop_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'grund', 'nicht_berechtigt');
  end if;
  if p_stunden is null or p_stunden not between 1 and 168 then
    return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
  end if;
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('id', x.id, 'nummer', x.nummer)), '[]'::jsonb)
    into v_liste
    from (select b.id, b.nummer from public.shop_bestellungen b
           where b.freigabe_status = 'offen'
             and b.zahlungsstatus = 'bezahlt'
             and b.freigabe_angefordert_am < pg_catalog.now() - pg_catalog.make_interval(hours => p_stunden)
           order by b.freigabe_angefordert_am
           limit 20) x;
  return jsonb_build_object('ok', true, 'bestellungen', v_liste);
end;
$$;

revoke all on function public.shop_freigabe_frist_liste(text,int) from public;
grant execute on function public.shop_freigabe_frist_liste(text,int) to anon, authenticated;

-- 4. Pruefen (nach dem Anwenden), alle Zeilen muessen true liefern:
-- select pg_get_functiondef('public.shop_freigabe_setzen(text,uuid,text,text)'::regprocedure) like '%frist_abgelaufen%' as sperre_da,
--        pg_get_functiondef('public.shop_freigabe_setzen(text,uuid,text,text)'::regprocedure) like '%''frist''%' as grund_da,
--        has_function_privilege('anon', 'public.shop_freigabe_frist_liste(text,int)', 'execute') as liste_da;
-- Funktionstest ohne Geheimnis (muss {"ok": false, "grund": "nicht_berechtigt"} liefern):
-- select public.shop_freigabe_frist_liste('x', 23);
