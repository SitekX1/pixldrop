import { Bricolage_Grotesque } from "next/font/google";
import TrackedLink from "@/components/TrackedLink";

const titel = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], weight: ["800"], display: "swap" });

// Startseiten-Karte für den 3D-Druck-Shop (gleiche Rolle wie Minigame-/aicut-Karte).
// Bild diagonal geteilt: links oben "normal" mit Eddie, rechts unten Halloween.
export default function ShopPromoCard() {
  return (
    <TrackedLink href="/3d-druck" className="card shop-promo-card" event="shop-click">
      <div className="card-glow" />
      <div className="shop-promo-bild" aria-hidden="true">
        <div className="shop-promo-halloween">
          <span className="shop-promo-emoji shop-promo-e1">🎃</span>
          <span className="shop-promo-emoji shop-promo-e2">👻</span>
          <span className="shop-promo-emoji shop-promo-e3">🦇</span>
          <span className={`shop-promo-hallotext ${titel.className}`}>Halloween</span>
        </div>
        <span className={`shop-promo-titel ${titel.className}`}>Eddies<br />3D-Druck-Shop</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/shop/eddie-stand.webp" alt="" className="shop-promo-eddie" loading="lazy" decoding="async" />
      </div>
      <div className="eyebrow-small">Individuell &middot; Halloween &middot; selbst gedruckt</div>
      <h3>Eddies 3D-Druck-Shop</h3>
      <p>3D-Druckteile für dich, individuell nach deinen Wünschen, dazu Halloween-Deko für die Gruselzeit.</p>
      <span className="pill-btn">Zum Shop →</span>
    </TrackedLink>
  );
}
