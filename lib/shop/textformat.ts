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
import { NS, NS_BREITE, kappeJeEm } from "./namensschild";
import {
  FLAECHE_RUND, FLAECHE_UNTERSETZER, FLAECHE_SCHILD, FLAECHE_SCHILD_KLEIN, GROESSEN, STANDARD_GROESSE, istGroesseId, passtInFlaeche,
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
  return pers.zeilen ? [FLAECHE_SCHILD_KLEIN, FLAECHE_SCHILD] : [pers.flaeche === "untersetzer" ? FLAECHE_UNTERSETZER : FLAECHE_RUND];
}

/** Fähigkeiten verletzt? (Fett/Kursiv gewählt, obwohl die Schrift den Schnitt nicht hat.) */
export function formatUnerlaubt(f: TextFormat, s: Schrift): boolean {
  return (!s.hatFett && f.fett.some(Boolean)) || (!s.hatKursiv && f.kursiv.some(Boolean));
}

export interface PasstZeile { passt: boolean; zeilen: string[]; size: number }
/** Prüft jede Zeile in ihrer Fläche. `zeilen` = Eingabezeilen (Tischschild: 2, sonst 1 Zeile). */
export function pruefePasst(pers: Personalisierung, zeilen: string[], s: Schrift, f: TextFormat): { passt: boolean; zeilen: PasstZeile[] } {
  if (pers.fuellt) {
    // Namensschild: jede Zeile in einer Zeile, Mindest-Kappenhöhe darf nicht unterschritten werden (Schätzwert wie sonst auch)
    const erg = zeilen.map((z, i) => {
      const t = z.replace(/\s+/g, " ").trim();
      const em = (i === 0 ? NS.nameKappeMin : NS.titelKappeMin) / kappeJeEm(s.id);
      const breite = t.length * s.breite * (f.fett[i] === true ? FETT_FAKTOR : 1) * em;
      return { passt: t !== "" && breite <= NS_BREITE, zeilen: [t], size: em };
    });
    return { passt: erg.every((e) => e.passt), zeilen: erg };
  }
  const fl = flaechen(pers);
  const erg = fl.map((flaeche, i) => passtInFlaeche({
    text: zeilen[i] ?? "", flaeche, groesse: pers.zeilen && i === 0 ? STANDARD_GROESSE : f.groesse,
    breite: s.breite, fett: f.fett[i] === true, fettFaktor: FETT_FAKTOR,
  }));
  return { passt: erg.every((e) => e.passt), zeilen: erg };
}

/** Größte Stufe, bei der der Text noch passt (Voreinstellung, solange der Kunde keine Stufe gewählt hat).
 *  Passt keine Stufe, kommt die kleinste zurück (der Passt-nicht-Hinweis erscheint dann trotzdem).
 *  extra = zusätzliche Prüfung je Stufe (Browser: echte Textbreite). */
export function groessteDiePasst(pers: Personalisierung, zeilen: string[], s: Schrift, f: TextFormat, extra?: (g: GroesseId) => boolean): GroesseId {
  if (pers.fuellt) return STANDARD_GROESSE;
  for (let i = GROESSEN.length - 1; i >= 0; i--) {
    if (pruefePasst(pers, zeilen, s, { ...f, groesse: GROESSEN[i].id }).passt && (!extra || extra(GROESSEN[i].id))) return GROESSEN[i].id;
  }
  return GROESSEN[0].id;
}

/** Misst die Breite eines Textes in em mit der gewählten Schrift (null = nicht messbar). */
export type Messer = (text: string, fett: boolean, kursiv: boolean) => number | null;
export interface EchtErgebnis { passt: boolean; meldung?: string; /** Index der Eingabezeile, die nicht passt (Namensschild) */ zeile?: number }

/**
 * Prüfung mit der ECHTEN Textbreite (Browser): die Schätzung in pruefePasst rechnet mit einer durchschnittlichen
 * Zeichenbreite, breite Buchstaben (W, M ...) fallen dort durch. Hier gelten dieselben Mindestgrößen,
 * aber mit der gemessenen Breite. Liefert null, wenn nicht messbar (dann gilt nur die Schätzung).
 * Ist die Schätzung schon durchgefallen, kommt passt:true zurück (die Meldung dafür liefert pruefePasst).
 */
export function echtPasst(pers: Personalisierung, zeilen: string[], s: Schrift, f: TextFormat, messer: Messer): EchtErgebnis | null {
  if (pers.fuellt) {
    for (let i = 0; i < zeilen.length; i++) {
      const t = zeilen[i].replace(/\s+/g, " ").trim();
      if (!t) continue;
      const em = messer(t, f.fett[i] === true, f.kursiv[i] === true);
      if (em === null) return null;
      const max = i === 0 ? NS.nameKappeMax : NS.titelKappe;
      const min = i === 0 ? NS.nameKappeMin : NS.titelKappeMin;
      const kappe = Math.min(max, (NS_BREITE * kappeJeEm(s.id)) / em);
      if (kappe < min - 0.01) {
        return { passt: false, zeile: i, meldung: `${i === 0 ? "Der Name" : "Der Titel"} ist mit dieser Schrift zu lang: Die Buchstaben würden kleiner als ${String(min).replace(".", ",")} mm. Bitte kürzen oder eine schmalere Schrift wählen.` };
      }
    }
    return { passt: true };
  }
  const fl = flaechen(pers);
  for (let i = 0; i < fl.length; i++) {
    const est = passtInFlaeche({
      text: zeilen[i] ?? "", flaeche: fl[i], groesse: pers.zeilen && i === 0 ? STANDARD_GROESSE : f.groesse,
      breite: s.breite, fett: f.fett[i] === true, fettFaktor: FETT_FAKTOR,
    });
    if (!est.passt) continue;
    for (const z of est.zeilen) {
      const em = messer(z, f.fett[i] === true, f.kursiv[i] === true);
      if (em === null) return null;
      if (em * est.size > fl[i].breite + 0.3) {
        return { passt: false, meldung: "Der Text ist mit dieser Schrift zu breit für die Fläche. Bitte kürzen, eine kleinere Größe oder eine schmalere Schrift wählen." };
      }
    }
  }
  return { passt: true };
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
