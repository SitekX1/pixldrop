import Link from "next/link";
import ShopShell from "@/components/shop/ShopShell";
import ProductCard from "@/components/shop/ProductCard";
import HalloweenBanner from "@/components/shop/HalloweenBanner";
import KontaktDialog from "@/components/shop/KontaktDialog";
import EddieSchnitt from "@/components/shop/EddieSchnitt";
import HeroEddie from "@/components/shop/HeroEddie";
import Ring from "@/components/shop/Ring";
import { halloweenModus } from "@/lib/shop/config";
import { KATEGORIEN, sichtbareProdukte, type Kategorie } from "@/lib/shop/produkte";
import { holeFarben } from "@/lib/shop/farben";

// Halloween-Status hängt vom Datum ab: pro Anfrage auswerten, nicht beim Build einfrieren.
export const dynamic = "force-dynamic";

export default async function ShopUebersicht({ searchParams }: { searchParams: Promise<{ kategorie?: string }> }) {
  const { kategorie } = await searchParams;
  const modus = halloweenModus();
  const farben = await holeFarben();
  const alle = sichtbareProdukte();
  const gueltig = KATEGORIEN.filter((k) => k.id !== "halloween" || modus !== "off");
  const aktiv = gueltig.find((k) => k.id === kategorie)?.id ?? "alle";
  const liste = aktiv === "alle" ? alle : alle.filter((p) => p.kategorien.includes(aktiv as Kategorie));
  const halloween = aktiv === "halloween";

  return (
    <ShopShell theme={halloween ? "halloween" : undefined}>
      <div className="shop-wrap">
        {halloween ? (
          <section className="shop-hero" style={{ minHeight: 0, paddingTop: 12 }} aria-labelledby="titel">
            <p className="shop-overline" style={{ color: "#ff8a1f" }}>Halloween-Kollektion</p>
            <h1 id="titel">Bis Anfang November dürfen sie spuken.</h1>
            <p className="lead">
              Laternen, Geister und Untersetzer für den Herbst.
              {modus === "preview" && " Noch nicht bestellbar: stöbern ist erlaubt, der Verkauf startet später."}
            </p>
          </section>
        ) : (
          <section className="shop-hero shop-hero--start" aria-labelledby="titel">
            <HeroEddie />
            <p className="shop-hero-mark" aria-hidden="true">3D-Druck</p>
            <div style={{ display: "grid", gap: 14, position: "relative", zIndex: 1 }}>
              <h1 id="titel">
                <span className="sr-only">3D-Druck von PixlDrop: </span>
                Eddie hat die Ideen. Ich habe den <span className="shop-hero-word">Drucker.<Ring /></span>
              </h1>
              <p className="lead">Untersetzer, Halloween, Deko und Individuelles aus dem 3D-Drucker.</p>
              <div className="shop-hero-actions">
                <a className="shop-btn" href="#stuecke">Stücke ansehen</a>
                <Link className="shop-link" href="/3d-druck/anfrage">Etwas Eigenes anfragen</Link>
              </div>
            </div>
          </section>
        )}

        {!halloween && <HalloweenBanner modus={modus} />}

        <nav className="shop-chips" aria-label="Kategorien" id="stuecke">
          <ul>
            {gueltig.map((k) => (
              <li key={k.id}>
                <Link
                  className={`shop-chip ${k.id === "halloween" ? "shop-chip--halloween" : ""}`}
                  href={k.id === "alle" ? "/3d-druck#stuecke" : `/3d-druck?kategorie=${k.id}#stuecke`}
                  aria-current={aktiv === k.id ? "page" : undefined}
                >
                  {k.label}
                </Link>
              </li>
            ))}
            <li><Link className="shop-chip shop-chip--anfrage" href="/3d-druck/anfrage">Individueller Druck</Link></li>
          </ul>
        </nav>

        {liste.length > 0 ? (
          <ul className="shop-grid" aria-label="Produkte">
            {liste.map((p, i) => (
              <ProductCard key={p.slug} p={p} farben={farben} vorschau={modus === "preview"} erste={i === 0 && aktiv === "alle" && !!p.bestseller} />
            ))}
          </ul>
        ) : (
          <div className="shop-empty" role="status">
            <EddieSchnitt className="shop-eddie-mini" />
            <h2>Hier ist&rsquo;s so leer wie Eddies Tasse um 7:55.</h2>
            <Link className="shop-btn" href="/3d-druck#stuecke">Alle Stücke ansehen</Link>
          </div>
        )}

        <section className="shop-individuell" aria-labelledby="indiv">
          <div style={{ display: "grid", gap: 8 }}>
            <h2 id="indiv">Individueller Druck – Preis nach Anfrage</h2>
            <p>Du hast eine Idee, ein Maß oder ein Bild? Beschreib es mir, lade ein Foto hoch und du bekommst ein unverbindliches Angebot per E-Mail.</p>
          </div>
          <Link className="shop-btn" href="/3d-druck/anfrage">Individuell anfragen</Link>
        </section>

        <section className="shop-section" aria-labelledby="ablauf">
          <h2 id="ablauf">So läuft&rsquo;s</h2>
          <ol className="shop-steps">
            <li><strong>Aussuchen</strong>Farbe, Größe und auf Wunsch deinen Text wählen.</li>
            <li><strong>Bestellen</strong>In drei Schritten, mit Bon und allen Angaben vorab.</li>
            <li><strong>Ich drucke und verschicke</strong>Dein Stück wird frisch für dich gedruckt und von mir verpackt.</li>
          </ol>
        </section>

        <aside className="shop-alex" aria-labelledby="eddie-sagt">
          <EddieSchnitt className="shop-alex-eddie" />
          <div className="shop-alex-text">
            <h2 id="eddie-sagt" style={{ fontSize: "1.25rem" }}>Eddie sagt</h2>
            <p>Ich entwerfe, drucke und verpacke selbst. Wenn etwas nicht passt, schreib mir.</p>
            <KontaktDialog label="Schreib mir" />
          </div>
        </aside>
      </div>
    </ShopShell>
  );
}
