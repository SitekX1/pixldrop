import Link from "next/link";
import WeihnachtenSiegel from "@/components/WeihnachtenSiegel";
import { SAISONEN } from "@/lib/shop/saison";

// Klickbare Weihnachts-Kachel im Shop (Gegenstueck zur Halloween-Kachel): fuehrt in die Weihnachts-Kollektion (?kategorie=weihnachten).
// Echte Nachtlandschaft + freigestellter Santa (Hufe im Vordergrund-Schnee), Coming-soon-Siegel, CTA. Ganze Kachel ist der Link.
const BG = "/shop/weihnachten/hintergrund-nacht.webp";

export default function WeihnachtenKachel({ modus }: { modus: "preview" | "sale" }) {
  const t = SAISONEN.weihnachten.texte;
  return (
    <Link className="wn-kachel" href="/3d-druck?kategorie=weihnachten#stuecke" aria-labelledby="wn-kachel-titel">
      <div className="wn-kachel-bild" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="wn-kb" src={BG} alt="" width={1024} height={572} loading="lazy" decoding="async" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="wn-kbokeh" src="/shop/weihnachten/bokeh.webp" alt="" width={640} height={349} loading="lazy" decoding="async" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="wn-ks" src="/shop/weihnachten/santa-gelandet.webp" alt="" width={950} height={268} loading="lazy" decoding="async" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="wn-kb wn-kb-vorn" src={BG} alt="" width={1024} height={572} loading="lazy" decoding="async" />
        <span className="wn-kdunkel" />
      </div>
      <WeihnachtenSiegel text={t.kachelBadge[modus]} className="wn-kachel-siegel" />
      <div className="wn-kachel-text">
        <p className="shop-overline">Advent 2026 &middot; selbst gedruckt</p>
        <h2 id="wn-kachel-titel">Weihnachts-Kollektion</h2>
        <p>
          {modus === "preview"
            ? "Teelichthalter, Sterne und Deko für den Advent, gerade frisch im Druck. Stöbern ist erlaubt, bestellen kannst du, sobald der Verkauf startet."
            : "Teelichthalter, Sterne und Deko für den Advent, frisch gedruckt und jetzt bestellbar."}
        </p>
        <span className="wn-kachel-cta">{modus === "preview" ? "Vorab stöbern" : "Zur Kollektion"}<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
      </div>
    </Link>
  );
}
