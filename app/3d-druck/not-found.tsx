import Link from "next/link";
import ShopShell from "@/components/shop/ShopShell";

export const metadata = { title: "Nicht gefunden" };

export default function ShopNichtGefunden() {
  return (
    <ShopShell>
      <div className="shop-wrap">
        <div className="shop-empty" role="status">
          <h1 style={{ fontSize: "clamp(1.75rem, 7vw, 2.4rem)" }}>Hier gibt es nichts zu sehen.</h1>
          <p>Diese Seite gibt es nicht (mehr).</p>
          <Link className="shop-btn" href="/3d-druck">Alle Stücke ansehen</Link>
        </div>
      </div>
    </ShopShell>
  );
}
