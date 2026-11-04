import { Bricolage_Grotesque } from "next/font/google";
import TrackedLink from "@/components/TrackedLink";

const titel = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], weight: ["800"], display: "swap" });

// Startseiten-Karte für den 3D-Druck-Shop (gleiche Rolle wie Minigame-/aicut-Karte).
// Bild diagonal geteilt: links oben der normale Shop mit Eddie (klickbar), rechts unten Weihnachten "Coming soon".
// Die ganze Karte führt zum normalen Shop; die Weihnachtshälfte ist nur Ankündigung.
export default function ShopPromoCard() {
  return (
    <TrackedLink href="/3d-druck" className="card shop-promo-card" event="shop-click">
      <div className="card-glow" />
      <div className="shop-promo-bild" aria-hidden="true">
        <div className="shop-promo-wn">
          <span className="shop-promo-wn-schnee" />
          <span className={`shop-promo-wntext ${titel.className}`}>Weihnachten</span>
          <span className="shop-promo-soon">Coming soon</span>
        </div>
        <span className={`shop-promo-titel ${titel.className}`}>Eddies<br />3D-Druck-Shop</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/shop/eddie-3d.webp" alt="" className="shop-promo-eddie" loading="lazy" decoding="async" />
      </div>
      <div className="eyebrow-small">Individuell &middot; Untersetzer &middot; selbst gedruckt</div>
      <h3>Eddies 3D-Druck-Shop</h3>
      <p>Untersetzer, Namensschilder und Individuelles aus dem 3D-Drucker. Die Weihnachtsdeko kommt in Kürze.</p>
      <span className="pill-btn">Zum Shop →</span>
    </TrackedLink>
  );
}
