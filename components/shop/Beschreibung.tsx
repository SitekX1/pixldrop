import { beschreibungBloecke } from "@/lib/shop/beschreibung";

// Gegliederte Produktbeschreibung: Einleitung, Zwischenüberschriften, nummerierte Schritte, Stichpunkte.
export default function Beschreibung({ text }: { text: string }) {
  const bloecke = beschreibungBloecke(text);
  return (
    <div className="shop-beschr">
      {bloecke.map((b, i) => {
        if (b.t === "h") return <h2 key={i} className="shop-beschr-h">{b.text}</h2>;
        if (b.t === "ul") return <ul key={i} className="shop-beschr-ul">{b.items.map((x, j) => <li key={j}>{x}</li>)}</ul>;
        if (b.t === "ol") return <ol key={i} className="shop-beschr-ol">{b.items.map((x, j) => <li key={j}>{x}</li>)}</ol>;
        return <p key={i} className={i === 0 ? "shop-beschr-lead" : undefined}>{b.text}</p>;
      })}
    </div>
  );
}
