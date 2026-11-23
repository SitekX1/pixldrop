import { WAND_SLUG, WAND_FARBEN, wandAusOptionen } from "@/lib/shop/wand";
import { WAND_SCHRIFTEN } from "@/lib/shop/schriften-wand";
import { KOMBI_KEY, type Produkt } from "@/lib/shop/produkte";
import type { Auswahl } from "@/lib/shop/auswahl";
import { SCHRIFTEN } from "@/lib/shop/schriften";
import { formatAusOptionen, istFormatSchluessel, standardFormat, zeilenAnzahl } from "@/lib/shop/textformat";
import ProductImage from "./ProductImage";
import FotoMiniatur, { miniaturModus } from "./FotoMiniatur";
import { coverFuer, fotosFuer, liveIdx, MIT_AUFDRUCK, TAG_FOTO } from "@/lib/shop/fotos";
import type { Farbe } from "@/lib/shop/farben";
import { teilHexe } from "@/lib/shop/teilfarben";
import { LINIENFARBE_KEY } from "@/lib/shop/textfarbe";
import { SCHRIFT_TITEL_KEY } from "@/lib/shop/schriften";

export function kombiVon(p: Produkt, a: Auswahl) {
  return p.kombinationen?.find((k) => k.id === a.optionen[KOMBI_KEY]);
}

/** Vorschau einer Warenkorb-/Bon-Position: Farbe, Text, Schrift, Fett/Kursiv und Größe wie die Live-Vorschau im Kaufbereich. */
export default function PositionsBild({ p, a, farbeHex, textfarbeHex, typ = "Muster", farben }: { p: Produkt; a: Auswahl; farbeHex?: string; textfarbeHex?: string; typ?: string; /** Lagerfarben: nötig für mehrteilige Artikel (teilFarben) */ farben?: Farbe[] }) {
  // Warenkorb, Zusammenfassung und Bon zeigen immer das Titelbild des Artikels (Alex 04.11.2026); Wunschtext und Farbe stehen als Zeilen im Bon.
  if (p.slug === WAND_SLUG) {
    // Wandbuchstaben: Kachel mit dem Wort in der gewählten Schrift und Farbe (jede Bestellung ist ein Unikat, es gibt kein Titelbild)
    const w = wandAusOptionen(a.optionen.wand);
    const z = w?.zeilen[0];
    const f = z ? WAND_FARBEN.find((x) => x.id === z.farbe) : undefined;
    const fam = z ? WAND_SCHRIFTEN.find((x) => x.id === z.schrift)?.family : undefined;
    return (
      <div className="shop-img" role="img" aria-label={z ? `Wandbuchstaben „${z.text}“` : "Wandbuchstaben"}
        style={{ display: "grid", placeItems: "center", width: "100%", aspectRatio: "1 / 1", background: "#ece7dc", overflow: "hidden", padding: 6 }}>
        <span style={{ fontFamily: fam, fontWeight: 700, color: f?.hex ?? "#1a1a1a", fontSize: "clamp(.62rem, 2.6vw, 1rem)", lineHeight: 1.1, textAlign: "center", textShadow: "1px 1px 0 rgba(0,0,0,.25), 2px 3px 4px rgba(0,0,0,.2)", overflowWrap: "normal", wordBreak: "normal" }}>
          {z?.text ?? "Wandbuchstaben"}
        </span>
      </div>
    );
  }
  const cover = coverFuer(p.slug);
  if (cover) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="shop-img" src={cover} alt={`${p.name}, Titelbild`} width={1100} height={1100} loading="lazy" decoding="async" style={{ display: "block", width: "100%", height: "auto", aspectRatio: "1 / 1", objectFit: "cover" }} />;
  }
  const pers = p.personalisierung;
  const schrift = pers ? SCHRIFTEN.find((s) => s.id === (pers.festeSchrift ?? a.schriftId)) : undefined;
  const titelSchrift = pers?.schriftJeZeile ? SCHRIFTEN.find((s) => s.id === a.optionen[SCHRIFT_TITEL_KEY]) : undefined;
  let format;
  if (pers && schrift) {
    const nur = Object.fromEntries(Object.entries(a.optionen).filter(([k]) => istFormatSchluessel(k)));
    format = { fmt: formatAusOptionen(nur, zeilenAnzahl(pers)) ?? standardFormat(zeilenAnzahl(pers)), breite: schrift.breite, schriftId: schrift.id, ...(titelSchrift ? { titel: { schriftId: titelSchrift.id, breite: titelSchrift.breite, family: titelSchrift.family } } : {}) };
  }
  // Echtes Foto statt Zeichnung: Foto 1 (bzw. Foto des gewählten Wochentags) in gewählter Farbe, bei Wunschtext-Artikeln mit Aufdruck (wie die Galerie)
  const teileFarben = farben ? teilHexe(p, a, farben) : undefined;
  const kombiFarben = kombiVon(p, a)?.farben.map((f) => f.hex);
  const tagKurz = p.optionen.find((g) => g.id === "tag")?.optionen.find((o) => o.id === a.optionen.tag)?.label.slice(0, 2);
  const fotoNr = p.slug === "wochentags-untersetzer-einzeln" && tagKurz ? TAG_FOTO[tagKurz] ?? 0 : liveIdx(p.slug);
  const fotos = fotosFuer(p.slug);
  if (fotos[fotoNr] && (!p.teile || teileFarben) && (MIT_AUFDRUCK.includes(p.slug) || miniaturModus(p.slug, fotoNr)) && (farbeHex || kombiFarben || teileFarben)) {
    const w = {
      farbe: farbeHex, text: a.text || undefined, family: schrift?.family, format, textfarbe: textfarbeHex, farben: kombiFarben, teileFarben,
      linienfarbe: p.linienfarbe ? farben?.find((f) => f.id === a.optionen[LINIENFARBE_KEY])?.hex : undefined,
    };
    return <FotoMiniatur slug={p.slug} src={fotos[fotoNr].src} alt={`${p.name}, Vorschau deiner Auswahl`} w={w} fotoNr={fotoNr} />;
  }
  return <ProductImage form={p.form} farbe={farbeHex ?? p.grundfarbe} text={a.text || undefined} family={schrift?.family} format={format} textfarbe={textfarbeHex} linienfarbe={p.linienfarbe ? farben?.find((f) => f.id === a.optionen[LINIENFARBE_KEY])?.hex : undefined} typ={typ} farben={kombiVon(p, a)?.farben.map((f) => f.hex)} teileFarben={farben ? teilHexe(p, a, farben) : undefined} />;
}
