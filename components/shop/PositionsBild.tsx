import { KOMBI_KEY, type Produkt } from "@/lib/shop/produkte";
import type { Auswahl } from "@/lib/shop/auswahl";
import { SCHRIFTEN } from "@/lib/shop/schriften";
import { formatAusOptionen, istFormatSchluessel, standardFormat, zeilenAnzahl } from "@/lib/shop/textformat";
import ProductImage from "./ProductImage";
import FotoMiniatur, { miniaturModus } from "./FotoMiniatur";
import { fotosFuer, liveIdx, MIT_AUFDRUCK, TAG_FOTO } from "@/lib/shop/fotos";
import type { Farbe } from "@/lib/shop/farben";
import { teilHexe } from "@/lib/shop/teilfarben";
import { LINIENFARBE_KEY } from "@/lib/shop/textfarbe";
import { SCHRIFT_TITEL_KEY } from "@/lib/shop/schriften";

export function kombiVon(p: Produkt, a: Auswahl) {
  return p.kombinationen?.find((k) => k.id === a.optionen[KOMBI_KEY]);
}

/** Vorschau einer Warenkorb-/Bon-Position: Farbe, Text, Schrift, Fett/Kursiv und Größe wie die Live-Vorschau im Kaufbereich. */
export default function PositionsBild({ p, a, farbeHex, textfarbeHex, typ = "Muster", farben }: { p: Produkt; a: Auswahl; farbeHex?: string; textfarbeHex?: string; typ?: string; /** Lagerfarben: nötig für mehrteilige Artikel (teilFarben) */ farben?: Farbe[] }) {
  const pers = p.personalisierung;
  const schrift = pers ? SCHRIFTEN.find((s) => s.id === (pers.festeSchrift ?? a.schriftId)) : undefined;
  const titelSchrift = pers?.schriftJeZeile ? SCHRIFTEN.find((s) => s.id === a.optionen[SCHRIFT_TITEL_KEY]) : undefined;
  let format;
  if (pers && schrift) {
    const nur = Object.fromEntries(Object.entries(a.optionen).filter(([k]) => istFormatSchluessel(k)));
    format = { fmt: formatAusOptionen(nur, zeilenAnzahl(pers)) ?? standardFormat(zeilenAnzahl(pers)), breite: schrift.breite, schriftId: schrift.id, ...(titelSchrift ? { titel: { schriftId: titelSchrift.id, breite: titelSchrift.breite, family: titelSchrift.family } } : {}) };
  }
  // Echtes Foto statt Zeichnung: Foto 1 (bzw. Foto des gewählten Wochentags) in gewählter Farbe, bei Wunschtext-Artikeln mit Aufdruck (wie die Galerie)
  const kombiFarben = kombiVon(p, a)?.farben.map((f) => f.hex);
  const tagKurz = p.optionen.find((g) => g.id === "tag")?.optionen.find((o) => o.id === a.optionen.tag)?.label.slice(0, 2);
  const fotoNr = p.slug === "wochentags-untersetzer-einzeln" && tagKurz ? TAG_FOTO[tagKurz] ?? 0 : liveIdx(p.slug);
  const fotos = fotosFuer(p.slug);
  if (fotos[fotoNr] && !p.teile && (MIT_AUFDRUCK.includes(p.slug) || miniaturModus(p.slug, fotoNr)) && (farbeHex || kombiFarben)) {
    const w = {
      farbe: farbeHex, text: a.text || undefined, family: schrift?.family, format, textfarbe: textfarbeHex, farben: kombiFarben,
      linienfarbe: p.linienfarbe ? farben?.find((f) => f.id === a.optionen[LINIENFARBE_KEY])?.hex : undefined,
    };
    return <FotoMiniatur slug={p.slug} src={fotos[fotoNr].src} alt={`${p.name}, Vorschau deiner Auswahl`} w={w} fotoNr={fotoNr} />;
  }
  return <ProductImage form={p.form} farbe={farbeHex ?? p.grundfarbe} text={a.text || undefined} family={schrift?.family} format={format} textfarbe={textfarbeHex} linienfarbe={p.linienfarbe ? farben?.find((f) => f.id === a.optionen[LINIENFARBE_KEY])?.hex : undefined} typ={typ} farben={kombiVon(p, a)?.farben.map((f) => f.hex)} teileFarben={farben ? teilHexe(p, a, farben) : undefined} />;
}
