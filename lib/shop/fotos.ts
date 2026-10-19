import type { UmfaerbModus } from "./umfaerben";
// Echte Produktfotos (public/shop/fotos/<slug>/<n>.webp, quadratisch zugeschnitten, 1100 px).
// Reihenfolge = Anzeigereihenfolge, das erste Bild ist das Hauptbild (Karte + Galerie).
export interface Foto { src: string; alt: string }

const ALT: Record<string, string[]> = {
  // Foto 1 (alle fünf Untersetzer) ist zugleich das Titelbild (COVER_IST_FOTO1) und das Foto, auf das die Farbwahl gelegt wird; Foto 2 = 7.webp (Aufbewahrungsbox, Option „Mit Box“)
  "wochentags-untersetzer-set": [
    "Fünf Wochentags-Untersetzer Montag bis Freitag in deiner Farbkombination",
    "Aufbewahrungsbox für die Wochentags-Untersetzer, Option „Mit Box“",
  ],
  // Foto 1 (Montag) ist zugleich das Titelbild (COVER_IST_FOTO1): kein zweites Cover davor; Wochenwahl wechselt das Foto, Farbwahl färbt es um
  "wochentags-untersetzer-einzeln": [
    "Untersetzer Montag: Noch nicht.",
    "Untersetzer Dienstag: Läuft. Irgendwie.",
    "Untersetzer Mittwoch: Halbzeit.",
    "Untersetzer Donnerstag: Fast geschafft.",
    "Untersetzer Freitag: Endlich.",
  ],
  // Titelbild (Cover) zuerst, dann Frontsicht (5.webp), Seitenansicht mit Griff (6.webp), Draufsicht (7.webp), zuletzt (Datei 1.webp) der Becher mit leerem Namensfeld: darauf werden Farben und Text deiner Wahl live gelegt (components/shop/BecherAufdruck.tsx, LIVE_FOTO); die Galerie springt beim Ändern automatisch dorthin
  "stiftebecher-tasse": [
    "Stiftebecher in Frontsicht mit Namensschild (Beispiel „Eddie“)",
    "Stiftebecher in Seitenansicht mit Griff",
    "Stiftebecher in Draufsicht, innen und von unten",
    "Stiftebecher mit gerillter Wand und leerem Namensfeld, darauf dein Text und deine Farben (Vorschau)",
  ],
  // Titelbild (Cover) zuerst, dann 5.webp (Beispiel „Max Mustermann“), 6.webp (Rückseite), zuletzt 7.webp = Blanko-Schild von vorn (gestaltetes Bild): Farbe und Text deiner Wahl werden live daraufgelegt (components/shop/NamensschildAufdruck.tsx), die Galerie springt beim Ändern dorthin
  "namensschild": [
    "Namensschild mit Ständer, Beispieltext „Max Mustermann“",
    "Namensschild von hinten mit Ständer",
    "Namensschild von vorn mit deinem Text und deiner Farbe (Vorschau)",
  ],
  // Titelbild (Cover) zuerst, dann 3.webp (stehend mit Glas): darauf werden Farben und Text deiner Wahl live gelegt (components/shop/UntersetzerAufdruck.tsx); die Galerie springt beim Ändern dorthin
  "spruch-untersetzer": [
    "Individueller Untersetzer stehend neben einem Glas mit Zitrone und Minze, darauf dein Text und deine Farben (Vorschau)",
  ],
  "geister-set": [
    "Drei große Geister nebeneinander",
    "Drei große Geister leuchten mit LED-Teelicht im Dunkeln",
    "Großer Geist mit einem Auge zwinkernd",
    "Großer Geist mit schiefem Kopf",
    "Großer Geist, Vorderansicht",
  ],
  "geister-set-klein": [
    "Drei kleine Geister nebeneinander",
    "Kleiner Geist, Vorderansicht",
    "Kleiner Geist, leicht seitlich",
    "Kleiner Geist mit schiefem Kopf",
  ],
  // Foto 1 = Tageslicht (orange Körper, schwarzer Stiel): Körper- und Stielfarbe deiner Wahl werden live eingefärbt (Maske 1.m.webp); Foto 2 = leuchtend im Dunkeln, immer Originalfarben
  "kuerbis-laterne": [
    "Kürbis mit Gesicht bei Tageslicht, orange mit schwarzem Stiel",
    "Kürbis mit Gesicht leuchtet im Dunkeln mit LED-Teelicht (Foto in Originalfarben)",
  ],
  // Dateien 2, 3, 1: Titelbild = ganzer Körper von oben (2.webp), siehe FOTO_DATEIEN. Fotos zeigen die weiße Ausführung (kein Umfärben)
  "skelett-beweglich": [
    "Bewegliches Skelett von oben, Arm zur Seite gestreckt (weiße Ausführung)",
    "Bewegliches Skelett sitzt, die Gelenke sind beweglich",
    "Bewegliches Skelett liegt in lockerer Pose",
  ],
  // Titelbild (Cover, mittel + klein im warmen Interieur) kommt automatisch zuerst; Galerie nur 2 Einzelbilder: 5.webp mittel, 6.webp klein (Alex 19.10.)
  "design-kuerbis": [
    "Design-Kürbis mittel in Latte mit weißem Strunk im Herbstlicht",
    "Design-Kürbis klein in Olivgrün mit Latte-Strunk",
  ],
  "kuerbis-teelichthalter": [
    "Kürbis-Teelichthalter mit brennendem LED-Teelicht",
    "Kürbis-Teelichthalter von oben schräg",
    "Kürbis-Teelichthalter von der Seite",
  ],
  "halloween-untersetzer-set": [
    "Drei Halloween-Untersetzer nebeneinander",
    "Drei Halloween-Untersetzer in Draufsicht",
    "Halloween-Untersetzer mit Kürbis",
    "Halloween-Untersetzer mit Geistern",
    "Halloween-Untersetzer mit Spukhaus",
    "Rückseite des Untersetzers mit selbstklebendem Kork (Option „Mit selbstklebendem Kork“)",
  ],
  "halloween-untersetzer-einzeln": [
    "Halloween-Untersetzer mit Kürbis",
    "Halloween-Untersetzer mit Geistern",
    "Halloween-Untersetzer mit Spukhaus",
    "Rückseite des Untersetzers mit selbstklebendem Kork (Option „Mit selbstklebendem Kork“)",
  ],
  "kuerbis-klein-set": [
    "Vier kleine Kürbisse mit Gesicht nebeneinander",
    "Vier kleine Kürbisse, Gruppenfoto",
    "Vier kleine Kürbisse, Gruppenfoto von schräg",
    "Kleiner Kürbis in Birnenform, zwinkernd",
    "Kleiner Kürbis mit Zunge",
    "Kleiner Kürbis, lachend",
    "Kleiner Kürbis, breit grinsend",
  ],
};

