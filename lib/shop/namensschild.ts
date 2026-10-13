// Namensschild: Layout in mm (Koordinaten der Druckdatei Namensschild_Platte_Basis.stl, y nach oben).
// MUSS mit D:\Apps\3D-Druck\tools\textplatte\textplatte.py (Konstanten NS_*) übereinstimmen: Vorschau = Druck.
//
// Aufbau: Name groß (füllt die Breite, höchstens NAME_KAPPE_MAX), Balken, Titel klein (feste Höhe, nur verkleinern).
// Die Schrift ist 1 mm bündig in die Platte eingelegt, Platte/Balken/Schrift: zwei Farben (Schildfarbe, Schriftfarbe).

export const NS = {
  mitte: 99.25, zoneL: 19.44, zoneR: 179.06,
  nameGrundlinie: 29.0, nameKappeMax: 16.0, nameKappeMin: 8.0,
  balkenUnten: 22.1, balkenOben: 23.7,
  titelGrundlinie: 11.4, titelKappe: 6.5, titelKappeMin: 4.0,
} as const;
export const NS_BREITE = NS.zoneR - NS.zoneL;

/** Sichtbarer Umriss der Platte (ohne den im Ständer steckenden Fuß). */
export const NS_UMRISS: [number, number][] = [[0, 0], [12, 48], [186, 48], [196.5, 34], [188, 0]];
/** Ständer von vorn: x 0,5 bis 190,1, 13 mm hoch unterhalb der Platte (Platte steckt mit ihrem Fuß im Schlitz). */
export const NS_STAENDER = { x: 0.5, breite: 189.6, hoehe: 13 } as const;

/** Kappenhöhe / Schriftgröße (em) je Schrift, aus den Schriftdateien (OS/2 sCapHeight bzw. Höhe des H). */
export const KAPPE_JE_EM: Record<string, number> = {
  "dancing-script": 0.72, "pacifico": 0.84, "caveat": 0.61, "satisfy": 0.749, "lobster": 0.748, "permanent-marker": 0.7402,
  "bangers": 0.721, "righteous": 0.7002, "playfair": 0.708, "cinzel": 0.7, "montserrat": 0.7, "oswald": 0.81,
  "artsy-morning": 1.07, "bulbear": 0.714, "montague": 0.7, "oldwest": 0.77, "rosemartin": 0.77, "roundex": 0.7358,
  "start-story": 0.724, "street-year": 0.714, "the-sally": 0.7, "travellia": 0.7, "vegan-days": 0.7, "welcome-drama": 0.714,
  "winter-draw": 0.724, "wood-dragon": 0.7,
};
export const kappeJeEm = (schriftId: string) => KAPPE_JE_EM[schriftId] ?? 0.7;

/** Kappenhöhe (mm) der Zeile bei gegebener Textbreite: Name füllt die Zone, Titel nur verkleinern.
 *  breiteBeiKappe1 = gemessene Textbreite in mm bei Kappenhöhe 1 mm (im Browser aus der echten Schrift gemessen). */
export function nameKappe(breiteBeiKappe1: number): number {
  return Math.min(NS.nameKappeMax, NS_BREITE / breiteBeiKappe1);
}
export function titelKappe(breiteBeiKappe1: number): number {
  return Math.min(NS.titelKappe, NS_BREITE / breiteBeiKappe1);
}
