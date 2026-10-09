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
