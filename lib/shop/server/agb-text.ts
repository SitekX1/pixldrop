import "server-only";
import { agbKlartext } from "../agb-daten";
// AGB-Klartext fuer die Bestaetigungsmail (dauerhafter Datentraeger, Art. 246a § 4 Abs. 3 EGBGB / § 312f BGB).
// Wird aus derselben Quelle erzeugt wie die Seite /3d-druck/agb (lib/shop/agb-daten.ts): beide sind damit immer identisch.
// Enthaelt der Text einen "[PLATZHALTER"-Marker, blockiert der Guard den Live-Betrieb (bestellung.ts, vorlagen.ts).

export const AGB_TEXT = agbKlartext();
