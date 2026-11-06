import { AKTIONEN, datumDe } from "@/lib/shop/aktion";

// Auffälliger Aktionsstreifen im Shop (nur solange die Aktion läuft): nennt Rabatt, Code, Geltungsbereich und Zeitraum.
export default function AktionsBanner() {
  const a = AKTIONEN[0];
  if (!a || Date.now() > Date.parse(a.bis)) return null;
  return (
    <aside className="wn-aktion" aria-label={`${a.label}: ${a.prozent} % Rabatt`}>
      <p className="wn-aktion-gross">−{a.prozent} %</p>
      <div className="wn-aktion-text">
        <h2>{a.label}: {a.prozent} % auf alle Weihnachtsartikel</h2>
        <p>Gib im Warenkorb den Code <strong className="wn-aktion-code">{a.code}</strong> ein. Der Rabatt gilt auf den Warenwert der Weihnachtsartikel, nicht auf die Versandkosten und nicht auf andere Artikel. Aktion vom {datumDe(a.von)} bis {datumDe(a.bis)}.</p>
      </div>
    </aside>
  );
}
