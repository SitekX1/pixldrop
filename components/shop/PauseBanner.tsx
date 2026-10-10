import { holeEinstellungen } from "@/lib/shop/server/einstellungen";

// Hinweisbanner bei Bestellpause (Panel-Reiter "Einstellungen"). Server-Komponente: Text kommt fertig aus holeEinstellungen().
// Bei Fehler/ohne DB liefert holeEinstellungen den Fallback (nicht pausiert) -> dann rendert nichts.
// Volle Pause = roter Alarm-Banner; nur Wunschtext-Pause = dezenter Warnton (orange).
export default async function PauseBanner() {
  const e = await holeEinstellungen();
  if (!e.bestellungPausiert && !e.wunschtextPausiert) return null;
  const voll = e.bestellungPausiert;
  return (
    <div className="shop-wrap">
      <div className="shop-pause" role="status" data-voll={voll}>
        <span className="shop-pause-icon" aria-hidden="true">{voll ? "!" : "✎"}</span>
        <div>
          <strong>{voll ? "Bestellungen sind gerade pausiert" : "Artikel mit Wunschtext sind gerade pausiert"}</strong>
          <p>{voll ? e.pauseText : "Aufgrund der aktuell sehr hohen Auftragslage sind Artikel mit Wunschtext vorübergehend nicht bestellbar. Alle anderen Artikel bleiben bestellbar."}</p>
        </div>
      </div>
    </div>
  );
}
