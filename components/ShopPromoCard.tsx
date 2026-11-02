import TrackedLink from "@/components/TrackedLink";
import ShopPromoCardHalloween from "@/components/ShopPromoCardHalloween";
import ShopPromoCardWeihnachten from "@/components/ShopPromoCardWeihnachten";
import { aktiveSaison, saisonModus } from "@/lib/shop/saison";

// Startseiten-Karte für den 3D-Druck-Shop: nur noch Weiche nach aktiver Saison (lib/shop/saison.ts).
// Weihnachten -> Coming-soon-Kachel, Halloween -> bisherige Kachel (für nächstes Jahr erhalten), sonst schlichte Variante ohne Kulisse.
// Die Startseite wertet das Datum pro Anfrage aus (sie ist dynamisch, weil sie searchParams liest).
export default function ShopPromoCard() {
  const saison = aktiveSaison();
  const modus = saisonModus(saison);
  if (saison === "weihnachten" && modus !== "off") return <ShopPromoCardWeihnachten modus={modus} />;
  if (saison === "halloween" && modus !== "off") return <ShopPromoCardHalloween />;
  return (
    <TrackedLink href="/3d-druck" className="card shop-promo-card spc-schlicht" event="shop-click">
      <div className="card-glow" />
      <h3>3D-Druck-Shop</h3>
      <p>Untersetzer, Deko und Individuelles aus dem 3D-Drucker.</p>
      <span className="pill-btn">Zum Shop →</span>
    </TrackedLink>
  );
}
