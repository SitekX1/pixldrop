-- =====================================================================
-- Migration 11 (Etappe B): Speicher-Deckel fuer Anfragebilder + fruehere Bildloeschung
-- Projekt: Admin-Panel-Supabase. NICHT live angewendet; Anwendung durch den Orchestrator. Voraussetzung: 02, 04, 09.
-- Inhalt:
--   1. shop_anfrage_anlegen: globales Limit 30 -> 10 Anfragen/Stunde; Anfragen MIT Bildern werden mit
--      grund 'speicher_voll' abgelehnt, wenn der Bucket 'shop-anfragen' ueber 400 MB liegt
--      (Summe storage.objects.metadata->>'size'). Als DO-Block-Patch per replace() auf pg_get_functiondef
--      (wie 09), idempotent, bricht mit Fehler ab, falls die Textstellen nicht gefunden werden.
--   2. shop_loeschen_erlaubt (Storage-Policy-Funktion) + shop_bereinige_bilder_liste: Bilder sind loeschbar, wenn
--      die Anfrage abgeschlossen ist (status erledigt/abgelehnt) ODER 30 Tage alt ist (shop_konst frist_anfrage_tage)
--      ODER loeschen_nach erreicht ist. Die Zeile selbst bleibt bis loeschen_nach bestehen (Trigger setzt bei
--      Abschluss loeschen_nach = hoechstens jetzt + 30 Tage); nur die Dateien gehen frueher.
-- Der Code (anfrage.ts) kennt 'speicher_voll'; VOR dieser Migration geht der Code unveraendert (Grund tritt nicht auf).
-- Risiko: gering. create or replace von 2 Funktionen + 1 DO-Patch. Kein Datenverlust durch die Migration selbst;
--   Bilder werden erst vom naechsten Cron-Lauf (taeglich 03:30) geloescht, dann unwiderruflich.
--   Storage-Zugriff in shop_anfrage_anlegen laeuft als security definer (Owner postgres); Lesen von storage.objects
--   dort ist im Supabase-Standard moeglich - nach dem Anwenden mit dem Testaufruf unten pruefen.
-- Rollback:
--   Limit/Deckel: DO-Block unten mit vertauschten replace-Argumenten, oder Funktion aus 02 erneut ausfuehren.
--   shop_loeschen_erlaubt: Funktion aus 02 (Abschnitt 11) erneut ausfuehren; shop_bereinige_bilder_liste: aus 04.
-- Hinweis: bewusst kein begin/commit. Idempotent.
-- =====================================================================

-- 1. Limit + Speicher-Deckel in shop_anfrage_anlegen --------------------------
do $patch$
declare
  v_def  text;
  v_neu  text;
  v_alt1 constant text := '  if v_anzahl >= 30 then';
  v_neu1 constant text := '  if v_anzahl >= 10 then';
  v_alt2 constant text := '  v_nummer := public.shop_naechste_nummer(''anfrage'');';
  v_neu2 constant text :=
    '  if p_bild_anzahl > 0 and (select coalesce(pg_catalog.sum((o.metadata->>''size'')::bigint), 0)'
    || pg_catalog.chr(10) ||
    '        from storage.objects o where o.bucket_id = ''shop-anfragen'') > 400000000 then'
    || pg_catalog.chr(10) ||
    '    return jsonb_build_object(''ok'', false, ''grund'', ''speicher_voll'');'
    || pg_catalog.chr(10) ||
    '  end if;'
    || pg_catalog.chr(10) ||
    '  v_nummer := public.shop_naechste_nummer(''anfrage'');';
begin
  v_def := pg_catalog.pg_get_functiondef('public.shop_anfrage_anlegen(text,text,text,text,text,jsonb,text,int,jsonb)'::pg_catalog.regprocedure);
  v_neu := v_def;

  if pg_catalog.strpos(v_neu, v_neu1) = 0 then
    if pg_catalog.strpos(v_neu, v_alt1) = 0 then
      raise exception 'shop_anfrage_anlegen: Textstelle "%" nicht gefunden - Funktion manuell pruefen', v_alt1;
    end if;
    v_neu := pg_catalog.replace(v_neu, v_alt1, v_neu1);
  end if;

  if pg_catalog.strpos(v_neu, 'speicher_voll') = 0 then
    if pg_catalog.strpos(v_neu, v_alt2) = 0 then
      raise exception 'shop_anfrage_anlegen: Textstelle "%" nicht gefunden - Funktion manuell pruefen', v_alt2;
    end if;
    v_neu := pg_catalog.replace(v_neu, v_alt2, v_neu2);
  end if;

  if v_neu is distinct from v_def then
    execute v_neu;
  else
    raise notice 'shop_anfrage_anlegen: Limit und Speicher-Deckel bereits gesetzt, nichts zu tun';
  end if;
end
$patch$;

-- 2a. Storage-Policy-Funktion: Loeschen/Lesen auch bei Abschluss oder nach 30 Tagen -------
create or replace function public.shop_loeschen_erlaubt(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_m text[];
begin
  v_m := pg_catalog.regexp_match(p_name,
    '^anfragen/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/[1-3]\.(jpg|png|webp)$');
  if v_m is null or not public.shop_header_geheimnis_ok() then
    return false;
  end if;
  return exists (
    select 1 from public.shop_anfragen a
     where a.id = v_m[1]::uuid
       and a.bilder_geloescht_am is null
       and (a.loeschen_nach <= pg_catalog.now()
            or a.status in ('erledigt', 'abgelehnt')
            or a.erstellt_am <= pg_catalog.now() - pg_catalog.make_interval(days => public.shop_konst('frist_anfrage_tage')))
  );
end;
$$;
revoke all on function public.shop_loeschen_erlaubt(text) from public;
grant execute on function public.shop_loeschen_erlaubt(text) to anon, authenticated;

-- 2b. Liste der loeschbaren Bilddateien (gleiche Bedingung) ---------------------------
create or replace function public.shop_bereinige_bilder_liste(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_liste jsonb;
begin
  if not public.shop_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'grund', 'nicht_berechtigt');
  end if;
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('id', a.id, 'pfade', a.bild_pfade)), '[]'::jsonb)
    into v_liste
    from (select id, bild_pfade from public.shop_anfragen
           where bilder_geloescht_am is null
             and coalesce(pg_catalog.array_length(bild_pfade, 1), 0) > 0
             and (loeschen_nach <= pg_catalog.now()
                  or status in ('erledigt', 'abgelehnt')
                  or erstellt_am <= pg_catalog.now() - pg_catalog.make_interval(days => public.shop_konst('frist_anfrage_tage')))
           order by erstellt_am
           limit 100) a;
  return jsonb_build_object('ok', true, 'anfragen', v_liste);
end;
$$;
revoke all on function public.shop_bereinige_bilder_liste(text) from public;
grant execute on function public.shop_bereinige_bilder_liste(text) to anon, authenticated;

-- 3. Pruefen (nach dem Anwenden):
-- select pg_get_functiondef('public.shop_anfrage_anlegen(text,text,text,text,text,jsonb,text,int,jsonb)'::regprocedure) like '%>= 10 then%' as limit_10,
--        pg_get_functiondef('public.shop_anfrage_anlegen(text,text,text,text,text,jsonb,text,int,jsonb)'::regprocedure) like '%speicher_voll%' as deckel_da,
--        (select coalesce(sum((o.metadata->>'size')::bigint), 0) from storage.objects o where o.bucket_id = 'shop-anfragen') as bucket_bytes;
