import Link from "next/link";
import ShopShell from "@/components/shop/ShopShell";
import EddieSchnitt from "@/components/shop/EddieSchnitt";

export const metadata = { title: "Nicht gefunden" };

export default function ShopNichtGefunden() {
  return (
    <ShopShell>
      <div className="shop-wrap">
        <div className="shop-empty" role="status">
          <EddieSchnitt className="shop-eddie-mini" />
          <h1 style={{ fontSize: "clamp(1.75rem, 7vw, 2.4rem)" }}>Hier ist&rsquo;s so leer wie Eddies Tasse um 7:55.</h1>
          <p>Diese Seite gibt es nicht (mehr).</p>
          <Link className="shop-btn" href="/3d-druck#stuecke">Alle Stücke ansehen</Link>
        </div>
      </div>
    </ShopShell>
  );
}
