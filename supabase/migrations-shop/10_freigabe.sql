-- =====================================================================
-- Migration 10: Freigabe-Flow fuer Bestellungen mit Wunschtext (shop_bestellungen.enthaelt_individuell = true)
-- Projekt: Admin-Panel-Supabase (dort liegen die shop_*-Funktionen). NICHT live angewendet; Anwendung durch den Orchestrator.
-- Voraussetzung: 01-09 (insbesondere 02 shop_secret_ok, 08 mail_daten mit individuell je Position).
-- Ablauf (Alex' Entscheidung): Nach erfolgter Zahlung geht bei Wunschtext-Bestellungen NICHT die Vertragsbestaetigung
--   raus, sondern eine Eingangsbestaetigung. Alex prueft den Wunschtext (signierte Links per Telegram), danach:
--   freigegeben -> Bestaetigungsmail mit 3 PDFs (Vertragsschluss, freigabe_am = Zeitpunkt)
--   abgelehnt   -> Status storniert, Absage-Mail, PayPal-Erstattung (Code), Ergebnis in erstattung_status.
-- Inhalt:
--   1. Neue Spalten + Checks + Index an shop_bestellungen
--   2. shop_ereignisse.art um 'freigabe_erteilt','freigabe_abgelehnt','erstattung' erweitern
--   3. Trigger: bei Zahlung (zahlungsstatus -> bezahlt) und enthaelt_individuell wird freigabe_status = 'offen' gesetzt
--      (shop_zahlung_buchen bleibt UNVERAENDERT; gilt fuer Capture UND Webhook gleich)
--   4. shop_bestellung_suche: zusaetzliche Felder (create or replace, gleiche Signatur)
--   5. shop_bestellung_mail_daten: Vertragsbestaetigung nur, wenn keine Freigabe offen/abgelehnt ist (DB-Sperre)
--   6. Neue RPCs: shop_freigabe_daten, shop_freigabe_setzen, shop_freigabe_erstattung_setzen,
--      shop_freigabe_mail_daten, shop_freigabe_markiere, shop_freigabe_erinnerung_liste
--   7. EXECUTE-Rechte (revoke public; anon/authenticated nur mit Geheimnis in der Funktion)
-- Risiko: gering. Neue nullable Spalten ohne Default (Metadaten-Aenderung, kein Tabellen-Rewrite), kurzer Lock fuer
--   Constraint/Trigger auf kleiner Tabelle, create or replace von 2 bestehenden Funktionen (Execute-Rechte werden
--   unten erneut gesetzt). Kein Datenverlust. Reihenfolge: DIESE MIGRATION VOR dem Code-Deploy anwenden
--   (alter Code + neue DB ist sicher: Wunschtext-Bestellungen bekommen dann gar keine Bestaetigung, kein Fehlversand).
-- Rollback (nur solange keine Freigabe-Daten gebraucht werden):
--   drop trigger if exists shop_bestellungen_bu_freigabe on public.shop_bestellungen;
--   drop function if exists public.shop_tg_freigabe();
--   drop function if exists public.shop_freigabe_daten(text,uuid);
--   drop function if exists public.shop_freigabe_setzen(text,uuid,text,text);
--   drop function if exists public.shop_freigabe_erstattung_setzen(text,uuid,text,text);
--   drop function if exists public.shop_freigabe_mail_daten(text,uuid,text);
--   drop function if exists public.shop_freigabe_markiere(text,uuid,text);
--   drop function if exists public.shop_freigabe_erinnerung_liste(text,int);
--   mail_daten/suche: Funktionen aus 08 bzw. 02 erneut ausfuehren (create or replace).
--   Spalten bleiben harmlos stehen (alter table ... drop column nur bei Bedarf).
-- Hinweis: bewusst kein begin/commit (Orchestrator wendet als Ganzes an). Idempotent.
-- =====================================================================

-- 1. Spalten ----------------------------------------------------------
alter table public.shop_bestellungen
  add column if not exists freigabe_status            text,
  add column if not exists freigabe_angefordert_am    timestamptz,
  add column if not exists freigabe_am                timestamptz,   -- Zeitpunkt der Entscheidung (= Vertragsschluss bei 'freigegeben')
  add column if not exists freigabe_grund             text,          -- Textbaustein-Schluessel bei Ablehnung
  add column if not exists freigabe_erinnert_am       timestamptz,   -- Erinnerung nach > 20 h offen raus
  add column if not exists eingang_gesendet_am        timestamptz,   -- Eingangsbestaetigung an den Kunden raus
  add column if not exists absage_gesendet_am         timestamptz,   -- Absage-Mail an den Kunden raus
  add column if not exists erstattung_status          text,
  add column if not exists erstattung_am              timestamptz,
  add column if not exists erstattung_id              text;          -- PayPal-Refund-ID

alter table public.shop_bestellungen drop constraint if exists shop_bestellungen_freigabe_status_chk;
alter table public.shop_bestellungen add constraint shop_bestellungen_freigabe_status_chk
  check (freigabe_status is null or (enthaelt_individuell and freigabe_status in ('offen', 'freigegeben', 'abgelehnt')));
alter table public.shop_bestellungen drop constraint if exists shop_bestellungen_freigabe_grund_chk;
alter table public.shop_bestellungen add constraint shop_bestellungen_freigabe_grund_chk
  check (freigabe_grund is null or freigabe_grund in ('marke', 'unzulaessig', 'unleserlich', 'sonstiges'));
alter table public.shop_bestellungen drop constraint if exists shop_bestellungen_erstattung_status_chk;
alter table public.shop_bestellungen add constraint shop_bestellungen_erstattung_status_chk
  check (erstattung_status is null or erstattung_status in ('erstattet', 'erstattung_offen'));
alter table public.shop_bestellungen drop constraint if exists shop_bestellungen_erstattung_id_chk;
alter table public.shop_bestellungen add constraint shop_bestellungen_erstattung_id_chk
  check (erstattung_id is null or char_length(erstattung_id) <= 64);

create index if not exists shop_bestellungen_freigabe_offen_idx
  on public.shop_bestellungen (freigabe_angefordert_am)
  where freigabe_status = 'offen';

-- 2. Ereignis-Arten erweitern ------------------------------------------
do $c$
declare
  v_name text;
begin
  for v_name in
    select c.conname from pg_catalog.pg_constraint c
     where c.conrelid = 'public.shop_ereignisse'::pg_catalog.regclass
       and c.contype = 'c'
       and pg_catalog.pg_get_constraintdef(c.oid) like '%zahlung_bezahlt%'
  loop
    execute pg_catalog.format('alter table public.shop_ereignisse drop constraint %I', v_name);
  end loop;
  alter table public.shop_ereignisse add constraint shop_ereignisse_art_check check (art in (
    'angelegt','paypal_order','zahlung_bezahlt','zahlung_ausstehend','zahlung_fehlgeschlagen',
    'betrag_abweichung','doppelte_zahlung','zahlung_nach_storno','statuswechsel',
    'webhook','benachrichtigung','fehler','bereinigung',
    'freigabe_erteilt','freigabe_abgelehnt','erstattung'));
end
$c$;

-- 3. Trigger: Freigabe wird automatisch angefordert, sobald die Zahlung gebucht ist ------
create or replace function public.shop_tg_freigabe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.enthaelt_individuell
     and new.zahlungsstatus = 'bezahlt'
     and old.zahlungsstatus is distinct from 'bezahlt'
     and new.freigabe_status is null
  then
    new.freigabe_status := 'offen';
    new.freigabe_angefordert_am := pg_catalog.now();
  end if;
  return new;
end;
$$;
revoke all on function public.shop_tg_freigabe() from public, anon, authenticated;

drop trigger if exists shop_bestellungen_bu_freigabe on public.shop_bestellungen;
create trigger shop_bestellungen_bu_freigabe before update on public.shop_bestellungen
  for each row execute function public.shop_tg_freigabe();

-- 4. Suche: zusaetzliche Felder (weiterhin OHNE personenbezogene Daten) -----------------
create or replace function public.shop_bestellung_suche(
  p_secret          text,
  p_id              uuid,
  p_paypal_order_id text,
  p_nummer          text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.shop_bestellungen%rowtype;
begin
  if not public.shop_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'grund', 'nicht_berechtigt');
  end if;
  if p_id is not null then
    select * into b from public.shop_bestellungen where id = p_id;
  elsif p_paypal_order_id is not null then
    select * into b from public.shop_bestellungen where paypal_order_id = p_paypal_order_id;
  elsif p_nummer is not null then
    select * into b from public.shop_bestellungen where nummer = p_nummer;
  else
    return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
  end if;
  if b.id is null then
    return jsonb_build_object('ok', false, 'grund', 'unbekannt');
  end if;
  return jsonb_build_object(
    'ok', true, 'id', b.id, 'nummer', b.nummer, 'gesamt_cent', b.gesamt_cent,
    'waehrung', b.waehrung, 'status', b.status, 'zahlungsstatus', b.zahlungsstatus,
    'paypal_order_id', b.paypal_order_id, 'paypal_capture_id', b.paypal_capture_id,
    'enthaelt_individuell', b.enthaelt_individuell,
    'benachrichtigt', b.benachrichtigt_am is not null,
    'bestaetigt', b.bestaetigung_gesendet_am is not null,
    -- Freigabe-Flow (Schluessel ist immer vorhanden, Wert null = kein Freigabe-Flow fuer diese Bestellung)
    'freigabe_status', b.freigabe_status,
    'eingang_gesendet', b.eingang_gesendet_am is not null,
    'absage_gesendet', b.absage_gesendet_am is not null,
    'erstattung_status', b.erstattung_status);
end;
$$;

-- 5. Mail-Daten der Vertragsbestaetigung: DB-seitige Sperre waehrend offener/abgelehnter Freigabe ----
--    (Inhalt wie 08, plus Sperre und freigabe_am). freigabe_status null = Altbestand/Standardbestellung -> wie bisher.
create or replace function public.shop_bestellung_mail_daten(
  p_secret text,
  p_id     uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.shop_bestellungen%rowtype;
  v_pos jsonb;
begin
  if not public.shop_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'grund', 'nicht_berechtigt');
  end if;
  select * into b from public.shop_bestellungen where id = p_id;
  if b.id is null or b.bezahlt_am is null or b.bestaetigung_gesendet_am is not null
     or b.anonymisiert_am is not null
     or (b.freigabe_status is not null and b.freigabe_status <> 'freigegeben') then
    return jsonb_build_object('ok', false, 'grund', 'nichts_zu_tun');
  end if;
  select coalesce(pg_catalog.jsonb_agg(jsonb_build_object(
           'name', p.produkt_name, 'menge', p.menge, 'einzelpreis_cent', p.einzelpreis_cent,
           'farbe', p.farbe_name, 'text', p.personalisierung_text, 'schrift', p.schrift,
           'optionen', p.optionen, 'individuell', p.individuell) order by p.pos), '[]'::jsonb)
    into v_pos
    from public.shop_positionen p where p.bestellung_id = b.id;
  return jsonb_build_object(
    'ok', true, 'nummer', b.nummer, 'gesamt_cent', b.gesamt_cent,
    'summe_waren_cent', b.summe_waren_cent, 'versand_cent', b.versand_cent,
    'individuell', b.enthaelt_individuell, 'bezahlt_am', b.bezahlt_am,
    'erstellt_am', b.erstellt_am, 'capture_id', b.paypal_capture_id,
    'freigabe_am', b.freigabe_am,
    'name', b.kunde_name, 'strasse', b.kunde_strasse, 'plz', b.kunde_plz, 'ort', b.kunde_ort,
    'email', b.kunde_email, 'positionen', v_pos);
end;
$$;

-- 6a. Daten fuer die Freigabe-Seite (OHNE Kundendaten) ---------------------------------
create or replace function public.shop_freigabe_daten(p_secret text, p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  b public.shop_bestellungen%rowtype;
  v_pos jsonb;
begin
  if not public.shop_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'grund', 'nicht_berechtigt');
  end if;
  if p_id is null then
    return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
  end if;
  select * into b from public.shop_bestellungen where id = p_id;
  if b.id is null or b.freigabe_status is null or b.anonymisiert_am is not null then
    return jsonb_build_object('ok', false, 'grund', 'unbekannt');
  end if;
  select coalesce(pg_catalog.jsonb_agg(jsonb_build_object(
           'name', p.produkt_name, 'menge', p.menge, 'farbe', p.farbe_name, 'farbe_hex', p.farbe_hex,
           'text', p.personalisierung_text, 'schrift', p.schrift,
           'optionen', p.optionen, 'individuell', p.individuell) order by p.pos), '[]'::jsonb)
    into v_pos
    from public.shop_positionen p where p.bestellung_id = b.id;
  return jsonb_build_object(
    'ok', true, 'nummer', b.nummer, 'status', b.freigabe_status,
    'angefordert_am', b.freigabe_angefordert_am, 'entschieden_am', b.freigabe_am,
    'grund', b.freigabe_grund, 'positionen', v_pos);
end;
$$;

-- 6b. Entscheidung setzen: atomar, nur bezahlt UND freigabe_status = 'offen'; wiederholter Aufruf aendert nichts ----
--     Rueckgabe: {ok:true, neu, status, grund, erstattung_status, nummer, id}
--     Gruende bei ok:false: nicht_berechtigt | ungueltige_eingabe | nicht_moeglich
create or replace function public.shop_freigabe_setzen(
  p_secret text,
  p_id     uuid,
  p_aktion text,
  p_grund  text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  b     public.shop_bestellungen%rowtype;
  v_neu boolean := false;
begin
  if not public.shop_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'grund', 'nicht_berechtigt');
  end if;
  if p_id is null or p_aktion is null or p_aktion not in ('ok', 'nein')
     or (p_aktion = 'nein' and (p_grund is null or p_grund not in ('marke', 'unzulaessig', 'unleserlich', 'sonstiges')))
  then
    return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
  end if;

  select * into b from public.shop_bestellungen where id = p_id for update;   -- Zeilensperre: parallele Klicks warten
  if b.id is null or b.freigabe_status is null or b.anonymisiert_am is not null then
    return jsonb_build_object('ok', false, 'grund', 'nicht_moeglich');
  end if;

  if b.freigabe_status = 'offen' then
    if b.zahlungsstatus <> 'bezahlt' then
      return jsonb_build_object('ok', false, 'grund', 'nicht_moeglich');
    end if;
    if p_aktion = 'ok' then
      update public.shop_bestellungen
         set freigabe_status = 'freigegeben', freigabe_am = pg_catalog.now()
       where id = b.id;
      insert into public.shop_ereignisse (bestellung_id, nummer, art, details)
      values (b.id, b.nummer, 'freigabe_erteilt', '{}'::jsonb);
    else
      update public.shop_bestellungen
         set freigabe_status = 'abgelehnt', freigabe_am = pg_catalog.now(), freigabe_grund = p_grund,
             status = 'storniert'                       -- Trigger setzt storniert_am/loeschen_nach (30 Tage)
       where id = b.id;
      insert into public.shop_ereignisse (bestellung_id, nummer, art, details)
      values (b.id, b.nummer, 'freigabe_abgelehnt', pg_catalog.jsonb_build_object('grund', p_grund));
    end if;
    v_neu := true;
    select * into b from public.shop_bestellungen where id = p_id;
  end if;

  return jsonb_build_object(
    'ok', true, 'neu', v_neu, 'id', b.id, 'nummer', b.nummer, 'status', b.freigabe_status,
    'grund', b.freigabe_grund, 'erstattung_status', b.erstattung_status);
end;
$$;

-- 6c. Ergebnis der PayPal-Erstattung speichern (nur bei abgelehnter Freigabe; 'erstattet' ueberschreibt 'erstattung_offen') ----
create or replace function public.shop_freigabe_erstattung_setzen(
  p_secret    text,
  p_id        uuid,
  p_status    text,
  p_refund_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.shop_bestellungen%rowtype;
begin
  if not public.shop_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'grund', 'nicht_berechtigt');
  end if;
  if p_id is null or p_status is null or p_status not in ('erstattet', 'erstattung_offen')
     or (p_refund_id is not null and p_refund_id !~ '^[A-Za-z0-9_-]{3,64}$')
  then
    return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
  end if;
  select * into b from public.shop_bestellungen where id = p_id for update;
  if b.id is null or b.freigabe_status is distinct from 'abgelehnt' then
    return jsonb_build_object('ok', false, 'grund', 'nicht_moeglich');
  end if;
  if b.erstattung_status = 'erstattet' then
    return jsonb_build_object('ok', true, 'neu', false, 'erstattung_status', b.erstattung_status);
  end if;
  update public.shop_bestellungen
     set erstattung_status = p_status,
         erstattung_am     = pg_catalog.now(),
         erstattung_id     = coalesce(p_refund_id, erstattung_id),
         zahlungsstatus    = case when p_status = 'erstattet' then 'erstattet' else zahlungsstatus end
   where id = b.id;
  insert into public.shop_ereignisse (bestellung_id, nummer, art, details)
  values (b.id, b.nummer, 'erstattung', pg_catalog.jsonb_build_object('status', p_status));
  return jsonb_build_object('ok', true, 'neu', true, 'erstattung_status', p_status);
end;
$$;

-- 6d. Mail-Daten fuer Eingangsbestaetigung ('eingang') und Absage ('absage'); nur solange noch nicht gesendet ----
create or replace function public.shop_freigabe_mail_daten(p_secret text, p_id uuid, p_art text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  b public.shop_bestellungen%rowtype;
begin
  if not public.shop_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'grund', 'nicht_berechtigt');
  end if;
  if p_id is null or p_art is null or p_art not in ('eingang', 'absage') then
    return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
  end if;
  select * into b from public.shop_bestellungen where id = p_id;
  if b.id is null or b.anonymisiert_am is not null or b.kunde_email is null
     or (p_art = 'eingang' and (b.freigabe_status is distinct from 'offen' or b.eingang_gesendet_am is not null))
     or (p_art = 'absage'  and (b.freigabe_status is distinct from 'abgelehnt' or b.absage_gesendet_am is not null))
  then
    return jsonb_build_object('ok', false, 'grund', 'nichts_zu_tun');
  end if;
  return jsonb_build_object(
    'ok', true, 'nummer', b.nummer, 'gesamt_cent', b.gesamt_cent, 'name', b.kunde_name,
    'email', b.kunde_email, 'grund', b.freigabe_grund, 'bezahlt_am', b.bezahlt_am);
end;
$$;

-- 6e. Flags setzen -----------------------------------------------------------------
create or replace function public.shop_freigabe_markiere(p_secret text, p_id uuid, p_art text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.shop_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'grund', 'nicht_berechtigt');
  end if;
  if p_id is null or p_art is null
     or p_art not in ('eingang_gesendet', 'absage_gesendet', 'erinnert')
  then
    return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
  end if;
  if p_art = 'eingang_gesendet' then
    update public.shop_bestellungen set eingang_gesendet_am = pg_catalog.now()
     where id = p_id and eingang_gesendet_am is null;
  elsif p_art = 'absage_gesendet' then
    update public.shop_bestellungen set absage_gesendet_am = pg_catalog.now()
     where id = p_id and absage_gesendet_am is null;
  else
    update public.shop_bestellungen set freigabe_erinnert_am = pg_catalog.now()
     where id = p_id and freigabe_erinnert_am is null;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- 6f. Offene Freigaben, die laenger als p_stunden warten und noch nicht erinnert wurden (nur id + Nummer) ----
create or replace function public.shop_freigabe_erinnerung_liste(p_secret text, p_stunden int)
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
             and b.freigabe_erinnert_am is null
             and b.freigabe_angefordert_am < pg_catalog.now() - pg_catalog.make_interval(hours => p_stunden)
           order by b.freigabe_angefordert_am
           limit 20) x;
  return jsonb_build_object('ok', true, 'bestellungen', v_liste);
