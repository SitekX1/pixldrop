import "server-only";
// Zugriff auf die Shop-Datenbank OHNE service_role: PostgREST-RPCs und Storage mit dem
// (oeffentlichen) anon-Schluessel plus eigenem Geheimnis (p_secret) fuer die shop_*-Funktionen.
// Das Geheimnis wird nie geloggt und nie in Fehlermeldungen uebernommen.

export type FetchFn = typeof fetch;

export interface DbConfig {
  url: string;
  anonKey: string;
  secret: string;
}

export interface Db {
  /** Ruft public.<name>(p_secret, ...args) auf. Alle Parameter muessen angegeben werden (PostgREST). */
  rpc<T = Record<string, unknown>>(name: string, args: Record<string, unknown>): Promise<T>;
  /** Bild in den privaten Bucket legen. true bei Erfolg. */
  upload(pfad: string, bytes: Uint8Array, mime: string): Promise<boolean>;
  /** Datei loeschen. true bei Erfolg (auch wenn schon weg). */
  remove(pfad: string): Promise<boolean>;
}

export class DbFehler extends Error {
  constructor(public readonly stufe: string, public readonly httpStatus?: number) {
    super(`DB-Fehler (${stufe}${httpStatus ? " " + httpStatus : ""})`);
    this.name = "DbFehler";
  }
}

export const BUCKET = "shop-anfragen";
const TIMEOUT_MS = 10_000;

export function erzeugeDb(cfg: DbConfig, fetchImpl: FetchFn = fetch): Db {
  const kopf = { apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}` };

  return {
    async rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
      if (!/^[a-z_]+$/.test(name)) throw new DbFehler("ungueltiger_rpc_name");
      let res: Response;
      try {
        res = await fetchImpl(`${cfg.url}/rest/v1/rpc/${name}`, {
          method: "POST",
          headers: { ...kopf, "Content-Type": "application/json" },
          body: JSON.stringify({ p_secret: cfg.secret, ...args }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
          cache: "no-store",
        });
      } catch {
        throw new DbFehler(`rpc_${name}_netz`);
      }
      if (!res.ok) throw new DbFehler(`rpc_${name}`, res.status);
      try {
        return (await res.json()) as T;
      } catch {
        throw new DbFehler(`rpc_${name}_antwort`);
      }
    },

    async upload(pfad, bytes, mime) {
      try {
        const res = await fetchImpl(`${cfg.url}/storage/v1/object/${BUCKET}/${pfad}`, {
          method: "POST",
          headers: { ...kopf, "Content-Type": mime, "x-upsert": "false", "cache-control": "max-age=3600" },
          body: new Blob([new Uint8Array(bytes)], { type: mime }),
          signal: AbortSignal.timeout(TIMEOUT_MS * 2),
          cache: "no-store",
        });
        return res.ok;
      } catch {
        return false;
      }
    },

    async remove(pfad) {
      try {
        const res = await fetchImpl(`${cfg.url}/storage/v1/object/${BUCKET}/${pfad}`, {
          method: "DELETE",
          // Geheimnis als Header: die Storage-Policy shop_loeschen_erlaubt prueft es gegen den Hash
          headers: { ...kopf, "x-shop-secret": cfg.secret },
          signal: AbortSignal.timeout(TIMEOUT_MS),
          cache: "no-store",
        });
        // 404 gilt bewusst als Fehler: bei verweigertem Zugriff (RLS) meldet Storage ebenfalls 404.
        // Lieber Datei + Zeile behalten und melden, als Zeilen loeschen und Bilder verwaisen lassen.
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}