/** Dateinummern in Anzeigereihenfolge, wenn sie von 1, 2, 3 ... abweicht (Stiftebecher: Frontsicht 5, Seite 6, Draufsicht 7, zuletzt die Live-Vorschau 1.webp). */
export const FOTO_DATEIEN: Record<string, number[]> = { "stiftebecher-tasse": [5, 6, 7, 1], "skelett-beweglich": [2, 3, 1], "design-kuerbis": [5, 6], "spruch-untersetzer": [3], "wochentags-untersetzer-set": [1, 7], "namensschild": [5, 6, 7] };
/** Index (Anzeigereihenfolge) des Fotos, das die Live-Vorschau ist (umgefärbt, mit Aufdruck); Standard 0. */
export const LIVE_FOTO: Record<string, number> = { "stiftebecher-tasse": 3, "namensschild": 2 };
export const liveIdx = (slug: string): number => LIVE_FOTO[slug] ?? 0;

/** Produkte mit eigenem Cover-Bild für die Shop-Übersicht (public/shop/cover/<slug>.webp, 1100 × 1100). Die Galerie auf der Produktseite bleibt unverändert. Slug hier eintragen, sobald die Datei liegt. */
export const COVER: string[] = [
  "design-kuerbis",
  "geister-set",
  "geister-set-klein",
  "halloween-untersetzer-einzeln",
  "halloween-untersetzer-set",
  "kuerbis-klein-set",
  "kuerbis-laterne",
  "kuerbis-teelichthalter",
  "namensschild",
  "skelett-beweglich",
  "spruch-untersetzer",
  "stiftebecher-tasse",
  "wochentags-untersetzer-einzeln",
  "wochentags-untersetzer-set",
];
/** Zweites Cover im Design-Stil (Datei <slug>-design.webp) für die Ansicht außerhalb der Halloween-Kollektion ("Alle", "Sonstiges"). */
/** Artikel, deren Titelbild schon Foto 1 der Galerie ist (dann kein zusätzliches Cover als erstes Galeriebild). */
export const COVER_IST_FOTO1: string[] = ["wochentags-untersetzer-einzeln", "wochentags-untersetzer-set"];
export const COVER_DESIGN: string[] = ["kuerbis-teelichthalter"];
export const coverFuer = (slug: string, halloweenSicht = false): string | undefined =>
  !COVER.includes(slug) ? undefined : !halloweenSicht && COVER_DESIGN.includes(slug) ? `/shop/cover/${slug}-design.webp` : `/shop/cover/${slug}.webp`;

export function fotosFuer(slug: string): Foto[] {
  return (ALT[slug] ?? []).map((alt, i) => ({ src: `/shop/fotos/${slug}/${FOTO_DATEIEN[slug]?.[i] ?? i + 1}.webp`, alt }));
}

/** Welche Fotos beim Farbwechsel umgefärbt werden (Masken liegen als <n>.m.webp daneben), siehe lib/shop/umfaerben.ts. */

