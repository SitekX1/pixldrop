-- =====================================================================
-- Migration 12: atomares "Claim" der Mail-Flags (Claras Befund 1: Doppelversand bei parallelen Aufrufen)
-- Projekt: Admin-Panel-Supabase. NICHT live angewendet. Voraussetzung: 10_freigabe.sql.
-- Ablauf im Code: Daten holen -> claim (Flag atomar setzen, nur der erste Aufrufer bekommt neu=true) -> senden;
--   bei Sendefehler claim_zurueck (Flag wieder leeren), damit ein Retry moeglich bleibt.
-- Drei Abschnitte, je unter 120 Zeilen; einzeln anwendbar in der Reihenfolge 1, 2, 3.
-- Risiko: gering (nur neue Funktionen, keine Tabellenaenderung). Der Code laeuft auch VOR dieser Migration
--   (fehlende Funktion -> altes Verhalten ohne Claim).
-- Rollback: drop function public.shop_freigabe_claim(text,uuid,text);
--           drop function public.shop_freigabe_claim_zurueck(text,uuid,text);
-- =====================================================================

-- 1. Claim: p_art = eingang | absage | bestaetigung. Rueckgabe {ok:true, neu:boolean}
create or replace function public.shop_freigabe_claim(p_secret text, p_id uuid, p_art text)
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
  if p_id is null or p_art is null or p_art not in ('eingang', 'absage', 'bestaetigung') then
    return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
  end if;
  if p_art = 'eingang' then
    update public.shop_bestellungen set eingang_gesendet_am = pg_catalog.now()
     where id = p_id and eingang_gesendet_am is null and freigabe_status = 'offen' and anonymisiert_am is null;
  elsif p_art = 'absage' then
    update public.shop_bestellungen set absage_gesendet_am = pg_catalog.now()
     where id = p_id and absage_gesendet_am is null and freigabe_status = 'abgelehnt' and anonymisiert_am is null;
  else
    update public.shop_bestellungen set bestaetigung_gesendet_am = pg_catalog.now()
     where id = p_id and bestaetigung_gesendet_am is null and bezahlt_am is not null and anonymisiert_am is null
       and (freigabe_status is null or freigabe_status = 'freigegeben');
  end if;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'neu', v_n > 0);
end;
$$;

-- 2. Claim zuruecknehmen (nur nach fehlgeschlagenem Versand)
create or replace function public.shop_freigabe_claim_zurueck(p_secret text, p_id uuid, p_art text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.shop_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'grund', 'nicht_berechtigt');
  end if;
  if p_id is null or p_art is null or p_art not in ('eingang', 'absage', 'bestaetigung') then
    return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
  end if;
  if p_art = 'eingang' then
    update public.shop_bestellungen set eingang_gesendet_am = null where id = p_id;
  elsif p_art = 'absage' then
    update public.shop_bestellungen set absage_gesendet_am = null where id = p_id;
  else
    update public.shop_bestellungen set bestaetigung_gesendet_am = null where id = p_id;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- 3. Rechte
revoke all on function public.shop_freigabe_claim(text,uuid,text) from public;
revoke all on function public.shop_freigabe_claim_zurueck(text,uuid,text) from public;
grant execute on function public.shop_freigabe_claim(text,uuid,text) to anon, authenticated;
grant execute on function public.shop_freigabe_claim_zurueck(text,uuid,text) to anon, authenticated;
-- Pruefen: select public.shop_freigabe_claim('x', null, 'eingang');  -> {"ok": false, "grund": "nicht_berechtigt"}
