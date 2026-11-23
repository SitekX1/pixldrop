// Wandbuchstaben: Preis, Passt-Prüfung und Gewicht aus einer Konfiguration.
// Läuft im Browser (Preisanzeige) UND auf dem Server (verbindliche Prüfung), kein server-only.
// Maße je Zeichen: lib/shop/schrift-masse.ts (erzeugt mit scripts/schrift-masse.py aus den Schriftdateien).
import masse from "./schrift-masse";
import { pruefeWunschtext } from "./textfilter";

/** Höhe der Großbuchstaben in cm. 24 und 30 cm gibt es nicht (Druckbett des P1S 256 mm, Alex 23.11.2026). */
export const WAND_HOEHEN = [5, 10, 15, 20] as const;
export type WandHoehe = (typeof WAND_HOEHEN)[number];

export const WAND_OBERFLAECHEN = [
  { id: "glatt", name: "Glatt", info: "Die sichtbare Seite ist geglättet (Ironing): gleichmäßig glatt, feine Schichtlinien sind je nach Licht kaum zu sehen." },
  { id: "strukturiert", name: "Strukturiert", info: "Die sichtbare Seite hat die feine, matte Struktur der Druckplatte. Sie kaschiert Schichtlinien und Fingerabdrücke." },
] as const;
export type WandOberflaeche = (typeof WAND_OBERFLAECHEN)[number]["id"];

export const WAND_FARBEN = [
  { id: "schwarz", name: "Schwarz", hex: "#1a1a1a" },
  { id: "weiss", name: "Weiß", hex: "#fbfaf6" },
  { id: "beige", name: "Beige", hex: "#e4d8bc" },
  { id: "grau", name: "Grau", hex: "#8e9089" },
  { id: "braun", name: "Braun", hex: "#a8785a" },
  { id: "olivgruen", name: "Olivgrün", hex: "#5a6d3d" },
] as const;

/** Preis je Zeichen in Cent (Vergleichspreise Etsy, Alex 23.11.2026; ACHTUNG: dort waren 25 % Rabatt aktiv, endgültige Preise noch offen). */
export const WAND_PREIS_CENT: Record<WandOberflaeche, Record<WandHoehe, number>> = {
  glatt: { 5: 283, 10: 459, 15: 549, 20: 639 },
  strukturiert: { 5: 193, 10: 373, 15: 463, 20: 553 },
};

/** Mengenrabatt: ab dieser Zeichenzahl (alle Zeilen zusammen, ohne Leerzeichen) 10 % auf die Summe. */
export const WAND_RABATT_AB_ZEICHEN = 10;
export const WAND_RABATT_PROZENT = 10;

export const WAND_MAX_ZEILEN = 3;
export const WAND_MAX_ZEICHEN_ZEILE = 20;

/** Nutzbare Kantenlänge auf dem Druckbett (256 mm abzüglich Rand). */
export const WAND_BETT_MM = 250;
/** Dicke der Buchstaben in mm (Testbuchstabe 5 mm). */
export const WAND_DICKE_MM = 5;
const DICHTE_G_CM3 = 1.24; // PLA
const FUELLFAKTOR = 0.9; // grobe Annahme (Wände + dünne Füllung), bis Alex' gewogene Werte vorliegen

/** Schriften, in denen Schreibweise "Erster Buchstabe groß, Rest klein" wählbar ist (Schreibschriften). */
export const WAND_SCHREIBSCHRIFTEN = new Set(["great-vibes", "parisienne", "dancing-script", "marck-script"]);
/** Schriften, die es nur in Regular gibt (kein Fett). */
export const WAND_NUR_REGULAR = new Set(["great-vibes", "mansalva", "parisienne", "marck-script"]);

export const ersterGross = (z: string) => {
  const t = z.toLowerCase();
  const i = t.search(/\p{L}/u);
  return i < 0 ? t : t.slice(0, i) + t[i].toUpperCase() + t.slice(i + 1);
};

