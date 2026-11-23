-- Bestellung: bis zu 50 Positionen statt 10 (Alex 23.11.2026). Ganze Namen aus Bubble-Buchstaben und mehrzeilige Wandbuchstaben
-- (eine Position je Zeile) brauchen mehr als 10 Positionen. Einzige Änderung gegenüber der laufenden Funktion:
--   jsonb_array_length(p_positionen) not between 1 and 10   ->   not between 1 and 50
-- Die Funktion wird aus ihrer eigenen Definition neu erzeugt (exakt dieselbe Funktion, Grants bleiben bei create or replace erhalten).
-- Rückgängig: dieselbe Anweisung mit vertauschten Zahlen (50 -> 10).
do $mig$
declare
  d text;
  neu text;
begin
  select pg_catalog.pg_get_functiondef(p.oid) into d
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'shop_bestellung_anlegen';
  if d is null then raise exception 'shop_bestellung_anlegen nicht gefunden'; end if;
  neu := pg_catalog.replace(d, 'jsonb_array_length(p_positionen) not between 1 and 10', 'jsonb_array_length(p_positionen) not between 1 and 50');
  if neu = d then raise exception 'Grenze nicht gefunden (Funktion schon geändert?)'; end if;
  execute neu;
end
$mig$;
