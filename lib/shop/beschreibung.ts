// Produktbeschreibung -> gegliederte Blöcke (Absatz, Überschrift, Liste, nummerierte Schritte).
// Zwei Schreibweisen im Feld `beschreibung` (lib/shop/produkte.ts):
//  1. Mit Markup (enthält Zeilenumbruch): Blöcke durch Leerzeile getrennt; "## Titel" = Zwischenüberschrift,
//     Zeilen mit "- " = Stichpunkte, Zeilen mit "1. " = nummerierte Schritte, sonst Absatz.
//  2. Fließtext (ohne Zeilenumbruch): die ersten zwei Sätze bleiben Einleitung, der Rest wird zu Stichpunkten ("Gut zu wissen").
export type Block =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] };

const KUERZEL = ["z. B.", "z.B.", "ca.", "bzw.", "inkl.", "ggf.", "Nr.", "d. h.", "d.h.", "u. a.", "usw.", "evtl.", "max.", "min.", "zzgl.", "ab ca."];

export function saetze(text: string): string[] {
  let t = text.trim();
  const platz: string[] = [];
  KUERZEL.forEach((k, i) => {
    const marke = `\u0001${i}\u0001`;
    platz.push(k);
    t = t.split(k).join(marke);
  });
  const teile = t.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ„"(])/);
  return teile.map((s) => s.replace(/\u0001(\d+)\u0001/g, (_, i) => platz[Number(i)]).trim()).filter(Boolean);
}

export function beschreibungBloecke(raw: string): Block[] {
  const text = raw.trim();
  if (!text) return [];
  if (text.includes("\n")) {
    const out: Block[] = [];
    for (const teil of text.split(/\n{2,}/)) {
      const zeilen = teil.split("\n").map((z) => z.trim()).filter(Boolean);
      if (!zeilen.length) continue;
      let i = 0;
      while (i < zeilen.length) {
        const z = zeilen[i];
        if (z.startsWith("## ")) { out.push({ t: "h", text: z.slice(3) }); i++; continue; }
        if (z.startsWith("- ")) {
          const items: string[] = [];
          while (i < zeilen.length && zeilen[i].startsWith("- ")) items.push(zeilen[i++].slice(2));
          out.push({ t: "ul", items }); continue;
        }
        if (/^\d+\.\s/.test(z)) {
          const items: string[] = [];
          while (i < zeilen.length && /^\d+\.\s/.test(zeilen[i])) items.push(zeilen[i++].replace(/^\d+\.\s/, ""));
          out.push({ t: "ol", items }); continue;
        }
        const par: string[] = [];
        while (i < zeilen.length && !/^(## |- |\d+\.\s)/.test(zeilen[i])) par.push(zeilen[i++]);
        out.push({ t: "p", text: par.join(" ") });
      }
    }
    return out;
  }
  const s = saetze(text);
  if (s.length <= 2) return [{ t: "p", text }];
  const lead = s.slice(0, 2).join(" ");
  return [{ t: "p", text: lead }, { t: "h", text: "Gut zu wissen" }, { t: "ul", items: s.slice(2) }];
}
