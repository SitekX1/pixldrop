// Textumbruch für die SVG-Vorschau (SVG bricht nicht selbst um): Umbruch an Wortgrenzen,
// höchstens maxZeilen Zeilen, Schrift nur moderat verkleinert (nie unter minSize).
export interface Umbruch { zeilen: string[]; size: number }

function brich(text: string, proZeile: number): string[] {
  const out: string[] = [];
  let zeile = "";
  for (let wort of text.split(/\s+/).filter(Boolean)) {
    while (wort.length > proZeile) { // überlanges Wort hart trennen
      if (zeile) { out.push(zeile); zeile = ""; }
      out.push(wort.slice(0, proZeile));
      wort = wort.slice(proZeile);
    }
    if (!zeile) zeile = wort;
    else if ((zeile + " " + wort).length <= proZeile) zeile += " " + wort;
    else { out.push(zeile); zeile = wort; }
  }
  if (zeile) out.push(zeile);
  return out;
}

/** breite/hoehe = verfügbare Breite in SVG-Einheiten, maxSize/minSize in SVG-Einheiten. */
export function umbrechen(text: string, breite: number, maxSize: number, minSize: number, maxZeilen = 4, hoehe = 40): Umbruch {
  const t = text.replace(/\s+/g, " ").trim();
  const schritte = [maxSize, maxSize * 0.85, maxSize * 0.72, minSize].filter((s) => s >= minSize - 0.01);
  for (const size of schritte) {
    const zeilen = brich(t, Math.max(3, Math.floor(breite / (size * 0.6))));
    if (zeilen.length <= Math.min(maxZeilen, Math.max(1, Math.floor(hoehe / (size * 1.15))))) return { zeilen, size };
  }
  return { zeilen: brich(t, Math.max(3, Math.floor(breite / (minSize * 0.6)))).slice(0, maxZeilen), size: minSize };
}

// ---------------------------------------------------------------------------------------------
// Passt-Prüfung mit fester Größenstufe. Browser (Vorschau, Knopf sperren) UND Server (preise.ts)
// rufen dieselbe Funktion auf. Die Zeichenbreite ist ein Schätzwert je Schrift (schriften.ts),
// keine Messung: bewusst mit Reserve, Alex prüft den Druck am Ende ohnehin.
// ---------------------------------------------------------------------------------------------
export type GroesseId = "s" | "m" | "l" | "xl";
export const GROESSEN: { id: GroesseId; label: string }[] = [
  { id: "s", label: "Klein" }, { id: "m", label: "Mittel" }, { id: "l", label: "Groß" }, { id: "xl", label: "Sehr groß" },
];
export const STANDARD_GROESSE: GroesseId = "m";
export const istGroesseId = (v: unknown): v is GroesseId => typeof v === "string" && GROESSEN.some((g) => g.id === v);

export interface Flaeche {
  /** Verfügbare Breite/Höhe in SVG-Einheiten (viewBox 100). */
  breite: number; hoehe: number;
  /** Höchstens so viele Zeilen. */
  maxZeilen: number;
  /** Schriftgröße je Stufe in SVG-Einheiten; die kleinste Stufe ist zugleich die Mindestgröße. */
  groessen: Record<GroesseId, number>;
}
/** Spruch-Untersetzer (runde Fläche, bis 4 Zeilen). */
export const FLAECHE_RUND: Flaeche = { breite: 46, hoehe: 40, maxZeilen: 4, groessen: { s: 6.5, m: 9, l: 11.5, xl: 14 } };
/** Tischschild, große Zeile in der Mitte (bis 3 Zeilen). */
export const FLAECHE_SCHILD: Flaeche = { breite: 70, hoehe: 30, maxZeilen: 3, groessen: { s: 8, m: 14, l: 17, xl: 20 } };
/** Tischschild, kleine Zeile oben links: eine Zeile, feste Größe (Format Fett/Kursiv gilt trotzdem). */
export const FLAECHE_SCHILD_KLEIN: Flaeche = { breite: 66, hoehe: 7, maxZeilen: 1, groessen: { s: 5.2, m: 5.2, l: 5.2, xl: 5.2 } };

export interface PasstEingabe {
  text: string; flaeche: Flaeche; groesse: GroesseId;
  /** Zeichenbreite der Schrift in em (schriften.ts) und Fett-Zuschlag. */
  breite: number; fett: boolean; fettFaktor: number;
}
export interface PasstErgebnis { passt: boolean; zeilen: string[]; size: number }

/** Umbruch an Wortgrenzen; ein einzelnes Wort, das nicht in eine Zeile passt, bricht nie mitten im Wort um (passt dann nicht). */
function brichWorte(text: string, proZeile: number): { zeilen: string[]; wortZuLang: boolean } {
  const zeilen: string[] = [];
  let zeile = "", zuLang = false;
  for (const wort of text.split(/\s+/).filter(Boolean)) {
    if (wort.length > proZeile) zuLang = true;
    if (!zeile) zeile = wort;
    else if ((zeile + " " + wort).length <= proZeile) zeile += " " + wort;
    else { zeilen.push(zeile); zeile = wort; }
  }
  if (zeile) zeilen.push(zeile);
  return { zeilen, wortZuLang: zuLang };
}

export function passtInFlaeche(e: PasstEingabe): PasstErgebnis {
  const size = e.flaeche.groessen[e.groesse] ?? e.flaeche.groessen.m;
  const t = e.text.replace(/\s+/g, " ").trim();
  const zeichen = e.breite * (e.fett ? e.fettFaktor : 1);
  const proZeile = Math.max(1, Math.floor(e.flaeche.breite / (size * zeichen)));
  const { zeilen, wortZuLang } = brichWorte(t, proZeile);
  const hoeheNoetig = zeilen.length * size * 1.15;
  const passt = t !== "" && !wortZuLang && zeilen.length <= e.flaeche.maxZeilen && hoeheNoetig <= e.flaeche.hoehe + 0.01;
  return { passt, zeilen, size };
}
