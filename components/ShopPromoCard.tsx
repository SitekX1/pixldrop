import { Bricolage_Grotesque, Fraunces } from "next/font/google";
import TrackedLink from "@/components/TrackedLink";
import WeihnachtenSiegel from "@/components/WeihnachtenSiegel";

const titel = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], weight: ["800"], display: "swap" });
const serif = Fraunces({ subsets: ["latin"], weight: ["600"], style: ["italic"], display: "swap", preload: false });

const FLOCKEN = [62, 70, 78, 86, 93].map((x, i) => ({ x, d: 9 + i * 1.3, delay: -i * 1.9, k: (i * 3) % 8, s: 14 + (i % 3) * 6 }));

// Startseiten-Karte für den 3D-Druck-Shop (gleiche Rolle wie Minigame-/aicut-Karte).
// Bild diagonal geteilt: links oben der normale Shop mit Eddie (klickbar), rechts unten Weihnachten "Coming soon".
// Die ganze Karte führt zum normalen Shop; die Weihnachtshälfte ist nur Ankündigung.
export default function ShopPromoCard() {
  return (
    <TrackedLink href="/3d-druck" className="card shop-promo-card" event="shop-click">
      <div className="card-glow" />
      <div className="shop-promo-bild" aria-hidden="true">
        <div className="shop-promo-wn">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="shop-promo-wn-bg" src="/shop/weihnachten/hintergrund-nacht.webp" alt="" width={1024} height={572} loading="lazy" decoding="async" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="shop-promo-wn-santa" src="/shop/weihnachten/santa-gelandet.webp" alt="" width={950} height={268} loading="lazy" decoding="async" />
          <span className="shop-promo-wn-dunkel" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="shop-promo-wn-bokeh" src="/shop/weihnachten/bokeh.webp" alt="" width={640} height={349} loading="lazy" decoding="async" />
          {FLOCKEN.map((f, i) => (
            <span key={i} className="spc-flocke" style={{ left: `${f.x}%`, width: f.s, height: f.s, ["--k" as string]: f.k, animationDuration: `${f.d}s`, animationDelay: `${f.delay}s` }} />
          ))}
          <span className={`shop-promo-wntext ${titel.className}`}>Weihnachten</span>
          <WeihnachtenSiegel text="Coming soon" className="shop-promo-wn-siegel" fontClass={serif.className} />
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
