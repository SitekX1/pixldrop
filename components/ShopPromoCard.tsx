import { Bricolage_Grotesque } from "next/font/google";
import TrackedLink from "@/components/TrackedLink";

const titel = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], weight: ["800"], display: "swap" });

const FOTOS = [
  { src: "/shop/fotos/wochentags-untersetzer-set/1.webp", cls: "shop-promo-f1" },
  { src: "/shop/fotos/halloween-untersetzer-set/1.webp", cls: "shop-promo-f2" },
  { src: "/shop/fotos/kuerbis-klein-set/1.webp", cls: "shop-promo-f3" },
  { src: "/shop/fotos/geister-set/1.webp", cls: "shop-promo-f4" },
];

// Startseiten-Karte für den 3D-Druck-Shop (gleiche Rolle wie Minigame-/aicut-Karte): Eddie + Produktfotos + Titel.
export default function ShopPromoCard() {
  return (
    <TrackedLink href="/3d-druck" className="card shop-promo-card" event="shop-click">
      <div className="card-glow" />
      <div className="shop-promo-bild" aria-hidden="true">
        <span className={`shop-promo-titel ${titel.className}`}>Eddies<br />3D-Druck-Shop</span>
        {FOTOS.map((f) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={f.src} src={f.src} alt="" className={`shop-promo-foto ${f.cls}`} loading="lazy" decoding="async" />
        ))}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/shop/eddie-stand.webp" alt="" className="shop-promo-eddie" loading="lazy" decoding="async" />
      </div>
      <div className="eyebrow-small">Neu &middot; selbst gedruckt</div>
      <h3>Eddies 3D-Druck-Shop</h3>
      <p>Untersetzer, Namensschilder, Geister und Kürbisse aus meinem 3D-Drucker. Kork, Box und Wunschtext auf Wunsch.</p>
      <span className="pill-btn">Zum Shop →</span>
    </TrackedLink>
  );
}
