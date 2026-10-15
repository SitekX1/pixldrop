import Link from "next/link";
import { Fledermaus, Netz, Kuerbis, Geist } from "./HalloweenSvgs";
import { HALLOWEEN_ENDE_TEXT, type HalloweenModus } from "@/lib/shop/config";

// Statisch, ohne Countdown (Enddatum nur als Text). Bewegung nur per CSS (prefers-reduced-motion beachtet).
export default function HalloweenBanner({ modus }: { modus: HalloweenModus }) {
  if (modus === "off") return null;
  return (
    <section className="shop-halloween" aria-labelledby="hw-titel">
      <div className="hw-deko" aria-hidden="true">
        <Netz className="hw-web--tl" />
        <Netz className="hw-web--br" />
        <Fledermaus className="hw-bat--1" />
        <Fledermaus className="hw-bat--2" />
        <Geist className="hw-ghost--1" />
        <Kuerbis className="hw-pumpkin--1" />
        <Kuerbis className="hw-pumpkin--2" />
      </div>
      <div className="hw-text">
        <p className="shop-overline">Happy Halloween</p>
        <h2 id="hw-titel">Bis Anfang November dürfen sie spuken.</h2>
        <p>
          Laternen, Geister und Untersetzer für den Herbst, {HALLOWEEN_ENDE_TEXT}.
          {modus === "preview" && " Noch nicht bestellbar: Du kannst schon stöbern, der Verkauf startet später."}
        </p>
        <Link className="shop-btn" href="/3d-druck?kategorie=halloween" scroll>Spuk ansehen</Link>
      </div>
    </section>
  );
}
