import { AKTIONEN, datumDe } from "@/lib/shop/aktion";

// Auffälliger Aktionsstreifen im Shop (nur solange die Aktion läuft): nennt Rabatt, Code, Geltungsbereich und Zeitraum.
export default function AktionsBanner() {
  const a = AKTIONEN[0];
  if (!a || Date.now() > Date.parse(a.bis)) return null;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="wn-aktion-bild" src="/shop/weihnachten/aktion-banner.webp" alt={`${a.label}: ${a.prozent} % auf alle Weihnachtsartikel mit dem Code ${a.code}, ${datumDe(a.von)} bis ${datumDe(a.bis)}`} width={1600} height={535} decoding="async" />
    <aside className="wn-aktion" aria-label={`${a.label}: ${a.prozent} % Rabatt`}>
      <p className="wn-aktion-gross">−{a.prozent} %</p>
      <div className="wn-aktion-text">
        <h2>{a.label}: {a.prozent} % auf alle Weihnachtsartikel</h2>
        <p>Gib im Warenkorb den Code <strong className="wn-aktion-code">{a.code}</strong> ein. Der Rabatt gilt auf den Warenwert der Weihnachtsartikel, nicht auf die Versandkosten und nicht auf andere Artikel. Aktion vom {datumDe(a.von)} bis {datumDe(a.bis)}.</p>
      </div>
    </aside>
    </>
  );
}
