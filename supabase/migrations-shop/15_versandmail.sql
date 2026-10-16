-- =====================================================================
-- Migration 15: Versandmail "Deine Bestellung ist unterwegs" (Panel: Bestellungen > "Als versendet markieren")
-- Projekt: SHOP-Datenbank (dort liegen shop_bestellungen und die shop_*-RPCs; nach der DB-Trennung das PixlDrop-Projekt).
-- NICHT live angewendet. Voraussetzung: 01 (Tabellen, Trigger shop_tg_bestellung), 10_freigabe.sql, 12_mail_claim.sql. Idempotent, kein begin/commit.
-- Inhalt:
--   1. Neue Spalte shop_bestellungen.versandmail_gesendet_am (timestamptz, null = Mail noch nicht raus / fehlgeschlagen).
--      Bereits vorhanden und wiederverwendet: status ('versendet'), versendet_am + loeschen_nach (Trigger shop_tg_bestellung
--      setzt sie beim Wechsel auf 'versendet'), sendungsnummer (Check <= 60 Zeichen).
--   2. shop_versand_markieren(p_secret, p_id, p_sendungsnummer): prueft die Voraussetzungen (bezahlt, nicht storniert/abgelehnt/
--      erstattet, Freigabe nicht offen, nicht anonymisiert), setzt Status 'versendet' (nur aus neu|bezahlt|in_arbeit|gedruckt) und die
--      Sendungsnummer (solange noch keine Versandmail raus ist) und liefert die Mail-Daten. Idempotent.
--   3. shop_versandmail_claim(p_secret, p_id, p_zurueck): setzt versandmail_gesendet_am atomar VOR dem Versand (nur der erste
--      Aufrufer bekommt neu=true); p_zurueck=true nimmt den Claim nach fehlgeschlagenem Versand zurueck.
-- Grants: wie bei den anderen shop_*-RPCs (execute nur anon/authenticated, public entzogen; der Zugriff laeuft ueber p_secret).
--   Keine neue Tabelle, daher keine neuen Tabellen-Grants. Die Spalte erbt die bestehenden Tabellenrechte (RLS unveraendert).
-- Risiko: gering. add column ohne Default = nur Katalog-Aenderung (kurzer Lock). Kein Datenverlust. Alter Code laeuft ohne die Migration weiter
--   (die neue Route antwortet dann mit 503 db, nichts anderes aendert sich).
-- Reihenfolge: VOR dem Deploy von Shop UND Panel anwenden (das Panel liest die Spalte tolerant, der Shop braucht die RPCs).
-- Rollback:
--   drop function if exists public.shop_versandmail_claim(text,uuid,boolean);
--   drop function if exists public.shop_versand_markieren(text,uuid,text);
--   alter table public.shop_bestellungen drop column if exists versandmail_gesendet_am;
-- Pruefen (nach dem Anwenden):
--   select public.shop_versand_markieren('x', null, null);   -> {"ok": false, "grund": "nicht_berechtigt"}
-- =====================================================================

alter table public.shop_bestellungen add column if not exists versandmail_gesendet_am timestamptz;

-- ---------------------------------------------------------------------
-- 1. Als versendet markieren + Mail-Daten liefern
-- ---------------------------------------------------------------------
create or replace function public.shop_versand_markieren(
  p_secret          text,
  p_id              uuid,
  p_sendungsnummer  text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  b    public.shop_bestellungen%rowtype;
  v_nr text;
begin
  if not public.shop_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'grund', 'nicht_berechtigt');
  end if;
  v_nr := nullif(pg_catalog.btrim(coalesce(p_sendungsnummer, '')), '');
  if p_id is null or (v_nr is not null and v_nr !~ '^[A-Za-z0-9]{6,40}$') then
    return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
  end if;

  select * into b from public.shop_bestellungen where id = p_id for update;
  if b.id is null then
    return jsonb_build_object('ok', false, 'grund', 'nicht_gefunden');
  end if;
  if b.zahlungsstatus <> 'bezahlt' or b.bezahlt_am is null then
    return jsonb_build_object('ok', false, 'grund', 'nicht_bezahlt');
  end if;
  if b.anonymisiert_am is not null or b.kunde_email is null then
    return jsonb_build_object('ok', false, 'grund', 'anonymisiert');
  end if;
  if b.status = 'storniert' or b.freigabe_status = 'abgelehnt' then
    return jsonb_build_object('ok', false, 'grund', 'storniert');
  end if;
  if b.freigabe_status = 'offen' then
    return jsonb_build_object('ok', false, 'grund', 'freigabe_offen');
  end if;
  if b.erstattung_status = 'erstattet' or coalesce(b.erstattet_cent, 0) >= b.gesamt_cent then
    return jsonb_build_object('ok', false, 'grund', 'erstattet');
  end if;

  -- Solange keine Versandmail raus ist, darf Status und Sendungsnummer gesetzt/korrigiert werden.
  -- (Status-Trigger setzt versendet_am und loeschen_nach; 'abgeschlossen' bleibt unveraendert.)
  if b.versandmail_gesendet_am is null then
    update public.shop_bestellungen
       set status = case when status in ('neu', 'bezahlt', 'in_arbeit', 'gedruckt') then 'versendet' else status end,
           sendungsnummer = coalesce(v_nr, sendungsnummer)
     where id = p_id
    returning * into b;
  end if;

  return jsonb_build_object(
    'ok', true, 'nummer', b.nummer, 'name', b.kunde_name, 'email', b.kunde_email,
    'strasse', b.kunde_strasse, 'plz', b.kunde_plz, 'ort', b.kunde_ort,
    'versandart', b.versandart, 'sendungsnummer', b.sendungsnummer,
    'status', b.status, 'versendet_am', b.versendet_am,
    'mail_schon', b.versandmail_gesendet_am is not null);
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Claim fuer die Versandmail (genau einmal je Bestellung)
-- ---------------------------------------------------------------------
create or replace function public.shop_versandmail_claim(
  p_secret   text,
  p_id       uuid,
  p_zurueck  boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n int := 0;
begin
  if not public.shop_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'grund', 'nicht_berechtigt');
  end if;
  if p_id is null then
    return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
  end if;
  if coalesce(p_zurueck, false) then
    update public.shop_bestellungen set versandmail_gesendet_am = null where id = p_id;
    return jsonb_build_object('ok', true);
  end if;
  update public.shop_bestellungen set versandmail_gesendet_am = pg_catalog.now()
   where id = p_id and versandmail_gesendet_am is null and anonymisiert_am is null
     and status in ('versendet', 'abgeschlossen') and zahlungsstatus = 'bezahlt';
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'neu', v_n > 0);
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Rechte wie bei den uebrigen shop_*-RPCs
-- ---------------------------------------------------------------------
revoke all on function public.shop_versand_markieren(text,uuid,text) from public;
revoke all on function public.shop_versandmail_claim(text,uuid,boolean) from public;
grant execute on function public.shop_versand_markieren(text,uuid,text) to anon, authenticated;
grant execute on function public.shop_versandmail_claim(text,uuid,boolean) to anon, authenticated;
