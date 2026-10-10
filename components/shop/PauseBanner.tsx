import { holeEinstellungen } from "@/lib/shop/server/einstellungen";

// Hinweisbanner bei Bestellpause (Panel-Reiter "Einstellungen"). Server-Komponente: Text kommt fertig aus holeEinstellungen().
// Bei Fehler/ohne DB liefert holeEinstellungen den Fallback (nicht pausiert) -> dann rendert nichts.
// Volle Pause = roter Streifen; nur Wunschtext-Pause = orange. Beide kleben oben (position: sticky, siehe shop.css).
export default async function PauseBanner() {
  const e = await holeEinstellungen();
  if (!e.bestellungPausiert && !e.wunschtextPausiert) return null;
  const voll = e.bestellungPausiert;
  return (
    <div className="shop-pause-bar" data-voll={voll} role="status">
      <div className="shop-wrap">
        <div className="shop-pause-in">
          <span className="shop-pause-icon" aria-hidden="true">{voll ? "!" : "✎"}</span>
          <div>
            <strong>{voll ? "Bestellungen sind gerade pausiert" : "Artikel mit Wunschtext sind gerade pausiert"}</strong>
            <p>{voll ? e.pauseText : "Wegen hoher Auftragslage vorübergehend nicht bestellbar. Alle anderen Artikel bleiben bestellbar."}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
