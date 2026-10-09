// Farben-Datenquelle. Echte Lagerfarben kommen aus dem RPC public.shop_farben() des
// Admin-Panel-Projekts (nur Name, Hex, Material, vorraetig; keine Gewichte/Preise/IDs).
// Ohne Konfiguration oder bei Fehlern greift die Platzhalterliste. Aufrufer unveraendert.
import { farbeId } from "./server/preise";

export interface Farbe {
  id: string;
  name: string;
  hex: string;
  /** Nur gesetzt, wenn der RPC ein Material liefert (z. B. "PLA"). */
  material?: string;
}

// Standardfarben (Fallback, solange der RPC nicht erreichbar ist).
const STANDARDFARBEN: Farbe[] = [
  { id: "honig", name: "Honiggold", hex: "#f0bb55" },
  { id: "mint", name: "Mintgrün", hex: "#4fb894" },
  { id: "kaffee", name: "Kaffeebraun", hex: "#6b4423" },
  { id: "weiss", name: "Weiß", hex: "#f4f1ea" },
  { id: "schwarz", name: "Schwarz", hex: "#1c1c1c" },
  { id: "kuerbis", name: "Kürbisorange", hex: "#ff8a1f" },
];

interface FarbZeile {
  name?: unknown;
  hex?: unknown;
  material?: unknown;
  vorraetig?: unknown;
}

/** Wandelt die RPC-Zeilen in Farben um (gleiche Farbe in mehreren Materialien -> ein Eintrag). */
export function farbenAusZeilen(zeilen: unknown): Farbe[] {
  if (!Array.isArray(zeilen)) return [];
  const map = new Map<string, Farbe>();
  for (const z of zeilen as FarbZeile[]) {
    if (typeof z?.name !== "string" || typeof z.hex !== "string") continue;
    if (z.vorraetig === false) continue;
    if (!/^#[0-9A-Fa-f]{6}$/.test(z.hex)) continue;
    const id = farbeId(z.name);
    if (!id) continue;
    const material = typeof z.material === "string" && z.material ? z.material : undefined;
    const vorhanden = map.get(id);
    if (vorhanden) {
      if (material && !vorhanden.material?.split(" / ").includes(material)) {
        vorhanden.material = vorhanden.material ? `${vorhanden.material} / ${material}` : material;
      }
      continue;
    }
    map.set(id, { id, name: z.name, hex: z.hex.toLowerCase(), ...(material ? { material } : {}) });
  }
  return Array.from(map.values());
}

/** Liest die Lagerfarben. null = nicht konfiguriert oder Fehler (kein stiller Platzhalter). */
export async function holeLagerFarben(fetchImpl: typeof fetch = fetch): Promise<Farbe[] | null> {
  const url = process.env.SHOP_SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SHOP_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return null;
  try {
    const res = await fetchImpl(`${url}/rest/v1/rpc/shop_farben`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(4000),
      // kurz zwischenspeichern: Lagerstand aendert sich selten, Seite bleibt schnell
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return farbenAusZeilen(await res.json());
  } catch {
    return null;
  }
}

/** Fuer die Anzeige: Lagerfarben, bei Fehlern/ohne Konfiguration die Platzhalterliste. */
export async function holeFarben(): Promise<Farbe[]> {
  const lager = await holeLagerFarben();
  return lager ?? STANDARDFARBEN;
}
