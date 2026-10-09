-- =====================================================================
-- Migration 08: 3D-Druck-Shop - Flag "individuell" je Bestellposition
-- Projekt:   Admin Panel (gvtthlwopumnbuakqvbe, EU) - gleiche DB wie 01-07
-- Datum:     2026-10-09
-- Autor:     Ben (Backend) - NICHT live angewendet, Anwendung durch Orchestrator nach Alex' Go
-- Voraussetzung: 01 bis 07
--
-- Inhalt:
--   1. shop_positionen.individuell boolean not null default false
--   2. shop_bestellung_anlegen (komplett, Basis 02 + Aenderung aus 07 + neu):
--      - Bestellung ist nur individuell, wenn eine Position das Flag 'individuell' = 'true' hat (07)
--      - speichert das Flag je Position
--   3. shop_bestellung_mail_daten (komplett, Basis 05): gibt je Position 'individuell' im JSON aus,
--      Rueckgabe sonst unveraendert
--   Grants wie zuvor (anon/authenticated execute, Schutz durch shop_secret_ok am Funktionsanfang).
--
-- Bestehende Positionen: default false (vor Livegang gibt es keine echten Bestellungen; Testbestellungen
-- mit Wunschtext erscheinen danach in der Mail als Standardware).
-- Hinweis: Wer 02 oder 07 neu einspielt, ueberschreibt diese Funktionen; danach 08 erneut ausfuehren.
--
-- Risiko: alter table add column mit konstantem Default = kurzer Lock, kein Datenverlust.
--         create or replace mit gleicher Signatur: bestehende Execute-Rechte bleiben erhalten.
--
-- Rollback: alter table public.shop_positionen drop column if exists individuell;
--           danach 02 (shop_bestellung_anlegen) + 07-Aenderung und 05 (shop_bestellung_mail_daten) erneut ausfuehren,
--           sonst schlagen die Funktionen fehl (Spalte fehlt).
--
-- Hinweis: bewusst kein begin/commit (Orchestrator wendet als Ganzes an).
-- =====================================================================

alter table public.shop_positionen add column if not exists individuell boolean not null default false;

