-- =====================================================================
-- Migration 05/05: 3D-Druck-Shop - elektronische Widerrufsfunktion (§ 356a BGB)
--                  + Mail-Daten fuer die Bestellbestaetigung erweitert
-- Projekt:   Admin Panel (gvtthlwopumnbuakqvbe, EU) - gleiche DB wie 01-04
-- Datum:     2026-10-08
-- Autor:     Ben (Backend) - NICHT live angewendet, Anwendung durch Orchestrator nach Alex' Go
-- Voraussetzung: 01 bis 04 (shop_secret_ok, shop_nummern, shop_konst, shop_bestellungen)
--
-- Inhalt:
--   1. shop_nummern.widerruf_zaehler + shop_naechste_nummer('widerruf') -> WR-JJJJ-NNNN
--   2. Tabelle shop_widerrufe (RLS an, anon KEIN Zugriff, Admin Panel: select/update/delete)
--   3. RPC shop_widerruf_anlegen (Zeitstempel now() serverseitig = Zugang, Abgleich, Rate-Limit, Dedup)
--   4. RPC shop_widerruf_markiere (Eingangsbestaetigung / Benachrichtigung vermerken)
--   5. shop_bestellung_mail_daten (gleiche Signatur) liefert zusaetzlich erstellt_am + capture_id
--
-- Risiko: Neuanlage + 3 "create or replace" bestehender Funktionen (shop_naechste_nummer,
--         shop_bestellung_mail_daten: nur additive Aenderung, Rueckgabe bleibt abwaertskompatibel;
--         bestehende Execute-Rechte bleiben bei create or replace erhalten).
--         Kein Datenverlust, keine langen Locks (alter table add column mit Default = kurz).
--
-- Erwarteter Advisor-Hinweis wie bei 02: anon_security_definer fuer die zwei neuen shop_widerruf_*
-- Funktionen (Schutz: Geheimnis-Pruefung am Anfang, Validierung, Rate-Limit).
--
-- Rollback:
--   drop function if exists public.shop_widerruf_anlegen(text,text,text,text,text,text,text);
--   drop function if exists public.shop_widerruf_markiere(text,uuid,text);
--   drop table if exists public.shop_widerrufe;
--   alter table public.shop_nummern drop column if exists widerruf_zaehler;
--   -- shop_naechste_nummer und shop_bestellung_mail_daten: Definition aus 02 erneut ausfuehren.
--
-- Hinweis: bewusst kein begin/commit (Orchestrator wendet als Ganzes an).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Nummernkreis fuer Widerrufe
-- ---------------------------------------------------------------------
alter table public.shop_nummern add column if not exists widerruf_zaehler int not null default 0;

