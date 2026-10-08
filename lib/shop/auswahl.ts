// Zwischenstand der Auswahl (Artikel, Farbe, Text) nur im sessionStorage dieses Tabs.
// Technisch erforderlich, wird nirgendwohin übertragen. Keine Kundendaten (Adresse, Mail).
export interface Auswahl {
  slug: string;
  farbeId: string | null;
  optionen: Record<string, string>;
  text: string;
  schriftId: string | null;
  menge: number;
}
const KEY = "shop-auswahl-v1";
export function ladeAuswahl(): Auswahl | null {
  try {
    const r = sessionStorage.getItem(KEY);
    return r ? (JSON.parse(r) as Auswahl) : null;
  } catch {
    return null;
  }
}
export function speichereAuswahl(a: Auswahl | null) {
  try {
    if (a) sessionStorage.setItem(KEY, JSON.stringify(a));
    else sessionStorage.removeItem(KEY);
    window.dispatchEvent(new Event("shop-auswahl"));
  } catch {
    /* Speicher gesperrt: Auswahl bleibt nur im Tab-Zustand */
  }
}