export const UMFAERBEN: Record<string, UmfaerbModus> = {
  "wochentags-untersetzer-set": "kombi",
  "wochentags-untersetzer-einzeln": "kombi",
  "stiftebecher-tasse": "becher",
  "namensschild": "schild",
  "spruch-untersetzer": "untersetzer",
  "geister-set": "farbe",
  "geister-set-klein": "farbe",
  "kuerbis-teelichthalter": "farbe",
  "kuerbis-laterne": "teile",
  "kuerbis-klein-set": "farbe",
};

/** Fotos ohne Maske, die nie umgefärbt werden (Kork-Rückseite): Slug -> Fotonummern (0-basiert). */
/** Beschriftung der Motivfotos (Halloween-Untersetzer einzeln): Foto 1 bis 3 zeigen je ein Motiv, der Name steht in Gruselschrift auf dem Bild. */
export const MOTIV_BESCHRIFTUNG: Record<string, string[]> = { "halloween-untersetzer-einzeln": ["Kürbis", "Geister", "Spukhaus"] };
export const OHNE_UMFAERBEN: Record<string, number[]> = {
  "namensschild": [0, 1], // Anzeige-Index: 0 und 1 (Beispiel, Rückseite) bleiben Originale, 2 ist die Live-Vorschau
  "stiftebecher-tasse": [0, 1, 2], // Anzeige-Index: 0-2 = Frontsicht, Seitenansicht, Draufsicht bleiben Originale, 3 ist die Live-Vorschau
  "kuerbis-laterne": [1], // Dunkel-Foto mit LED-Teelicht: Originalfarben
  "halloween-untersetzer-set": [5],
  "halloween-untersetzer-einzeln": [3],
};

/** Foto 1 zeigt diese echte Farbe: Ist sie gewählt (Abstand klein), erscheint das unveränderte Foto statt des umgefärbten Canvas. */
export const ORIGINALFARBE: Record<string, string> = {
  "stiftebecher-tasse": "#1c1c1c", "namensschild": "#1c1c1c", "kuerbis-teelichthalter": "#1c1c1c",
  "spruch-untersetzer": "#1c1c1c", "halloween-untersetzer-set": "#1c1c1c", "halloween-untersetzer-einzeln": "#1c1c1c",
  "geister-set": "#f4f1ea", "geister-set-klein": "#f4f1ea", "kuerbis-klein-set": "#ff8a1f",
}
/** Mehrteilige Fotos: echte Farben der Teile im Foto. Sind alle Teile in dieser Farbe gewählt (Abstand klein), erscheint das unveränderte Foto. */
export const ORIGINAL_TEILE: Record<string, Record<string, string>> = { "kuerbis-laterne": { koerper: "#ff8a1f", stiel: "#1c1c1c" } };
export function istOriginalTeile(slug: string, teile?: Record<string, string>): boolean {
  const o = ORIGINAL_TEILE[slug];
  if (!o || !teile) return false;
  return Object.entries(o).every(([id, hex]) => { const g = teile[id]; if (!g) return false; const n = (h: string) => { const v = parseInt(h.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }; const [a, b] = [n(g), n(hex)]; return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < ORIGINAL_ABSTAND; });
}
/** Abstand (RGB), bis zu dem die gewählte Farbe als "Farbe des Fotos" gilt: dann Originalfoto statt Umfärbung. */
export const ORIGINAL_ABSTAND = 55;
/** Zusätzlich nötige Linienfarbe für das Originalfoto (Individueller Untersetzer: Schwarz + weiße Linien = Foto). */
export const ORIGINAL_LINIE: Record<string, string> = { "spruch-untersetzer": "#f4f1ea" };

/** Welche Fotos beim Farbwechsel umgefärbt werden dürfen: nur Foto 1 (Live-Vorschau); alle weiteren sind Alex' Originale ("Foto: Beispielstück").
 *  Ausnahme: Einzel-Wochentags-Untersetzer, dort zeigt jedes der 5 Tagesfotos die gewählte Farbkombination. */
export function darfUmfaerben(slug: string, idx: number): boolean {
  if (OHNE_UMFAERBEN[slug]?.includes(idx)) return false;
  if (slug === "wochentags-untersetzer-einzeln") return idx >= 0 && idx < 5;
  return idx === liveIdx(slug);
};

/** Artikel, bei denen Foto 1 die Live-Vorschau ist: Farben und Text des Kunden werden direkt aufs Foto gelegt (es gibt nirgends mehr einen extra „Deine Wahl Live“-Knopf, Alex 2026-10-16). */
export const MIT_AUFDRUCK = ["namensschild", "spruch-untersetzer", "stiftebecher-tasse"];

/** Einzel-Untersetzer: gewählter Wochentag (Kürzel aus ProductBuy) -> Fotonummer (0-basiert). */
export const TAG_FOTO: Record<string, number> = { Mo: 0, Di: 1, Mi: 2, Do: 3, Fr: 4 };
