-- =====================================================================
-- Migration 19: Kanban-Ablauf im Panel (Bestellungen): Arbeitsstatus je Bestellung + "gedruckt" je Position
-- Projekt: SHOP-Datenbank (dbrdjaowptasjwirgtfu). NICHT live angewendet (wartet auf Alex' Go). Idempotent, kein begin/commit.
-- Inhalt:
--   1. shop_bestellungen.arbeitsstatus text not null default 'neu'  (neu | gedruckt | verpackt | versendet)
--      Spalten im Kanban: Neu -> Gedruckt -> Verpackt -> Versendet -> Erledigt. "Erledigt" ist KEIN Wert, sondern ergibt sich im Panel
--      aus der Buchung (verbucht_am / einnahme_id nicht null). Der bestehende Feld "status" (neu/bezahlt/.../versendet/abgeschlossen)
--      und seine Trigger bleiben UNVERAENDERT; arbeitsstatus ist rein die Werkstatt-Sicht.
--   2. Trigger shop_tg_arbeitsstatus: 'versendet' kann NUR ueber status = versendet/abgeschlossen entstehen (= ueber die Route
--      /api/shop/admin/versendet bzw. shop_versand_markieren, die Voraussetzungen und Versandmail erzwingt). Wer den Status zurueckdreht,
--      bekommt arbeitsstatus 'verpackt'. Direktes Setzen auf 'versendet' per PATCH wird zu 'verpackt' korrigiert (und der Panel-Proxy
--      erlaubt es ohnehin nicht, siehe allowlist.ts).
--   3. shop_positionen.gedruckt integer not null default 0, Check 0 <= gedruckt <= menge (zaehlt Stueck: bei menge 3 sind 0..3 moeglich).
--   4. Backfill: bestehende Bestellungen mit status versendet/abgeschlossen -> 'versendet', status 'gedruckt' -> 'gedruckt'.
-- Grants/RLS: KEINE neue Tabelle, daher keine neuen Tabellen-Grants. Neue Spalten erben die vorhandenen Tabellenrechte (RLS bleibt an).
--   Geschrieben wird nur ueber den Panel-Proxy (Secret-Key/service_role, per Allowlist auf diese Spalten begrenzt). anon schreibt NICHTS:
--   es wird kein Recht fuer anon/authenticated vergeben. Pruefen nach dem Anwenden (read-only):
--     select grantee, privilege_type from information_schema.role_table_grants
--      where table_schema='public' and table_name in ('shop_bestellungen','shop_positionen') and grantee in ('anon','authenticated');
--     -> Erwartung: keine UPDATE-Zeile fuer anon/authenticated (sonst: erst klaeren, bestand schon vor 19).
-- Risiko: gering. add column mit konstantem Default = nur Katalog-Aenderung (PG >= 11), kurzer ACCESS EXCLUSIVE Lock; check-Constraints auf
--   leeren/kleinen Tabellen ohne Wartezeit. Kein Datenverlust. Alter Code (Shop/Panel ohne 19) laeuft unveraendert weiter.
-- Offene Pruefung vor Livegang: gibt es auf shop_positionen/shop_bestellungen einen Trigger, der UPDATEs blockt (Unveraenderlichkeit)?
--     select tgname, tgrelid::regclass from pg_trigger where not tgisinternal and tgrelid in ('public.shop_positionen'::regclass,'public.shop_bestellungen'::regclass);
--   Test nach dem Anwenden: eine Test-Position per Panel-Proxy auf gedruckt=1 setzen und zurueck auf 0.
-- Rollback:
--   drop trigger if exists shop_bestellungen_bu_arbeitsstatus on public.shop_bestellungen;
--   drop function if exists public.shop_tg_arbeitsstatus();
--   alter table public.shop_positionen drop constraint if exists shop_positionen_gedruckt_chk;
--   alter table public.shop_positionen drop column if exists gedruckt;
--   alter table public.shop_bestellungen drop constraint if exists shop_bestellungen_arbeitsstatus_chk;
--   alter table public.shop_bestellungen drop column if exists arbeitsstatus;
-- =====================================================================

alter table public.shop_bestellungen add column if not exists arbeitsstatus text not null default 'neu';
alter table public.shop_positionen   add column if not exists gedruckt integer not null default 0;

do $mig$
begin
  if not exists (select 1 from pg_catalog.pg_constraint where conname = 'shop_bestellungen_arbeitsstatus_chk'
                   and conrelid = 'public.shop_bestellungen'::regclass) then
    alter table public.shop_bestellungen
      add constraint shop_bestellungen_arbeitsstatus_chk
      check (arbeitsstatus in ('neu', 'gedruckt', 'verpackt', 'versendet'));
  end if;
  if not exists (select 1 from pg_catalog.pg_constraint where conname = 'shop_positionen_gedruckt_chk'
                   and conrelid = 'public.shop_positionen'::regclass) then
    alter table public.shop_positionen
      add constraint shop_positionen_gedruckt_chk
      check (gedruckt >= 0 and gedruckt <= menge);
  end if;
end
$mig$;

-- ---------------------------------------------------------------------
-- Trigger: 'versendet' nur passend zum status
-- ---------------------------------------------------------------------
create or replace function public.shop_tg_arbeitsstatus()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('versendet', 'abgeschlossen') then
    new.arbeitsstatus := 'versendet';
  elsif new.arbeitsstatus = 'versendet' then
    new.arbeitsstatus := 'verpackt';   -- nicht (mehr) versendet: zurueck auf den Schritt davor
  end if;
  return new;
end;
$$;
revoke all on function public.shop_tg_arbeitsstatus() from public, anon, authenticated;

drop trigger if exists shop_bestellungen_bu_arbeitsstatus on public.shop_bestellungen;
create trigger shop_bestellungen_bu_arbeitsstatus
  before insert or update of status, arbeitsstatus on public.shop_bestellungen
  for each row execute function public.shop_tg_arbeitsstatus();

-- ---------------------------------------------------------------------
-- Backfill (einmalig, idempotent: setzt nur 'neu' hoch)
-- ---------------------------------------------------------------------
update public.shop_bestellungen set arbeitsstatus = 'versendet'
 where arbeitsstatus = 'neu' and status in ('versendet', 'abgeschlossen');
update public.shop_bestellungen set arbeitsstatus = 'gedruckt'
 where arbeitsstatus = 'neu' and status = 'gedruckt';