/** Erlaubte Zeichen im Text (wie im Konfigurator; ob die Schrift sie hat, prüft pruefeWandKonfiguration). */
export const WAND_ZEICHEN_FILTER = /[^\p{L}\p{N} .,!&'-]/gu; // zum Entfernen im Eingabefeld
const UNERLAUBT = /[^\p{L}\p{N} .,!&'-]/u; // zum Prüfen (ohne g-Flag, kein lastIndex)

type Zeichenmass = [breite: number, hoehe: number, flaeche: number, unterGrundlinie: number];
const MASSE: Record<string, { zeichen: Record<string, Zeichenmass> }> = masse;

export const wandSchriftIds = () => Object.keys(MASSE);
export const hatWandSchrift = (id: string) => Object.prototype.hasOwnProperty.call(MASSE, id);
export const schriftHatZeichen = (id: string, ch: string) => hatWandSchrift(id) && !!MASSE[id].zeichen[ch];

/**
 * Passt die Umriss-Box des Buchstabens (b x h mm) aufs Druckbett? Der Buchstabe wird flach gedruckt und darf dafür gedreht werden
 * (schmale hohe Buchstaben gehen so diagonal). Die Box ist größer als der Buchstabe selbst, die Prüfung ist also vorsichtig.
 */
export function passtBoxAufsBett(bMm: number, hMm: number): boolean {
  for (let grad = 0; grad <= 90; grad++) {
    const r = (grad * Math.PI) / 180;
    const c = Math.cos(r), sn = Math.sin(r);
    if (bMm * c + hMm * sn <= WAND_BETT_MM && bMm * sn + hMm * c <= WAND_BETT_MM) return true;
  }
  return false;
}
export const passtAufsBett = (id: string, ch: string, hoeheCm: number) => {
  if (!schriftHatZeichen(id, ch)) return false;
  const m = MASSE[id].zeichen[ch];
  return passtBoxAufsBett(m[0] * hoeheCm * 10, m[1] * hoeheCm * 10);
};

/** Zeichen im Text, die bei dieser Höhe nicht aufs Druckbett passen (ohne Duplikate). */
export function nichtDruckbar(id: string, text: string, hoeheCm: number): string[] {
  const aus: string[] = [];
  for (const ch of text) if (ch !== " " && !passtAufsBett(id, ch, hoeheCm) && !aus.includes(ch)) aus.push(ch);
  return aus;
}
/** Größte angebotene Höhe, bei der alle Zeichen des Textes passen (0 = keine). */
export function maxWandHoehe(id: string, text: string): number {
  let best = 0;
  for (const h of WAND_HOEHEN) if (nichtDruckbar(id, text, h).length === 0) best = h;
  return best;
}

export interface WandZeileEingabe { text: string; schrift: string; hoeheCm: number; farbe: string }
export interface WandEingabe { zeilen: WandZeileEingabe[]; oberflaeche: string; schreibweise?: string }

export interface WandZeile {
  text: string; // endgültiger Druck-Text (Schreibweise angewandt)
  schrift: string;
  hoeheCm: WandHoehe;
  farbe: string;
  zeichen: number; // berechnete Zeichen (ohne Leerzeichen)
  cent: number; // Zeilenpreis vor Rabatt
  gewichtG: number;
}
export interface WandErgebnis {
  zeilen: WandZeile[];
  oberflaeche: WandOberflaeche;
  schreibweise: "eingabe" | "erster-gross";
  zeichen: number;
  summeCent: number; // vor Rabatt
  rabattCent: number;
  gesamtCent: number;
  gewichtG: number;
}
export type WandPruefung = { ok: true; wert: WandErgebnis } | { ok: false; code: string; meldung: string };

const fehler = (code: string, meldung: string): WandPruefung => ({ ok: false, code, meldung });

export function gewichtGramm(id: string, text: string, hoeheCm: number): number {
  let mm2 = 0;
  for (const ch of text) {
    if (ch === " " || !schriftHatZeichen(id, ch)) continue;
    mm2 += MASSE[id].zeichen[ch][2] * (hoeheCm * 10) ** 2;
  }
  return (mm2 * WAND_DICKE_MM * DICHTE_G_CM3 * FUELLFAKTOR) / 1000;
}

/** Verbindliche Prüfung + Preis. Der Server ruft diese Funktion mit der rohen Eingabe des Kunden auf. */
export function pruefeWandKonfiguration(eingabe: unknown): WandPruefung {
  const e = (typeof eingabe === "object" && eingabe !== null ? eingabe : {}) as Record<string, unknown>;
  const rohZeilen = Array.isArray(e.zeilen) ? e.zeilen : [];
  if (rohZeilen.length < 1 || rohZeilen.length > WAND_MAX_ZEILEN) return fehler("zeilen", `Bitte 1 bis ${WAND_MAX_ZEILEN} Zeilen angeben.`);
  const oberflaeche = WAND_OBERFLAECHEN.find((o) => o.id === e.oberflaeche)?.id;
  if (!oberflaeche) return fehler("oberflaeche", "Bitte eine Oberfläche wählen.");
  const schreibweise = e.schreibweise === "erster-gross" ? "erster-gross" : "eingabe";

  const zeilen: WandZeile[] = [];
  for (const [i, raw] of rohZeilen.entries()) {
    const z = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
    const nr = i + 1;
    const schrift = typeof z.schrift === "string" ? z.schrift : "";
    if (!hatWandSchrift(schrift)) return fehler("schrift", `Zeile ${nr}: Bitte eine Schrift aus der Liste wählen.`);
    const hoehe = WAND_HOEHEN.find((h) => h === z.hoeheCm);
    if (!hoehe) return fehler("hoehe", `Zeile ${nr}: Bitte eine Höhe aus der Liste wählen.`);
    const farbe = WAND_FARBEN.find((f) => f.id === z.farbe)?.id;
    if (!farbe) return fehler("farbe", `Zeile ${nr}: Bitte eine Farbe aus der Liste wählen.`);
    const roh = typeof z.text === "string" ? z.text : "";
    if (roh.length > WAND_MAX_ZEICHEN_ZEILE) return fehler("laenge", `Zeile ${nr}: höchstens ${WAND_MAX_ZEICHEN_ZEILE} Zeichen.`);
    if (UNERLAUBT.test(roh)) return fehler("zeichen", `Zeile ${nr}: Der Text enthält Zeichen, die nicht gedruckt werden können.`);
    let text = roh.trim().replace(/ {2,}/g, " ");
    if (!text) return fehler("leer", `Zeile ${nr}: Bitte einen Text eingeben.`);
    if (schreibweise === "erster-gross" && WAND_SCHREIBSCHRIFTEN.has(schrift)) text = ersterGross(text);
    const fehlt = [...text].filter((ch) => ch !== " " && !schriftHatZeichen(schrift, ch));
    if (fehlt.length) return fehler("zeichen-fehlt", `Zeile ${nr}: Diese Schrift hat kein „${fehlt[0]}“.`);
    const zuGross = nichtDruckbar(schrift, text, hoehe);
    if (zuGross.length) {
      const m = maxWandHoehe(schrift, text);
      return fehler("passt-nicht", `Zeile ${nr}: „${zuGross.join("“, „")}“ passt in ${hoehe} cm nicht aufs Druckbett.${m ? ` Mit höchstens ${m} cm geht es.` : " Bitte eine kleinere Höhe oder eine andere Schrift wählen."}`);
    }
    const zeichen = [...text].filter((ch) => ch !== " ").length;
    zeilen.push({ text, schrift, hoeheCm: hoehe, farbe, zeichen, cent: zeichen * WAND_PREIS_CENT[oberflaeche][hoehe], gewichtG: gewichtGramm(schrift, text, hoehe) });
  }
  const pruefung = pruefeWunschtext(zeilen.map((z) => z.text));
  if (!pruefung.ok) return fehler(pruefung.grund, pruefung.meldung);

  const zeichen = zeilen.reduce((s, z) => s + z.zeichen, 0);
  const summeCent = zeilen.reduce((s, z) => s + z.cent, 0);
  const rabattCent = zeichen >= WAND_RABATT_AB_ZEICHEN ? Math.round((summeCent * WAND_RABATT_PROZENT) / 100) : 0;
  const gewichtG = Math.round(zeilen.reduce((s, z) => s + z.gewichtG, 0) * 10) / 10;
  return { ok: true, wert: { zeilen, oberflaeche, schreibweise, zeichen, summeCent, rabattCent, gesamtCent: summeCent - rabattCent, gewichtG } };
}