create or replace function public.shop_naechste_nummer(p_art text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jahr int := pg_catalog.date_part('year', pg_catalog.now() at time zone 'Europe/Berlin')::int;
  v_n    int;
begin
  if p_art = 'bestellung' then
    insert into public.shop_nummern (jahr, bestell_zaehler) values (v_jahr, 1)
    on conflict (jahr) do update set bestell_zaehler = public.shop_nummern.bestell_zaehler + 1
    returning bestell_zaehler into v_n;
    return 'PD-' || v_jahr::text || '-' || pg_catalog.lpad(v_n::text, 4, '0');
  elsif p_art = 'anfrage' then
    insert into public.shop_nummern (jahr, anfrage_zaehler) values (v_jahr, 1)
    on conflict (jahr) do update set anfrage_zaehler = public.shop_nummern.anfrage_zaehler + 1
    returning anfrage_zaehler into v_n;
    return 'PA-' || v_jahr::text || '-' || pg_catalog.lpad(v_n::text, 4, '0');
  elsif p_art = 'widerruf' then
    insert into public.shop_nummern (jahr, widerruf_zaehler) values (v_jahr, 1)
    on conflict (jahr) do update set widerruf_zaehler = public.shop_nummern.widerruf_zaehler + 1
    returning widerruf_zaehler into v_n;
    return 'WR-' || v_jahr::text || '-' || pg_catalog.lpad(v_n::text, 4, '0');
  end if;
  raise exception 'unbekannte Nummernart';
end;
$$;
revoke all on function public.shop_naechste_nummer(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. shop_widerrufe
--    Die Erklaerung (Name, Vertragsangabe, Positionen, E-Mail) bleibt als Nachweis erhalten.
--    "abgleich" ist NUR intern (Alex): passt | name_passt | abweichend | nicht_gefunden.
--    Es wird nie an den Besucher zurueckgegeben (kein Hinweis, ob eine Bestellnummer existiert).
-- ---------------------------------------------------------------------
create table if not exists public.shop_widerrufe (
  id                       uuid primary key default gen_random_uuid(),
  nummer                   text not null unique check (nummer ~ '^WR-[0-9]{4}-[0-9]{4,}$'),
  eingegangen_am           timestamptz not null default now(),   -- Zugang gemaess § 356a Abs. 5 BGB
  name                     text not null check (char_length(name) between 2 and 100),
  vertrag_angabe           text not null check (char_length(vertrag_angabe) between 3 and 200),
  bestellnummer            text check (bestellnummer is null or bestellnummer ~ '^PD-[0-9]{4}-[0-9]{4,}$'),
  bestellung_id            uuid references public.shop_bestellungen(id) on delete set null,
  abgleich                 text not null check (abgleich in ('passt','name_passt','abweichend','nicht_gefunden')),
  ganzer_vertrag           boolean not null,
  positionen_text          text check (positionen_text is null or char_length(positionen_text) <= 500),
  check (ganzer_vertrag = (positionen_text is null)),
  email                    text not null check (char_length(email) between 5 and 200),
  status                   text not null default 'neu' check (status in ('neu','in_bearbeitung','erledigt')),
  bestaetigung_gesendet_am timestamptz,                          -- Eingangsbestaetigung (Abs. 4) raus
  benachrichtigt_am        timestamptz,                          -- Telegram/Mail an Alex raus
  notizen                  text check (notizen is null or char_length(notizen) <= 4000),
  ip_hash                  text,                                 -- Spam-Schutz, wird nach frist_ip_tage entfernt
  aktualisiert_am          timestamptz not null default now()
);

create index if not exists shop_widerrufe_eingang_idx    on public.shop_widerrufe (eingegangen_am desc);
create index if not exists shop_widerrufe_ip_idx         on public.shop_widerrufe (ip_hash, eingegangen_am desc) where ip_hash is not null;
create index if not exists shop_widerrufe_bestellung_idx on public.shop_widerrufe (bestellung_id) where bestellung_id is not null;

create or replace function public.shop_tg_widerruf()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.aktualisiert_am := pg_catalog.now();
  return new;
end;
$$;
revoke all on function public.shop_tg_widerruf() from public, anon, authenticated;

drop trigger if exists shop_widerrufe_bu on public.shop_widerrufe;
create trigger shop_widerrufe_bu before update on public.shop_widerrufe
  for each row execute function public.shop_tg_widerruf();

alter table public.shop_widerrufe enable row level security;

drop policy if exists auth_only on public.shop_widerrufe;
create policy auth_only on public.shop_widerrufe for all to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

-- Grants (Pflicht ab 30.10.2026): anon NICHTS, Admin Panel liest/bearbeitet/loescht, kein INSERT (nur ueber RPC)
revoke all on public.shop_widerrufe from public, anon, authenticated;
grant select, update, delete on public.shop_widerrufe to authenticated;
grant all on public.shop_widerrufe to service_role;

-- ---------------------------------------------------------------------
-- 3. Widerruf anlegen
--    Rueckgabe: {ok, id, nummer, eingegangen_am, wiederholt, bestaetigt, abgleich}
--    Gruende:   nicht_berechtigt | ungueltige_eingabe | zu_viele | ueberlastet
--    Die Antwort an den Besucher wird im TypeScript-Code gebildet und enthaelt "abgleich" NICHT.
-- ---------------------------------------------------------------------
create or replace function public.shop_widerruf_anlegen(
  p_secret        text,
  p_ip_hash       text,
  p_name          text,
  p_vertrag       text,
  p_bestellnummer text,
  p_positionen    text,
  p_email         text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jetzt   timestamptz := pg_catalog.now();
  v_email   text;
  v_name    text;
  v_pos     text;
  v_vorh    record;
  v_best    record;
  v_best_id uuid;
  v_abgleich text;
  v_anzahl  int;
  v_id      uuid;
  v_nummer  text;
begin
  if not public.shop_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'grund', 'nicht_berechtigt');
  end if;

  -- ---- Validierung (Spiegel der TypeScript-Regeln) ------------------------
  if p_ip_hash is null or char_length(p_ip_hash) not between 16 and 128
     or coalesce(p_name, '')    !~ '^[^[:cntrl:]]{2,100}$'
     or coalesce(p_vertrag, '') !~ '^[^[:cntrl:]]{3,200}$'
     or (p_bestellnummer is not null and p_bestellnummer !~ '^PD-[0-9]{4}-[0-9]{4,}$')
     or coalesce(p_email, '')   !~ '^[^[:space:][:cntrl:]@,;]+@[^[:space:][:cntrl:]@,;]+\.[^[:space:][:cntrl:]@,;]{2,}$'
     or char_length(p_email) > 200
     or (p_positionen is not null and (char_length(p_positionen) not between 1 and 500
                                       or p_positionen ~ '[\x01-\x08\x0b\x0c\x0e-\x1f]'))
  then
    return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
  end if;

  v_name  := pg_catalog.btrim(p_name);
  v_email := pg_catalog.lower(pg_catalog.btrim(p_email));
  v_pos   := nullif(pg_catalog.btrim(coalesce(p_positionen, '')), '');

  -- IP-Hashes alter Widerrufe entfernen (Datensparsamkeit, gleiche Frist wie bei Bestellungen)
  update public.shop_widerrufe w set ip_hash = null
   where w.ip_hash is not null
     and w.eingegangen_am < v_jetzt - pg_catalog.make_interval(days => public.shop_konst('frist_ip_tage'));

  -- ---- Dedup (Doppelklick): gleiche Erklaerung innerhalb 10 Minuten = dieselbe -----
  select w.id, w.nummer, w.eingegangen_am, w.bestaetigung_gesendet_am, w.abgleich into v_vorh
    from public.shop_widerrufe w
   where w.email = v_email
     and w.vertrag_angabe = pg_catalog.btrim(p_vertrag)
     and w.positionen_text is not distinct from v_pos
     and w.eingegangen_am > v_jetzt - interval '10 minutes'
   order by w.eingegangen_am desc
   limit 1;
  if found then
    return jsonb_build_object('ok', true, 'wiederholt', true, 'id', v_vorh.id, 'nummer', v_vorh.nummer,
                              'eingegangen_am', v_vorh.eingegangen_am,
                              'bestaetigt', v_vorh.bestaetigung_gesendet_am is not null,
                              'abgleich', v_vorh.abgleich);
  end if;

  -- ---- Rate-Limit (je IP-Hash und global) ---------------------------------
  select count(*) into v_anzahl from public.shop_widerrufe w
   where w.ip_hash = p_ip_hash and w.eingegangen_am > v_jetzt - interval '1 hour';
  if v_anzahl >= 5 then
    return jsonb_build_object('ok', false, 'grund', 'zu_viele');
  end if;
  select count(*) into v_anzahl from public.shop_widerrufe w
   where w.eingegangen_am > v_jetzt - interval '1 hour';
  if v_anzahl >= 40 then
    return jsonb_build_object('ok', false, 'grund', 'ueberlastet');
  end if;

  -- ---- Grober Abgleich mit der Bestellung (nur intern) --------------------
  v_abgleich := 'nicht_gefunden';
  if p_bestellnummer is not null then
    select b.id, b.kunde_email, b.kunde_name into v_best
      from public.shop_bestellungen b
     where b.nummer = p_bestellnummer and b.anonymisiert_am is null;
    if found then
      v_best_id := v_best.id;
      if pg_catalog.lower(v_best.kunde_email) = v_email then
        v_abgleich := 'passt';
      elsif pg_catalog.lower(pg_catalog.btrim(v_best.kunde_name)) = pg_catalog.lower(v_name) then
        v_abgleich := 'name_passt';
      else
        v_abgleich := 'abweichend';
      end if;
    end if;
  end if;

  -- ---- Anlegen: Zeitstempel = now() der Datenbank --------------------------
  v_nummer := public.shop_naechste_nummer('widerruf');
  insert into public.shop_widerrufe (
    nummer, eingegangen_am, name, vertrag_angabe, bestellnummer, bestellung_id, abgleich,
    ganzer_vertrag, positionen_text, email, ip_hash
  ) values (
    v_nummer, v_jetzt, v_name, pg_catalog.btrim(p_vertrag), p_bestellnummer,
    v_best_id, v_abgleich,
    v_pos is null, v_pos, v_email, p_ip_hash
  ) returning id into v_id;

  return jsonb_build_object('ok', true, 'wiederholt', false, 'id', v_id, 'nummer', v_nummer,
                            'eingegangen_am', v_jetzt, 'bestaetigt', false, 'abgleich', v_abgleich);
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Flags setzen (Eingangsbestaetigung / Benachrichtigung)
-- ---------------------------------------------------------------------
create or replace function public.shop_widerruf_markiere(
  p_secret text,
  p_id     uuid,
  p_art    text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.shop_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'grund', 'nicht_berechtigt');
  end if;
  if p_id is null or p_art not in ('bestaetigt', 'benachrichtigt') then
    return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
  end if;
  if p_art = 'bestaetigt' then
    update public.shop_widerrufe set bestaetigung_gesendet_am = pg_catalog.now()
     where id = p_id and bestaetigung_gesendet_am is null;
  else
    update public.shop_widerrufe set benachrichtigt_am = pg_catalog.now()
     where id = p_id and benachrichtigt_am is null;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.shop_widerruf_anlegen(text,text,text,text,text,text,text) from public;
revoke all on function public.shop_widerruf_markiere(text,uuid,text) from public;
grant execute on function public.shop_widerruf_anlegen(text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.shop_widerruf_markiere(text,uuid,text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Mail-Daten der Bestellbestaetigung: + Bestelldatum + Transaktions-ID (PayPal-Capture)
--    Gleiche Signatur wie in 02; bestehende Rechte bleiben erhalten.
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
           'optionen', p.optionen) order by p.pos), '[]'::jsonb)
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
