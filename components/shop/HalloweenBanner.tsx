import Link from "next/link";
import Ring from "./Ring";
import { HALLOWEEN_ENDE_TEXT, type HalloweenModus } from "@/lib/shop/config";

function Fledermaus() {
  return (
    <svg width="34" height="18" viewBox="0 0 34 18" aria-hidden="true" focusable="false">
      <path d="M17 17 L14 11 L9 14 L10 8 L3 9 L0 3 L8 4 L11 0 L14 5 L17 3 L20 5 L23 0 L26 4 L34 3 L31 9 L24 8 L25 14 L20 11 Z" fill="#ff8a1f" />
    </svg>
  );
}

// Statisch, ohne Countdown (Enddatum nur als Text). Eddie im Halloween-Outfit folgt (Asset 4).
export default function HalloweenBanner({ modus }: { modus: HalloweenModus }) {
  if (modus === "off") return null;
  return (
    <section className="shop-halloween" aria-labelledby="hw-titel">
      <div className="shop-bats" aria-hidden="true"><Fledermaus /><Fledermaus /></div>
      <Ring />
      <p className="shop-overline">Halloween-Kollektion</p>
      <h2 id="hw-titel">Bis Anfang November dürfen sie spuken.</h2>
      <p>
        Laternen, Geister und Untersetzer für den Herbst, {HALLOWEEN_ENDE_TEXT}.
        {modus === "preview" && " Noch nicht bestellbar: Du kannst schon stöbern, der Verkauf startet später."}
      </p>
      <Link className="shop-btn" href="/3d-druck?kategorie=halloween" scroll>Spuk ansehen</Link>
    </section>
  );
}
