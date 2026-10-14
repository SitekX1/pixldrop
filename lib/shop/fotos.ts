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
  ],
  "wochentags-untersetzer-einzeln": [
    "Untersetzer Montag: Noch nicht.",
    "Untersetzer Dienstag: Läuft. Irgendwie.",
    "Untersetzer Mittwoch: Halbzeit.",
    "Untersetzer Donnerstag: Fast geschafft.",
    "Untersetzer Freitag: Endlich.",
  ],
  "stiftebecher-tasse": [
    "Stiftebecher in Tassenform mit Namensfeld, Vorderseite",
    "Stiftebecher in Tassenform mit Henkel von der Seite",
    "Stiftebecher mit Henkel, Schrägansicht",
    "Stiftebecher von oben",
  ],
  "namensschild": [
    "Namensschild mit Ständer, Beispieltext",
    "Namensschild von schräg vorn, Beispieltext",
    "Namensschild ohne Schrift (Blanko)",
    "Namensschild von hinten",
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
  ],
  "halloween-untersetzer-einzeln": [
    "Halloween-Untersetzer mit Kürbis",
    "Halloween-Untersetzer mit Geistern",
    "Halloween-Untersetzer mit Spukhaus",
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

export function fotosFuer(slug: string): Foto[] {
  return (ALT[slug] ?? []).map((alt, i) => ({ src: `/shop/fotos/${slug}/${i + 1}.webp`, alt }));
}

/** Welche Fotos beim Farbwechsel umgefärbt werden (Masken liegen als <n>.m.webp daneben), siehe lib/shop/umfaerben.ts. */

export const UMFAERBEN: Record<string, UmfaerbModus> = {
  "wochentags-untersetzer-set": "kombi",
  "wochentags-untersetzer-einzeln": "kombi",
  "stiftebecher-tasse": "farbe",
  "namensschild": "schild",
  "geister-set": "farbe",
  "geister-set-klein": "farbe",
  "kuerbis-teelichthalter": "farbe",
  "kuerbis-klein-set": "farbe",
  "halloween-untersetzer-set": "grund",
  "halloween-untersetzer-einzeln": "grund",
};

/** Einzel-Untersetzer: gewählter Wochentag (Kürzel aus ProductBuy) -> Fotonummer (0-basiert). */
export const TAG_FOTO: Record<string, number> = { Mo: 0, Di: 1, Mi: 2, Do: 3, Fr: 4 };
