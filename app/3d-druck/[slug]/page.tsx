import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ShopShell from "@/components/shop/ShopShell";
import ProductImage from "@/components/shop/ProductImage";
import Galerie from "@/components/shop/Galerie";
import ProductBuy from "@/components/shop/ProductBuy";
import { holeProdukt, istBestellbar } from "@/lib/shop/produkte";
import { holeFarben } from "@/lib/shop/farben";
import { formatPreis, halloweenModus, LIEFERZEIT_TEXT, TEXTE, VERKAEUFER, VERSAND_CENT } from "@/lib/shop/config";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: holeProdukt(slug)?.name ?? "Nicht gefunden" };
}

export default async function Produktseite({ params }: Props) {
  const { slug } = await params;
  const p = holeProdukt(slug);
  if (!p) notFound();
  const farben = await holeFarben();
  const bestellbar = istBestellbar(p);
  const halloween = p.gruppe === "halloween";
  const preis = p.nurAnfrage ? TEXTE.preisAnfrage : formatPreis(p.preisCent);

  return (
    <ShopShell theme={halloween ? "halloween" : undefined}>
      <div className="shop-wrap" style={{ paddingBottom: 96 }}>
        <Link className="shop-crumb" href={halloween ? "/3d-druck?kategorie=halloween#stuecke" : "/3d-druck#stuecke"}>← Alle Stücke</Link>
        <div className="shop-product">
          <Galerie bild={<ProductImage form={p.form} farbe={p.grundfarbe} />} />
          <div className="shop-info">
            <p className="shop-overline">{halloween ? "Spuk-Kollektion" : "3D-Druck"}</p>
            <h1 style={{ fontSize: "clamp(1.9rem, 8vw, 2.8rem)", overflowWrap: "anywhere" }}>{p.name}</h1>
            <p className="kurz">{p.beschreibung}</p>
            {halloween && !bestellbar && (
              <p className="shop-note shop-note--warn" role="note">Vorschau: Dieser Artikel ist noch nicht bestellbar.</p>
            )}
            <div className="shop-pricebox">
              <span className="shop-price">{preis}</span>
              <ul>
                <li>{TEXTE.kleinunternehmer}</li>
                <li>{p.nurAnfrage ? "Preis, Versand und Lieferzeit stehen im Angebot per E-Mail" : VERSAND_CENT != null ? `zzgl. ${formatPreis(VERSAND_CENT)} Versand (nur Deutschland)` : TEXTE.versandHinweis}</li>
                {!p.nurAnfrage && <li>{LIEFERZEIT_TEXT ?? TEXTE.lieferzeitHinweis}</li>}
                <li><Link className="shop-link" href="/3d-druck/versand-zahlung">Versand &amp; Zahlung</Link></li>
              </ul>
            </div>
            <div className="shop-note shop-note--warn" role="note">
              {p.hinweise.map((h) => <p key={h}>{h}</p>)}
            </div>
            <ProductBuy produkt={p} farben={farben} bestellbar={bestellbar} preisText={preis} />

            <section aria-labelledby="details" style={{ display: "grid", gap: 8 }}>
              <h2 id="details" style={{ fontSize: "1.25rem" }}>Details</h2>
              <dl className="shop-details">
                <div><dt>Maße</dt><dd>{p.masse ?? "folgen"}</dd></div>
                <div><dt>Material</dt><dd>{p.material}</dd></div>
                <div><dt>Gewicht</dt><dd>folgt</dd></div>
                <div><dt>Pflege / Hitze</dt><dd>folgt nach eigenem Test</dd></div>
                <div><dt>Modell</dt><dd>{p.slug === "halloween-untersetzer" ? "folgt (Lizenz wird geprüft)" : "Eigenentwurf"}</dd></div>
              </dl>
            </section>
            <section className="shop-gpsr" aria-labelledby="gpsr">
              <h2 id="gpsr">Hersteller und Sicherheit</h2>
              <p>{VERKAEUFER.name}, {VERKAEUFER.anschrift}, <a href={`mailto:${VERKAEUFER.mail}`}>{VERKAEUFER.mail}</a></p>
              <p>{TEXTE.keinSpielzeug}</p>
              {p.hinweise.filter((h) => h !== "Kein Spielzeug.").map((h) => <p key={h}>{h}</p>)}
            </section>
          </div>
        </div>
      </div>
    </ShopShell>
  );
}
