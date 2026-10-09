// Textformat des Wunschtexts (Fett/Kursiv je Zeile, Größenstufe) und die gemeinsame Passt-Prüfung.
// Wird im Browser (ProductBuy) UND auf dem Server (server/preise.ts) verwendet, damit beide gleich urteilen.
//
// Speicherung in `optionen` der Position (Record<string,string>, Client -> Server):
//   fett_0:"1", kursiv_0:"1", fett_1:"1" ... = Zeilenindex (0-basiert; Tischschild: 0 = kleine, 1 = große Zeile)
//   groesse:"s"|"m"|"l"|"xl"  (Größe der Haupt-/großen Zeile)
// Standardwerte (kein Fett, kein Kursiv, "m") werden NICHT gespeichert (kanonisch, spart Bytes).
import type { Personalisierung } from "./produkte";
import type { Schrift } from "./schriften";
import { FETT_FAKTOR } from "./schriften";
import {
  FLAECHE_RUND, FLAECHE_SCHILD, FLAECHE_SCHILD_KLEIN, GROESSEN, STANDARD_GROESSE, istGroesseId, passtInFlaeche,
  type Flaeche, type GroesseId,
} from "./umbruch";

export interface TextFormat { fett: boolean[]; kursiv: boolean[]; groesse: GroesseId }
export const PASST_NICHT = "Passt nicht aufs Stück – bitte kleiner wählen oder kürzen";
export const NICHT_VERFUEGBAR = "Bei dieser Schrift nicht verfügbar";
const KEY = /^(fett|kursiv)_(\d)$/;

export const standardFormat = (zeilen: number): TextFormat => ({
  fett: Array(zeilen).fill(false), kursiv: Array(zeilen).fill(false), groesse: STANDARD_GROESSE,
});

/** Format -> kanonischer optionen-Teil (nur Abweichungen vom Standard). */
export function formatZuOptionen(f: TextFormat): Record<string, string> {
  const o: Record<string, string> = {};
  f.fett.forEach((v, i) => { if (v) o[`fett_${i}`] = "1"; });
  f.kursiv.forEach((v, i) => { if (v) o[`kursiv_${i}`] = "1"; });
  if (f.groesse !== STANDARD_GROESSE) o.groesse = f.groesse;
  return o;
}

/** Schlüssel, die zum Textformat gehören (alles andere sind Optionsgruppen des Artikels). */
export const istFormatSchluessel = (k: string) => KEY.test(k) || k === "groesse";

/** Strenge Prüfung (Server): nur bekannte Schlüssel, Werte "1" bzw. Stufe, Zeilenindex im Bereich. null = ungültig. */
export function formatAusOptionen(opt: Record<string, unknown>, zeilen: number): TextFormat | null {
  const f = standardFormat(zeilen);
  for (const [k, v] of Object.entries(opt)) {
    if (k === "groesse") { if (!istGroesseId(v)) return null; f.groesse = v; continue; }
    const m = KEY.exec(k);
    if (!m || v !== "1") return null;
    const i = Number(m[2]);
    if (i >= zeilen) return null;
    (m[1] === "fett" ? f.fett : f.kursiv)[i] = true;
  }
  return f;
}

export const istStandardFormat = (f: TextFormat) => !f.fett.some(Boolean) && !f.kursiv.some(Boolean) && f.groesse === STANDARD_GROESSE;

export function zeilenAnzahl(pers: Personalisierung): number {
  return pers.zeilen ? pers.zeilen.length : 1;
}

/** Fläche je Zeile: Tischschild = [klein, groß], sonst [rund]. */
export function flaechen(pers: Personalisierung): Flaeche[] {
  return pers.zeilen ? [FLAECHE_SCHILD_KLEIN, FLAECHE_SCHILD] : [FLAECHE_RUND];
}

/** Fähigkeiten verletzt? (Fett/Kursiv gewählt, obwohl die Schrift den Schnitt nicht hat.) */
export function formatUnerlaubt(f: TextFormat, s: Schrift): boolean {
  return (!s.hatFett && f.fett.some(Boolean)) || (!s.hatKursiv && f.kursiv.some(Boolean));
}

export interface PasstZeile { passt: boolean; zeilen: string[]; size: number }
/** Prüft jede Zeile in ihrer Fläche. `zeilen` = Eingabezeilen (Tischschild: 2, sonst 1 Zeile). */
export function pruefePasst(pers: Personalisierung, zeilen: string[], s: Schrift, f: TextFormat): { passt: boolean; zeilen: PasstZeile[] } {
  const fl = flaechen(pers);
  const erg = fl.map((flaeche, i) => passtInFlaeche({
    text: zeilen[i] ?? "", flaeche, groesse: pers.zeilen && i === 0 ? STANDARD_GROESSE : f.groesse,
    breite: s.breite, fett: f.fett[i] === true, fettFaktor: FETT_FAKTOR,
  }));
  return { passt: erg.every((e) => e.passt), zeilen: erg };
}

/** Lesbare Anzeige fürs Format als [Beschriftung, Wert]-Paare (Warenkorb, Bon, Freigabe, Mails; nur Abweichungen vom Standard). */
export function formatAnzeige(pers: Personalisierung, f: TextFormat): [string, string][] {
  const out: [string, string][] = [];
  const n = zeilenAnzahl(pers);
  for (let i = 0; i < n; i++) {
    const teile = [f.fett[i] ? "Fett" : null, f.kursiv[i] ? "Kursiv" : null].filter(Boolean) as string[];
    if (teile.length) out.push([pers.zeilen ? `Format ${pers.zeilen[i].label}` : "Format", teile.join(", ")]);
  }
  if (f.groesse !== STANDARD_GROESSE) out.push(["Schriftgröße", GROESSEN.find((g) => g.id === f.groesse)?.label ?? f.groesse]);
  return out;
}

/** Für die Client-Anzeige: optionen-Record einer Position -> Anzeigepaare (ungültiges Format wird ignoriert). */
export function formatAnzeigeAusOptionen(pers: Personalisierung | null, opt: Record<string, string>): [string, string][] {
  if (!pers) return [];
  const nur = Object.fromEntries(Object.entries(opt).filter(([k]) => istFormatSchluessel(k)));
  const f = formatAusOptionen(nur, zeilenAnzahl(pers));
  return f ? formatAnzeige(pers, f) : [];
}
