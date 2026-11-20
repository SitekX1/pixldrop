import Link from "next/link";
import ProductImage from "./ProductImage";
import { coverFuer, fotosFuer } from "@/lib/shop/fotos";
import { formatPreis, TEXTE } from "@/lib/shop/config";
import type { Produkt } from "@/lib/shop/produkte";
import { SAISONEN } from "@/lib/shop/saison";

// Produktkachel der modernen Startseite: ruhig, Foto führt, Name und Preis darunter. Ganze Kachel ist der Link.
// Logik (Cover, Preis "ab", gesperrt bei Wunschtext-Pause, Vorschau-Badge) wie ProductCard, nur ohne Verspieltheit.
export default function StartKarte({ p, gesperrt = false, vorschau = false, erste = false }: { p: Produkt; gesperrt?: boolean; vorschau?: boolean; erste?: boolean }) {
  const galerieFoto = fotosFuer(p.slug)[0];
  const cover = coverFuer(p.slug, false);
  const foto = cover && galerieFoto ? { src: cover, alt: galerieFoto.alt } : galerieFoto;
  const ab = p.optionen.some((g) => g.optionen.some((o) => (o.aufpreisCent ?? 0) > 0)) ? "ab " : "";
  const preis = p.nurAnfrage ? TEXTE.preisAnfrage : ab + formatPreis(p.preisCent);
  const badge = gesperrt
    ? "Vorübergehend nicht bestellbar"
    : vorschau && p.gruppe !== "allgemein" ? SAISONEN[p.gruppe].texte.badgeVorschau : null;
  const inhalt = (
    <>
      <span className="sx-card-img">
        {foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto.src} alt={foto.alt} width={1100} height={1100} loading={erste ? "eager" : "lazy"} decoding="async" />
        ) : (
          <ProductImage form={p.form} farbe={p.grundfarbe} />
        )}
      </span>
      <span className="sx-card-name">{p.name}</span>
      <span className="sx-card-meta"><span className="num">{preis}</span>{badge && <em>{badge}</em>}</span>
    </>
  );
  return (
    <li>
      {gesperrt ? (
        <div className="sx-card sx-card--aus" aria-disabled="true">{inhalt}</div>
      ) : (
        <Link className="sx-card" href={`/3d-druck/${p.slug}`}>{inhalt}</Link>
      )}
    </li>
  );
}