end;
$$;

-- 7. EXECUTE-Rechte -----------------------------------------------------------------
revoke all on function public.shop_bestellung_suche(text,uuid,text,text) from public;
revoke all on function public.shop_bestellung_mail_daten(text,uuid) from public;
revoke all on function public.shop_freigabe_daten(text,uuid) from public;
revoke all on function public.shop_freigabe_setzen(text,uuid,text,text) from public;
revoke all on function public.shop_freigabe_erstattung_setzen(text,uuid,text,text) from public;
revoke all on function public.shop_freigabe_mail_daten(text,uuid,text) from public;
revoke all on function public.shop_freigabe_markiere(text,uuid,text) from public;
revoke all on function public.shop_freigabe_erinnerung_liste(text,int) from public;

grant execute on function public.shop_bestellung_suche(text,uuid,text,text) to anon, authenticated;
grant execute on function public.shop_bestellung_mail_daten(text,uuid) to anon, authenticated;
grant execute on function public.shop_freigabe_daten(text,uuid) to anon, authenticated;
grant execute on function public.shop_freigabe_setzen(text,uuid,text,text) to anon, authenticated;
grant execute on function public.shop_freigabe_erstattung_setzen(text,uuid,text,text) to anon, authenticated;
grant execute on function public.shop_freigabe_mail_daten(text,uuid,text) to anon, authenticated;
grant execute on function public.shop_freigabe_markiere(text,uuid,text) to anon, authenticated;
grant execute on function public.shop_freigabe_erinnerung_liste(text,int) to anon, authenticated;
-- Spalten an shop_bestellungen: keine neuen Grants noetig (Tabellenrechte aus 01 gelten: authenticated select/update/delete).

-- 8. Pruefen (nach dem Anwenden), alle Zeilen muessen true liefern:
-- select has_function_privilege('anon', 'public.shop_freigabe_setzen(text,uuid,text,text)', 'execute') as anon_setzen,
--        not has_function_privilege('anon', 'public.shop_tg_freigabe()', 'execute') as trigger_fn_gesperrt,
--        exists (select 1 from pg_trigger where tgname = 'shop_bestellungen_bu_freigabe') as trigger_da,
--        pg_get_functiondef('public.shop_bestellung_mail_daten(text,uuid)'::regprocedure) like '%freigabe_status%' as sperre_da;
-- Funktionstest ohne Geheimnis (muss {"ok": false, "grund": "nicht_berechtigt"} liefern):
-- select public.shop_freigabe_setzen('x', null, 'ok', null);
