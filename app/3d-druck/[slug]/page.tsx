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
          <Galerie bild={<LiveProductImage form={p.form} grundfarbe={p.grundfarbe} />} preis={preis} chips={[p.material, ...(p.masse ? [`ca. ${p.masse} mm`] : [])]} />
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
            <ProductBuy produkt={p} farben={farben} bestellbar={bestellbar} preisText={preis} />
            <p className="shop-sicher-kurz">Kein Spielzeug, hitzeempfindlich: <a className="shop-link" style={{ minHeight: 0 }} href="#sicherheit">Sicherheitshinweise</a></p>
          </div>
        </div>
        </VorschauProvider>
        <section className="shop-detailbereich" aria-labelledby="details">
          <h2 id="details">Details</h2>
          <div className="shop-detailraster">
            <article className="shop-dkarte" aria-labelledby="masse-druckbild">
              <div className="shop-dkopf"><span className="shop-medaillon"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 3 7.5 12 12l9-4.5L12 3Z"/><path d="m3 12 9 4.5 9-4.5"/><path d="m3 16.5 9 4.5 9-4.5"/></svg></span><h3 id="masse-druckbild">{p.masse ? "Maße und Druckbild" : "Druckbild"}</h3></div>
              <dl className="shop-details">
                {p.masse && <div><dt>Maße</dt><dd>ca. {p.masse} mm{p.toleranzMm ? `, Toleranz ±${p.toleranzMm} mm` : ""}</dd></div>}
                <div><dt>Material</dt><dd>{p.material}</dd></div>
                <div><dt>Modell</dt><dd>Eigenentwurf</dd></div>
              </dl>
              {p.masse && !p.toleranzMm && <p className="muted">Maße sind ca.-Angaben, Toleranz im Rahmen des FDM-Verfahrens.</p>}
              <p>Das Stück wird im FDM-Verfahren Schicht für Schicht gedruckt; feine Schichtlinien sind sichtbar und gehören zu diesem Produkt. Die Farbe kann je nach Bildschirm anders aussehen.</p>
            </article>
            <article className="shop-dkarte shop-dkarte--sicher" id="sicherheit" aria-labelledby="gpsr">
              <div className="shop-dkopf"><span className="shop-medaillon"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5 2.8 19.5h18.4L12 3.5Z"/><path d="M12 10v4.5"/><path d="M12 17.2v.1"/></svg></span><h3 id="gpsr">Sicherheit und Hinweise</h3></div>
              <ul>
                <li>{hitzeHinweis(p.material)}</li>
                <li>{TEXTE.keinSpielzeug}</li>
                {p.hinweise.filter((h) => h !== TEXTE.keinSpielzeug && h !== hitzeHinweis(p.material)).map((h) => <li key={h}>{h}</li>)}
              </ul>
            </article>
            <article className="shop-dkarte" aria-labelledby="versand-widerruf">
              <div className="shop-dkopf"><span className="shop-medaillon"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.8 3.5 7.3v9.4l8.5 4.5 8.5-4.5V7.3L12 2.8Z"/><path d="m3.5 7.3 8.5 4.5 8.5-4.5"/><path d="M12 11.8v9.4"/><path d="m7.8 5 8.4 4.4"/></svg></span><h3 id="versand-widerruf">Versand, Lieferzeit, Widerruf</h3></div>
              <ul>
                <li>{p.nurAnfrage ? "Preis, Versand und Lieferzeit stehen im Angebot per E-Mail" : VERSAND_CENT != null ? `Versand ${formatPreis(VERSAND_CENT)} (nur Deutschland)` : TEXTE.versandHinweis}</li>
                {!p.nurAnfrage && <li>{LIEFERZEIT_TEXT ?? TEXTE.lieferzeitHinweis}</li>}
                <li>Standardware: 14 Tage Widerruf. Bei individuellem Text besteht kein Widerrufsrecht.</li>
                <li><Link className="shop-link" style={{ minHeight: 0 }} href="/3d-druck/versand-zahlung">Versand &amp; Zahlung</Link></li>
              </ul>
              <p className="muted">Hersteller: siehe <Link className="shop-link" style={{ minHeight: 0 }} href="/impressum">Impressum</Link> (Kontakt unten).</p>
            </article>
          </div>
        </section>
      </div>
    </ShopShell>
  );
}