-- ---------------------------------------------------------------------
-- shop_bestellung_anlegen (vollstaendig)
-- ---------------------------------------------------------------------
create or replace function public.shop_bestellung_anlegen(
  p_secret          text,
  p_ip_hash         text,
  p_idempotenz_key  text,
  p_kunde           jsonb,
  p_einwilligungen  jsonb,
  p_positionen      jsonb,
  p_versand_cent    int,
  p_agb_version     text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jetzt   timestamptz := pg_catalog.now();
  v_summe   bigint := 0;
  v_gesamt  bigint;
  v_indiv   boolean := false;
  v_el      record;
  v_p       jsonb;
  v_vorh    record;
  v_id      uuid;
  v_nummer  text;
  v_anzahl  int;
  v_hash    text;
begin
  if not public.shop_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'grund', 'nicht_berechtigt');
  end if;

  -- ---- Basisvalidierung -------------------------------------------------
  if p_ip_hash is null or char_length(p_ip_hash) not between 16 and 128
     or p_idempotenz_key is null or p_idempotenz_key !~ '^[A-Za-z0-9_-]{16,64}$'
     or p_kunde is null or pg_catalog.jsonb_typeof(p_kunde) <> 'object'
     or p_einwilligungen is null or pg_catalog.jsonb_typeof(p_einwilligungen) <> 'object'
     or p_positionen is null or pg_catalog.jsonb_typeof(p_positionen) <> 'array'
     or pg_catalog.jsonb_array_length(p_positionen) not between 1 and 10
     or p_versand_cent is null or p_versand_cent not between 0 and 10000
     or (p_agb_version is not null and char_length(p_agb_version) > 40)
  then
    return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
  end if;

  if coalesce(p_kunde->>'name', '')    !~ '^[^[:cntrl:]]{2,100}$'
     or coalesce(p_kunde->>'strasse', '') !~ '^[^[:cntrl:]]{3,120}$'
     or coalesce(p_kunde->>'plz', '')     !~ '^[0-9]{5}$'
     or coalesce(p_kunde->>'ort', '')     !~ '^[^[:cntrl:]]{2,80}$'
     or coalesce(p_kunde->>'email', '')   !~ '^[^[:space:][:cntrl:]@,;]+@[^[:space:][:cntrl:]@,;]+\.[^[:space:][:cntrl:]@,;]{2,}$'
     or char_length(p_kunde->>'email') > 200
     or (p_kunde->>'telefon' is not null and p_kunde->>'telefon' !~ '^[^[:cntrl:]]{3,40}$')
     or (p_kunde->>'hinweis' is not null and (char_length(p_kunde->>'hinweis') > 500
                                              or p_kunde->>'hinweis' ~ '[\x01-\x08\x0b\x0c\x0e-\x1f]'))
  then
    return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
  end if;

  -- ---- Positionen validieren + Summe bilden -----------------------------
  for v_el in select value as v, ordinality as n
                from pg_catalog.jsonb_array_elements(p_positionen) with ordinality
  loop
    v_p := v_el.v;
    if pg_catalog.jsonb_typeof(v_p) <> 'object'
       or coalesce(v_p->>'slug', '')   !~ '^[a-z0-9-]{1,80}$'
       or coalesce(v_p->>'name', '')   !~ '^[^[:cntrl:]]{1,120}$'
       or coalesce(v_p->>'menge', '')  !~ '^[0-9]{1,2}$'
       or coalesce(v_p->>'einzelpreis_cent', '') !~ '^[0-9]{1,6}$'
       or (v_p->>'farbe_name' is not null and v_p->>'farbe_name' !~ '^[^[:cntrl:]]{1,60}$')
       or (v_p->>'farbe_hex'  is not null and v_p->>'farbe_hex'  !~ '^#[0-9A-Fa-f]{6}$')
       or (v_p->>'text'       is not null and v_p->>'text'       !~ '^[^[:cntrl:]]{1,40}$')
       or (v_p->>'schrift'    is not null and v_p->>'schrift'    !~ '^[a-z0-9_-]{1,40}$')
       or (v_p ? 'optionen' and pg_catalog.jsonb_typeof(v_p->'optionen') not in ('object','null'))
       or (v_p ? 'optionen' and pg_catalog.octet_length((v_p->'optionen')::text) > 500)
    then
      return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
    end if;
    if (v_p->>'menge')::int not between 1 and 20
       or (v_p->>'einzelpreis_cent')::int not between 1 and 100000
    then
      return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
    end if;
    v_summe := v_summe + (v_p->>'menge')::int * (v_p->>'einzelpreis_cent')::int;
    if coalesce(v_p->>'individuell', 'false') = 'true' then
      v_indiv := true;
    end if;
  end loop;

  v_gesamt := v_summe + p_versand_cent;
  if v_summe <= 0 or v_gesamt > 200000 then
    return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
  end if;

  -- ---- Einwilligungen ----------------------------------------------------
  if coalesce(p_einwilligungen->>'agb', '') <> 'true'
     or (v_indiv and coalesce(p_einwilligungen->>'verzicht', '') <> 'true')
  then
    return jsonb_build_object('ok', false, 'grund', 'einwilligung_fehlt');
  end if;

  -- ---- Idempotenz: gleicher Key liefert dieselbe Bestellung ---------------
  -- Hash ueber Positionen + Kundendaten (jsonb ist normalisiert): gleicher Key, anderer Inhalt = Konflikt
  v_hash := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
              p_positionen::text || '|' || p_kunde::text || '|' || p_versand_cent::text, 'utf8')), 'hex');
  select b.id, b.nummer, b.gesamt_cent, b.anfrage_hash into v_vorh
    from public.shop_bestellungen b
   where b.idempotenz_key = p_idempotenz_key;
  if found then
    if v_vorh.gesamt_cent <> v_gesamt or v_vorh.anfrage_hash is distinct from v_hash then
      return jsonb_build_object('ok', false, 'grund', 'key_konflikt');
    end if;
    return jsonb_build_object('ok', true, 'wiederholt', true, 'id', v_vorh.id,
                              'nummer', v_vorh.nummer, 'gesamt_cent', v_vorh.gesamt_cent);
  end if;

  -- ---- Rate-Limit (je IP-Hash und global) ---------------------------------
  select count(*) into v_anzahl from public.shop_bestellungen b
   where b.ip_hash = p_ip_hash and b.erstellt_am > v_jetzt - interval '1 hour';
  if v_anzahl >= 5 then
    return jsonb_build_object('ok', false, 'grund', 'zu_viele');
  end if;
  select count(*) into v_anzahl from public.shop_bestellungen b
   where b.status = 'neu' and b.zahlungsstatus = 'offen' and b.erstellt_am > v_jetzt - interval '1 hour';
  if v_anzahl >= 40 then
    return jsonb_build_object('ok', false, 'grund', 'ueberlastet');
  end if;

  -- ---- Anlegen ------------------------------------------------------------
  begin
    v_nummer := public.shop_naechste_nummer('bestellung');
    insert into public.shop_bestellungen (
      nummer, idempotenz_key, summe_waren_cent, versand_cent, gesamt_cent,
      kunde_name, kunde_strasse, kunde_plz, kunde_ort, kunde_email, kunde_telefon, kunde_hinweis,
      agb_version, einwilligung_agb_am, einwilligung_widerruf_am, einwilligung_verzicht_am,
      enthaelt_individuell, ip_hash, anfrage_hash
    ) values (
      v_nummer, p_idempotenz_key, v_summe, p_versand_cent, v_gesamt,
      pg_catalog.btrim(p_kunde->>'name'), pg_catalog.btrim(p_kunde->>'strasse'), p_kunde->>'plz',
      pg_catalog.btrim(p_kunde->>'ort'), pg_catalog.lower(pg_catalog.btrim(p_kunde->>'email')),
      nullif(pg_catalog.btrim(coalesce(p_kunde->>'telefon', '')), ''),
      nullif(pg_catalog.btrim(coalesce(p_kunde->>'hinweis', '')), ''),
      p_agb_version, v_jetzt,
      case when p_einwilligungen->>'widerruf' = 'true' then v_jetzt end,
      case when p_einwilligungen->>'verzicht' = 'true' then v_jetzt end,
      v_indiv, p_ip_hash, v_hash
    ) returning id into v_id;
  exception when unique_violation then
    -- parallele Anfrage mit demselben Key hat gewonnen
    select b.id, b.nummer, b.gesamt_cent, b.anfrage_hash into v_vorh
      from public.shop_bestellungen b where b.idempotenz_key = p_idempotenz_key;
    if found and v_vorh.gesamt_cent = v_gesamt and v_vorh.anfrage_hash is not distinct from v_hash then
      return jsonb_build_object('ok', true, 'wiederholt', true, 'id', v_vorh.id,
                                'nummer', v_vorh.nummer, 'gesamt_cent', v_vorh.gesamt_cent);
    end if;
    return jsonb_build_object('ok', false, 'grund', 'key_konflikt');
  end;

  insert into public.shop_positionen (
    bestellung_id, pos, produkt_slug, produkt_name, menge, farbe_name, farbe_hex,
    optionen, personalisierung_text, schrift, einzelpreis_cent, individuell
  )
  select v_id, e.n::int, e.v->>'slug', e.v->>'name', (e.v->>'menge')::int,
         e.v->>'farbe_name', e.v->>'farbe_hex',
         case when pg_catalog.jsonb_typeof(e.v->'optionen') = 'object' then e.v->'optionen' else '{}'::jsonb end,
         e.v->>'text', e.v->>'schrift', (e.v->>'einzelpreis_cent')::int,
         coalesce(e.v->>'individuell', 'false') = 'true'
    from pg_catalog.jsonb_array_elements(p_positionen) with ordinality as e(v, n);

  insert into public.shop_ereignisse (bestellung_id, nummer, art, details)
  values (v_id, v_nummer, 'angelegt',
          jsonb_build_object('gesamt_cent', v_gesamt, 'individuell', v_indiv));

  return jsonb_build_object('ok', true, 'wiederholt', false, 'id', v_id,
                            'nummer', v_nummer, 'gesamt_cent', v_gesamt);
end;
$$;

-- ---------------------------------------------------------------------
-- shop_bestellung_mail_daten (vollstaendig)
-- ---------------------------------------------------------------------
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
     or b.anonymisiert_am is not null then
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
    'name', b.kunde_name, 'strasse', b.kunde_strasse, 'plz', b.kunde_plz, 'ort', b.kunde_ort,
    'email', b.kunde_email, 'positionen', v_pos);
end;
$$;

-- ---------------------------------------------------------------------
-- Grants wie zuvor (idempotent)
-- ---------------------------------------------------------------------
revoke all on function public.shop_bestellung_anlegen(text,text,text,jsonb,jsonb,jsonb,int,text) from public;
revoke all on function public.shop_bestellung_mail_daten(text,uuid) from public;
grant execute on function public.shop_bestellung_anlegen(text,text,text,jsonb,jsonb,jsonb,int,text) to anon, authenticated;
grant execute on function public.shop_bestellung_mail_daten(text,uuid) to anon, authenticated;
