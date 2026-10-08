import "server-only";
// Upload-Pruefung: Dateityp wird an den "Magic Bytes" erkannt, nicht am Dateinamen oder
// am vom Browser gemeldeten Typ. Erlaubt: JPEG, PNG, WebP. Keine SVG/GIF/HEIC/PDF.

export const MAX_BILDER = 3;
/** Pro Datei (Bucket-Limit 4 MB). */
export const MAX_BILD_BYTES = 4 * 1024 * 1024;
/** Gesamte Anfrage: Vercel lehnt Request-Bodies ueber ca. 4,5 MB ab. */
export const MAX_GESAMT_BYTES = 4_200_000;

export type BildTyp = { mime: "image/jpeg" | "image/png" | "image/webp"; ext: "jpg" | "png" | "webp" };

export function erkenneBild(b: Uint8Array): BildTyp | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return { mime: "image/png", ext: "png" };
  }
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // RIFF
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50   // WEBP
  ) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

export type BildPruefung =
  | { ok: true; typ: BildTyp }
  | { ok: false; grund: "leer" | "zu_gross" | "typ" | "typ_abweichend" };

/** `gemeldeterTyp` ist der vom Browser gemeldete MIME-Typ; muss zum erkannten Typ passen. */
export function pruefeBild(bytes: Uint8Array, gemeldeterTyp: string): BildPruefung {
  if (bytes.length === 0) return { ok: false, grund: "leer" };
  if (bytes.length > MAX_BILD_BYTES) return { ok: false, grund: "zu_gross" };
  const typ = erkenneBild(bytes);
  if (!typ) return { ok: false, grund: "typ" };
  if (gemeldeterTyp !== typ.mime) return { ok: false, grund: "typ_abweichend" };
  return { ok: true, typ };
}
