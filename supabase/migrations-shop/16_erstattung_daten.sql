-- =====================================================================
-- 16_erstattung_daten.sql  (Shop-Datenbank dbrdjaowptasjwirgtfu)  -  NICHT angewendet, Orchestrator wendet nach Alex' Go an
-- Zweck: PayPal-Erstattung aus dem Admin Panel (Shop-Route POST /api/shop/admin/erstatten).
-- Neu: shop_erstattung_daten(p_secret, p_id, p_ereignis_id) - REINE LESEFUNKTION (stable), keine Kundendaten.
--   Liefert, was die Route vor dem PayPal-Aufruf pruefen muss: Zahlungsstatus, Capture-ID, Gesamtbetrag, bisher erstattet,
--   anonymisiert ja/nein, ob eine Einnahme verbucht ist (einnahme_id; ohne sie scheitert die Panel-Buchung NACH der PayPal-Erstattung) und ob die Panel-Buchung zu dieser ereignis_id (shop_erstattung_anwenden) schon angewendet ist.
-- Der Shop-Stand (erstattet_cent usw.) wird NICHT hier geaendert, sondern wie bisher von shop_erstattung_anwenden
--   (service_role, ueber die Panel-Buchungsroute, idempotent ueber ereignis_id). So wird nie doppelt gezaehlt.
-- Rechte wie die uebrigen shop_*-RPCs (anon/authenticated duerfen aufrufen, Funktion prueft p_secret selbst; public entzogen).
-- Risiko: gering (nur neue Funktion, kein Lock, kein Datenverlust). Reihenfolge: VOR dem Code-Deploy anwenden;
--   ohne diese Migration antwortet die neue Shop-Route mit 503 (nichts wird erstattet).
-- Rollback: drop function if exists public.shop_erstattung_daten(text,uuid,uuid);
-- =====================================================================

create or replace function public.shop_erstattung_daten(
  p_secret      text,
  p_id          uuid,
  p_ereignis_id uuid
)
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
  if p_id is null or p_ereignis_id is null then
    return jsonb_build_object('ok', false, 'grund', 'ungueltige_eingabe');
  end if;
  select * into b from public.shop_bestellungen where id = p_id;
  if b.id is null then
    return jsonb_build_object('ok', false, 'grund', 'nicht_gefunden');
  end if;
  return jsonb_build_object(
    'ok', true,
    'nummer', b.nummer,
    'zahlungsstatus', b.zahlungsstatus,
    'bezahlt', (b.zahlungsstatus = 'bezahlt' and b.bezahlt_am is not null),
    'paypal_capture_id', b.paypal_capture_id,
    'gesamt_cent', b.gesamt_cent,
    'einnahme_id', b.einnahme_id,
    'erstattet_cent', coalesce(b.erstattet_cent, 0),
    'anonymisiert', b.anonymisiert_am is not null,
    'ereignis_angewendet', exists (
      select 1 from public.shop_ereignisse e
       where e.ereignis_id = p_ereignis_id and e.bestellung_id = b.id and e.art = 'erstattung')
  );
end;
$$;

revoke all on function public.shop_erstattung_daten(text,uuid,uuid) from public;
grant execute on function public.shop_erstattung_daten(text,uuid,uuid) to anon, authenticated;

-- Pruefen nach dem Anwenden:
--   select public.shop_erstattung_daten('x', null, null);   -- {"ok": false, "grund": "nicht_berechtigt"}
