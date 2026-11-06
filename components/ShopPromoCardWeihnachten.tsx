import { Bricolage_Grotesque, Fraunces } from "next/font/google";
import TrackedLink from "@/components/TrackedLink";
import WeihnachtenSiegel from "@/components/WeihnachtenSiegel";
import { SAISONEN } from "@/lib/shop/saison";

const titel = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], weight: ["800"], display: "swap" });
const serif = Fraunces({ subsets: ["latin"], weight: ["600"], style: ["italic"], display: "swap", preload: false });

// Weihnachtskachel der Startseite ("Lichter gehen an", Coming soon): echte Nachtlandschaft, der gelandete Santa (freigestellt, Hufe im Schnee),
// weiche Bokeh-Lichter, Mond-Glow und echte Schneekristalle (Sprite-Atlas) als Flocken. Kein Eddie, kein Logo.
// Bilder: /public/shop/weihnachten (Gemini-Assets von Alex, rembg-freigestellt); die SVG-Szene der ersten Fassung wird nicht mehr verwendet.
const BG = "/shop/weihnachten/hintergrund-nacht.webp";
const FLOCKEN = [8, 22, 38, 55, 70, 88].map((x, i) => ({ x, d: 9 + i * 1.1, delay: -i * 1.7, k: (i * 3) % 8, s: 14 + (i % 3) * 7 }));

export default function ShopPromoCardWeihnachten({ modus }: { modus: "preview" | "sale" }) {
  const t = SAISONEN.weihnachten.texte;
  return (
    <TrackedLink href="/3d-druck?kategorie=weihnachten&quelle=pixldrop-kachel" className="card spc" event="shop-click">
      <div className="card-glow" />
      <div className="spc-bild" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="spc-bg" src={BG} alt="" width={1024} height={572} loading="lazy" decoding="async" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="spc-sled" src="/shop/weihnachten/santa-gelandet.webp" alt="" width={950} height={268} loading="lazy" decoding="async" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="spc-bg spc-bg-vorn" src={BG} alt="" width={1024} height={572} loading="lazy" decoding="async" />
        <span className="spc-dunkel" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="spc-bokeh" src="/shop/weihnachten/bokeh.webp" alt="" width={640} height={349} loading="lazy" decoding="async" />
        <span className="spc-mondglow" />
        {FLOCKEN.map((f, i) => (
          <span key={i} className="spc-flocke" style={{ left: `${f.x}%`, width: f.s, height: f.s, ["--k" as string]: f.k, animationDuration: `${f.d}s`, animationDelay: `${f.delay}s` }} />
        ))}
        <WeihnachtenSiegel text={t.kachelBadge[modus]} className="spc-siegel" fontClass={serif.className} />
        <span className={`spc-titel ${titel.className}`}>Weihnachten<br />aus dem 3D-Drucker</span>
      </div>
      <div className="eyebrow-small">Advent 2026 &middot; selbst gedruckt</div>
      <h3>Weihnachten aus dem 3D-Drucker</h3>
      <p>
        {modus === "preview"
          ? "Teelichthalter, Deko und Kleinigkeiten, gerade frisch im Druck. Der Verkauf startet bald, stöbern kannst du schon."
          : "Teelichthalter, Deko und Kleinigkeiten für den Advent, frisch gedruckt. Weihnachts-Aktion: 10 % auf alle Weihnachtsartikel mit dem Code WEIHNACHTEN10, 06.–19.11.2026."}
      </p>
      <span className="pill-btn spc-btn">{t.kachelButton[modus]}</span>
    </TrackedLink>
  );
}
