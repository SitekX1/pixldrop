import "server-only";
// Serverseitige Eingabepruefung fuer Kundendaten und Anfragen (Spiegel der Client-Regeln,
// aber verbindlich). Gibt bereinigte Werte zurueck; verwirft Steuerzeichen (Header-Injection).

// eslint-disable-next-line no-control-regex
const STEUERZEICHEN = /[\u0000-\u001f\u007f]/;
const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;

export interface Kunde {
  name: string;
  strasse: string;
  plz: string;
  ort: string;
  email: string;
  telefon?: string;
  hinweis?: string;
}

export type FeldFehler = Partial<Record<string, string>>;
export type Pruefung<T> = { ok: true; wert: T } | { ok: false; felder: FeldFehler };

function text(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

function einzeilig(v: unknown, min: number, max: number): string | null {
  const t = text(v);
  if (t == null || t.length < min || t.length > max || STEUERZEICHEN.test(t)) return null;
  return t;
}

export function pruefeKunde(roh: unknown): Pruefung<Kunde> {
  const f: FeldFehler = {};
  const r = (typeof roh === "object" && roh !== null ? roh : {}) as Record<string, unknown>;

  const name = einzeilig(r.name, 2, 100);
  if (!name) f.name = "Bitte gib deinen vollständigen Namen ein.";
  const strasse = einzeilig(r.strasse, 3, 120);
  if (!strasse) f.strasse = "Bitte gib Straße und Hausnummer ein.";
  const plz = text(r.plz);
  if (!plz || !/^[0-9]{5}$/.test(plz)) f.plz = "Bitte eine fünfstellige Postleitzahl eingeben.";
  const ort = einzeilig(r.ort, 2, 80);
  if (!ort) f.ort = "Bitte gib deinen Ort ein.";
  const email = einzeilig(r.email, 5, 200)?.toLowerCase() ?? null;
  if (!email || !EMAIL.test(email)) f.email = "Bitte eine gültige E-Mail eingeben.";

  let telefon: string | undefined;
  if (r.telefon != null && text(r.telefon) !== "") {
    const t = einzeilig(r.telefon, 3, 40);
    if (!t) f.telefon = "Bitte eine gültige Telefonnummer eingeben oder das Feld leer lassen.";
    else telefon = t;
  }
  let hinweis: string | undefined;
  if (r.hinweis != null && text(r.hinweis) !== "") {
    const h = text(r.hinweis);
    // Zeilenumbrueche erlaubt, sonstige Steuerzeichen nicht
    // eslint-disable-next-line no-control-regex
    if (!h || h.length > 500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(h)) f.hinweis = "Der Hinweis ist zu lang oder enthält ungültige Zeichen.";
    else hinweis = h;
  }

  if (Object.keys(f).length) return { ok: false, felder: f };
  return { ok: true, wert: { name: name!, strasse: strasse!, plz: plz!, ort: ort!, email: email!, telefon, hinweis } };
}

export interface AnfrageDaten {
  beschreibung: string;
  breite: number | null;
  tiefe: number | null;
  hoehe: number | null;
  farbe: string | null;
  name: string;
  email: string;
  datenschutz: boolean;
  rechte: boolean;
}

function mass(v: unknown): number | null | "fehler" {
  const t = text(v);
  if (t == null || t === "") return null;
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0 || n > 1000) return "fehler";
  return Math.round(n * 10) / 10;
}

export function pruefeAnfrage(roh: Record<string, unknown>): Pruefung<AnfrageDaten> {
  const f: FeldFehler = {};
  const beschreibung = text(roh.beschreibung);
  // eslint-disable-next-line no-control-regex
  if (!beschreibung || beschreibung.length < 20 || beschreibung.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(beschreibung)) {
    f.beschreibung = "Bitte beschreibe deine Idee in 20 bis 2000 Zeichen.";
  }
  const name = einzeilig(roh.name, 2, 100);
  if (!name) f.name = "Bitte gib deinen Namen ein.";
  const email = einzeilig(roh.email, 5, 200)?.toLowerCase() ?? null;
  if (!email || !EMAIL.test(email)) f.email = "Bitte eine gültige E-Mail eingeben.";

  const m: Record<"breite" | "tiefe" | "hoehe", number | null> = { breite: null, tiefe: null, hoehe: null };
  for (const k of ["breite", "tiefe", "hoehe"] as const) {
    const v = mass(roh[k]);
    if (v === "fehler") f[k] = "Bitte ein Maß in mm zwischen 1 und 1000 angeben oder leer lassen.";
    else m[k] = v;
  }

  const farbeRoh = text(roh.farbe);
  let farbe: string | null = null;
  if (farbeRoh && farbeRoh !== "egal") {
    if (!/^[a-z0-9-]{1,40}$/.test(farbeRoh)) f.farbe = "Ungültige Farbe.";
    else farbe = farbeRoh;
  }

  const datenschutz = roh.datenschutz === true || roh.datenschutz === "true";
  const rechte = roh.rechte === true || roh.rechte === "true";
  if (!datenschutz) f.datenschutz = "Bitte bestätige den Datenschutzhinweis.";

  if (Object.keys(f).length) return { ok: false, felder: f };
  return {
    ok: true,
    wert: { beschreibung: beschreibung!, breite: m.breite, tiefe: m.tiefe, hoehe: m.hoehe, farbe, name: name!, email: email!, datenschutz, rechte },
  };
}
