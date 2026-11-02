import { SAISONEN } from "@/lib/shop/saison";

// Schlanker Streifen über dem Produktraster, solange die Weihnachtsartikel noch nicht bestellbar sind.
export default function WeihnachtenHinweis() {
  return (
    <p className="wn-hinweis" role="note">
      <span className="wn-hinweis-punkt" aria-hidden="true" />
      {SAISONEN.weihnachten.texte.hinweisVorschau}
    </p>
  );
}
