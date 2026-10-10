import Link from "next/link";
import Ring from "./Ring";
import ProductImage from "./ProductImage";
import { formatPreis, TEXTE } from "@/lib/shop/config";
import type { Produkt } from "@/lib/shop/produkte";
import type { Farbe } from "@/lib/shop/farben";

const KAT_LABEL: Record<string, string> = { halloween: "Halloween", untersetzer: "Untersetzer", sonstiges: "Sonstiges" };

export default function ProductCard({
  p, farben, vorschau, erste = false, gesperrt = false,
}: { p: Produkt; farben: Farbe[]; vorschau: boolean; erste?: boolean; gesperrt?: boolean }) {
  const sichtbar = farben.slice(0, 5);
  const rest = farben.length - sichtbar.length;
  const meta = [KAT_LABEL[p.kategorien[0]], p.nurAnfrage ? "Nur auf Anfrage" : p.material.split(" ")[0]].join(" · ");
  return (
    <li className={erste ? "shop-first" : undefined}>
      <article className={gesperrt ? "shop-card shop-card--gesperrt" : "shop-card"} aria-disabled={gesperrt || undefined}>
        <ProductImage form={p.form} farbe={p.grundfarbe} breit={erste} />
        <Ring />
        <div className="shop-card-body">
          {gesperrt && <span className="shop-state">Vorübergehend nicht bestellbar</span>}
          {!gesperrt && vorschau && p.gruppe === "halloween" && <span className="shop-state">Vorschau, noch nicht bestellbar</span>}
          <h3>{gesperrt ? <span>{p.name}</span> : <Link href={`/3d-druck/${p.slug}`}>{p.name}</Link>}</h3>
          <p className="meta">{meta}</p>
          <div className="shop-card-price">
            <span className="shop-price-small">{p.nurAnfrage ? TEXTE.preisAnfrage : formatPreis(p.preisCent)}</span>
            {sichtbar.length > 0 && (
              <span className="shop-dots" role="img" aria-label={`${farben.length} Farben`}>
                {sichtbar.map((f) => <i key={f.id} style={{ background: f.hex }} />)}
                {rest > 0 && <span className="muted" aria-hidden="true">+{rest}</span>}
              </span>
            )}
          </div>
        </div>
      </article>
    </li>
  );
}
