-- Bubble-Buchstaben: Farben, die Alex im Panel sperrt (Spule leer). Neuer Schluessel in shop_einstellungen:
--   bubble_farben_aus = kommagetrennte Farb-IDs, z. B. 'gold-silk,braun'. Leer/fehlt = nichts gesperrt.
-- Nur die Lese-RPC wird um ein Feld erweitert (rueckwaertskompatibel, Rest unveraendert).
create or replace function public.shop_einstellungen_lesen()
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  select jsonb_build_object(
    'lieferzeit_text',     coalesce((select wert from public.shop_einstellungen where schluessel = 'lieferzeit_text'), '3-5 Werktage'),
    'bestellung_pausiert', coalesce((select wert from public.shop_einstellungen where schluessel = 'bestellung_pausiert'), 'false') = 'true',
    'pause_text',          coalesce(nullif((select wert from public.shop_einstellungen where schluessel = 'pause_text'), ''),
                             'Aufgrund der aktuell sehr hohen Auftragslage kann ich derzeit keine weiteren Bestellungen aufnehmen.'),
    'pause_bis',           coalesce((select wert from public.shop_einstellungen where schluessel = 'pause_bis'), ''),
    'wunschtext_pausiert', coalesce((select wert from public.shop_einstellungen where schluessel = 'wunschtext_pausiert'), 'false') = 'true',
    'bubble_farben_aus',   coalesce((select wert from public.shop_einstellungen where schluessel = 'bubble_farben_aus'), '')
  );
$function$;
-- Grants wie bisher (create or replace behaelt sie); zur Sicherheit:
grant execute on function public.shop_einstellungen_lesen() to anon, authenticated;

-- Erlaubte Schluessel der Tabelle (Pruefregel) um bubble_farben_aus erweitern; ohne das lehnt die DB das Speichern aus dem Panel ab.
alter table public.shop_einstellungen drop constraint shop_einstellungen_schluessel_chk;
alter table public.shop_einstellungen add constraint shop_einstellungen_schluessel_chk
  check (schluessel = any (array['lieferzeit_text','bestellung_pausiert','pause_text','pause_bis','wunschtext_pausiert','bubble_farben_aus']));
