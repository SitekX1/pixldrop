// Zustandsseite der Annahme-Seite: Link ungueltig / Angebot abgelaufen / bereits angenommen / Dienst gerade nicht erreichbar.
// Server-kompatibel (kein State). Die Texte kommen vom Server (GRUND_TEXT in lib/shop/server/angebot.ts).
export type AngebotFehlerCode = "ungueltig" | "abgelaufen" | "bereits_angenommen" | "db" | "nicht_eingerichtet";

const TITEL: Record<AngebotFehlerCode, string> = {
  ungueltig: "Dieser Link passt zu keinem Angebot.",
  abgelaufen: "Dieses Angebot ist abgelaufen.",
  bereits_angenommen: "Dieses Angebot ist schon angenommen.",
  db: "Gerade nicht erreichbar.",
  nicht_eingerichtet: "Gerade nicht erreichbar.",
};
const HILFE: Record<AngebotFehlerCode, string> = {
  ungueltig: "Prüfe, ob du den ganzen Link aus der E-Mail verwendet hast. Wenn du ihn nicht mehr hast, schreib mir kurz.",
  abgelaufen: "Angebote gelten 14 Tage. Schreib mir, dann erstelle ich dir gern ein neues.",
  bereits_angenommen: "Die Bestätigung hast du per E-Mail bekommen. Bei Fragen zu deiner Bestellung schreib mir.",
  db: "Bitte versuch es in ein paar Minuten noch einmal. Dein Angebot bleibt gültig.",
  nicht_eingerichtet: "Bitte versuch es in ein paar Minuten noch einmal. Dein Angebot bleibt gültig.",
};

export default function AngebotFehler({ code, meldung, nummer }: { code: AngebotFehlerCode; meldung?: string; nummer?: string | null }) {
  return (
    <div className="shop-empty" role="status">
      {nummer && <p className="shop-overline">Anfrage {nummer}</p>}
      <h1 style={{ fontSize: "clamp(1.6rem, 7vw, 2.2rem)" }}>{TITEL[code]}</h1>
      <p>{meldung ?? ""}</p>
      <p>{HILFE[code]}</p>
      <a className="shop-btn" href={`mailto:as@sitekx.de?subject=${encodeURIComponent(nummer ? `Angebot ${nummer}` : "Mein Angebot")}`}>Mail an Alex</a>
      <a className="shop-link" href="/3d-druck#stuecke">Zum Shop</a>
    </div>
  );
}
