import { holeEinstellungen } from "@/lib/shop/server/einstellungen";

// Hinweisbanner bei Bestellpause (Panel-Reiter "Einstellungen"). Server-Komponente: Text kommt fertig aus holeEinstellungen().
// Bei Fehler/ohne DB liefert holeEinstellungen den Fallback (nicht pausiert) -> dann rendert nichts.
export default async function PauseBanner() {
  const e = await holeEinstellungen();
  if (!e.bestellungPausiert && !e.wunschtextPausiert) return null;
  const voll = e.bestellungPausiert;
  return (
    <div className="shop-wrap">
      <div className="shop-pause" role="status" data-voll={voll}>
        <span className="shop-pause-icon" aria-hidden="true">{voll ? "⏸" : "✎"}</span>
        <div>
          <strong>{voll ? "Bestellungen sind gerade pausiert" : "Wunschtexte sind gerade pausiert"}</strong>
          <p>{voll ? e.pauseText : "Aufgrund der aktuell sehr hohen Auftragslage nehme ich derzeit keine Bestellungen mit geändertem Wunschtext an. Standardartikel bleiben bestellbar."}</p>
        </div>
      </div>
    </div>
  );
}
