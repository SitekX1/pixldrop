import type { Produkt } from "@/lib/shop/produkte";
import type { Auswahl } from "@/lib/shop/auswahl";
import { SCHRIFTEN } from "@/lib/shop/schriften";
import { formatAusOptionen, istFormatSchluessel, standardFormat, zeilenAnzahl } from "@/lib/shop/textformat";
import ProductImage from "./ProductImage";

/** Vorschau einer Warenkorb-/Bon-Position: Farbe, Text, Schrift, Fett/Kursiv und Größe wie die Live-Vorschau im Kaufbereich. */
export default function PositionsBild({ p, a, farbeHex, typ = "Muster" }: { p: Produkt; a: Auswahl; farbeHex?: string; typ?: string }) {
  const pers = p.personalisierung;
  const schrift = pers ? SCHRIFTEN.find((s) => s.id === (pers.festeSchrift ?? a.schriftId)) : undefined;
  let format;
  if (pers && schrift) {
    const nur = Object.fromEntries(Object.entries(a.optionen).filter(([k]) => istFormatSchluessel(k)));
    format = { fmt: formatAusOptionen(nur, zeilenAnzahl(pers)) ?? standardFormat(zeilenAnzahl(pers)), breite: schrift.breite };
  }
  return <ProductImage form={p.form} farbe={farbeHex ?? p.grundfarbe} text={a.text || undefined} family={schrift?.family} format={format} typ={typ} />;
}
