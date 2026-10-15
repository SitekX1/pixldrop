import type { UmfaerbModus } from "./umfaerben";
// Echte Produktfotos (public/shop/fotos/<slug>/<n>.webp, quadratisch zugeschnitten, 1100 px).
// Reihenfolge = Anzeigereihenfolge, das erste Bild ist das Hauptbild (Karte + Galerie).
export interface Foto { src: string; alt: string }

const ALT: Record<string, string[]> = {
  "wochentags-untersetzer-set": [
    "Fünf Wochentags-Untersetzer Montag bis Freitag nebeneinander",
    "Wochentags-Untersetzer in der Box, davor der Montag-Untersetzer",
    "Box mit eingestellten Untersetzern von vorn",
    "Box mit eingestellten Untersetzern von der Seite",
    "Leere Box für die Wochentags-Untersetzer",
    "Wochentags-Untersetzer mit selbstklebender Korkunterseite (Option „Mit selbstklebendem Kork“), davor der Montag-Untersetzer",
  ],
  "wochentags-untersetzer-einzeln": [
    "Untersetzer Montag: Noch nicht.",
    "Untersetzer Dienstag: Läuft. Irgendwie.",
    "Untersetzer Mittwoch: Halbzeit.",
    "Untersetzer Donnerstag: Fast geschafft.",
    "Untersetzer Freitag: Endlich.",
    "Rückseite des Untersetzers mit selbstklebendem Kork (Option „Mit selbstklebendem Kork“)",
  ],
  // Foto 2 (Datei 1.webp) = Becher mit leerem Namensfeld; das Titelbild ist die Seitenansicht mit Henkel (Datei 2.webp), siehe FOTO_DATEIEN/LIVE_FOTO: Farben und Text deiner Wahl werden live daraufgelegt (components/shop/BecherAufdruck.tsx)
  "stiftebecher-tasse": [
    "Stiftebecher in Tassenform mit Henkel von der Seite (Beispielstück, Titelbild)",
    "Stiftebecher mit gerillter Wand und leerem Namensfeld, darauf dein Text und deine Farben (Vorschau)",
    "Stiftebecher mit Henkel, Schrägansicht",
    "Stiftebecher von oben",
  ],
  // Foto 1 = Blanko-Schild von vorn: Farbe und Text deiner Wahl werden live daraufgelegt (components/shop/NamensschildFoto.tsx)
  "namensschild": [
    "Namensschild von vorn mit deinem Text und deiner Farbe (Vorschau)",
    "Namensschild mit Ständer, Beispieltext",
    "Namensschild von schräg vorn, Beispieltext",
    "Namensschild von hinten",
  ],
  // Foto 1 = Untersetzer von oben ohne Text: Farben und Text deiner Wahl werden live daraufgelegt (components/shop/UntersetzerAufdruck.tsx)
  "spruch-untersetzer": [
    "Individueller Untersetzer von oben mit deinem Text und deinen Farben (Vorschau)",
    "Rückseite des Untersetzers mit selbstklebendem Kork (Option „Mit selbstklebendem Kork“)",
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

/** Dateinummern in Anzeigereihenfolge, wenn sie von 1, 2, 3 ... abweicht (Stiftebecher: Titelbild = Seitenansicht 2.webp, danach die Live-Vorschau 1.webp). */
export const FOTO_DATEIEN: Record<string, number[]> = { "stiftebecher-tasse": [2, 1, 3, 4] };
/** Index (Anzeigereihenfolge) des Fotos, das die Live-Vorschau ist (umgefärbt, mit Aufdruck); Standard 0. */
export const LIVE_FOTO: Record<string, number> = { "stiftebecher-tasse": 1 };
export const liveIdx = (slug: string): number => LIVE_FOTO[slug] ?? 0;

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
  "kuerbis-klein-set": "farbe",
  "halloween-untersetzer-set": "grund",
  "halloween-untersetzer-einzeln": "grund",
};

/** Fotos ohne Maske, die nie umgefärbt werden (Kork-Rückseite): Slug -> Fotonummern (0-basiert). */
export const OHNE_UMFAERBEN: Record<string, number[]> = {
  "spruch-untersetzer": [1],
  "namensschild": [1, 2, 3], // Beispielfotos mit Schrift bleiben Alex' Originale
  "stiftebecher-tasse": [0, 2, 3], // Anzeige-Index: Titelbild und Beispielfotos bleiben Originale, Index 1 ist die Live-Vorschau // Alex' Originalfotos bleiben unverändert (Beispielstücke)
  "wochentags-untersetzer-set": [5],
  "wochentags-untersetzer-einzeln": [5],
  "halloween-untersetzer-set": [5],
  "halloween-untersetzer-einzeln": [3],
};

/** Foto 1 zeigt diese echte Farbe: Ist sie gewählt (Abstand klein), erscheint das unveränderte Foto statt des umgefärbten Canvas. */
export const ORIGINALFARBE: Record<string, string> = {
  "stiftebecher-tasse": "#1c1c1c", "namensschild": "#1c1c1c", "kuerbis-teelichthalter": "#1c1c1c",
  "spruch-untersetzer": "#1c1c1c", "halloween-untersetzer-set": "#1c1c1c", "halloween-untersetzer-einzeln": "#1c1c1c",
  "geister-set": "#f4f1ea", "geister-set-klein": "#f4f1ea", "kuerbis-klein-set": "#ff8a1f",
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

/** Artikel, bei denen Foto 1 die Live-Vorschau ist: Farben und Text des Kunden werden direkt aufs Foto gelegt (kein extra „Deine Wahl Live“). */
export const MIT_AUFDRUCK = ["namensschild", "spruch-untersetzer", "stiftebecher-tasse"];

/** Einzel-Untersetzer: gewählter Wochentag (Kürzel aus ProductBuy) -> Fotonummer (0-basiert). */
export const TAG_FOTO: Record<string, number> = { Mo: 0, Di: 1, Mi: 2, Do: 3, Fr: 4 };
