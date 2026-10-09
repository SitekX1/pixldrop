import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ShopShell from "@/components/shop/ShopShell";
import ProductImage from "@/components/shop/ProductImage";
import Galerie from "@/components/shop/Galerie";
import { VorschauProvider, LiveProductImage } from "@/components/shop/Vorschau";
import ProductBuy from "@/components/shop/ProductBuy";
import { holeProdukt, istBestellbar, hitzeHinweis } from "@/lib/shop/produkte";
import { holeFarben } from "@/lib/shop/farben";
import { formatPreis, halloweenModus, LIEFERZEIT_TEXT, TEXTE, VERSAND_CENT } from "@/lib/shop/config";

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
        <VorschauProvider>
        <div className="shop-product">
          <Galerie bild={<LiveProductImage form={p.form} grundfarbe={p.grundfarbe} />} />
          <div className="shop-info">
            <p className="shop-overline">{halloween ? "Halloween-Kollektion" : "3D-Druck"}</p>
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

            <section aria-labelledby="masse-druckbild" style={{ display: "grid", gap: 8 }}>
              <h2 id="masse-druckbild" style={{ fontSize: "1.25rem" }}>{p.masse ? "Maße und Druckbild" : "Druckbild"}</h2>
              {p.masse && (
                <p>
                  <strong>Maße:</strong> ca. {p.masse} mm.{" "}
                  {p.toleranzMm ? `Toleranz ±${p.toleranzMm} mm.` : "Maße sind ca.-Angaben, Toleranz im Rahmen des FDM-Verfahrens."}
                </p>
              )}
              <p>
                <strong>Druckbild:</strong> Das Stück wird im FDM-Verfahren Schicht für Schicht gedruckt; feine Schichtlinien sind sichtbar und gehören zu diesem Produkt. Die Farbe kann je nach Bildschirm anders aussehen.
              </p>
            </section>

            <section aria-labelledby="details" style={{ display: "grid", gap: 8 }}>
              <h2 id="details" style={{ fontSize: "1.25rem" }}>Details</h2>
              <dl className="shop-details">
                {p.masse && <div><dt>Maße</dt><dd>ca. {p.masse} mm</dd></div>}
                <div><dt>Material</dt><dd>{p.material}</dd></div>
                <div><dt>Pflege / Hitze</dt><dd>{hitzeHinweis(p.material)}</dd></div>
                <div><dt>Modell</dt><dd>Eigenentwurf</dd></div>
              </dl>
            </section>
            <section className="shop-gpsr" aria-labelledby="gpsr">
              <h2 id="gpsr">Hersteller und Sicherheit</h2>
              <p>Herstellerangaben: siehe <Link className="shop-link" style={{ minHeight: 0 }} href="/impressum">Impressum</Link></p>
              <p>{TEXTE.keinSpielzeug}</p>
              {p.hinweise.filter((h) => h !== TEXTE.keinSpielzeug).map((h) => <p key={h}>{h}</p>)}
            </section>
          </div>
        </div>
        </VorschauProvider>
      </div>
    </ShopShell>
  );
}
