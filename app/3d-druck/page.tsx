import Link from "next/link";
import ShopShell from "@/components/shop/ShopShell";
import ProductCard from "@/components/shop/ProductCard";
import PauseBanner from "@/components/shop/PauseBanner";
import HalloweenBanner from "@/components/shop/HalloweenBanner";
import IndividuellBanner from "@/components/shop/IndividuellBanner";
import KontaktDialog from "@/components/shop/KontaktDialog";
import EddieSchnitt from "@/components/shop/EddieSchnitt";
import HeroEddie from "@/components/shop/HeroEddie";
import WeihnachtenBuehne from "@/components/shop/WeihnachtenBuehne";
import WeihnachtenKachel from "@/components/shop/WeihnachtenKachel";
import WeihnachtenHinweis from "@/components/shop/WeihnachtenHinweis";
import Ring from "@/components/shop/Ring";
import { halloweenModus } from "@/lib/shop/config";
import { aktiveSaison, saisonModus, SAISONEN } from "@/lib/shop/saison";
import { kategorienFuer, sichtbareProdukte, UNTERKATEGORIEN, type Kategorie } from "@/lib/shop/produkte";
import { holeFarben } from "@/lib/shop/farben";
import { holeEinstellungen } from "@/lib/shop/server/einstellungen";

// Saison-Status hängt vom Datum ab: pro Anfrage auswerten, nicht beim Build einfrieren.
export const dynamic = "force-dynamic";

export default async function ShopUebersicht({ searchParams }: { searchParams: Promise<{ kategorie?: string }> }) {
  const { kategorie } = await searchParams;
  const saisonId = aktiveSaison();
  const modus = saisonModus(saisonId);
  const hwModus = halloweenModus();
  const weihnachten = saisonId === "weihnachten";
  const farben = await holeFarben();
  const { wunschtextPausiert, bestellungPausiert } = await holeEinstellungen();
  const alle = sichtbareProdukte();
  const gueltig = kategorienFuer(saisonId);
  const aktiv = gueltig.find((k) => k.id === kategorie)?.id ?? "alle";
  const istSaisonArtikel = (p: (typeof alle)[number]) => saisonId !== null && p.gruppe === saisonId;
  // "Alle": Standardartikel zuerst, darunter (abgesetzt, mit Überschrift) die saisonalen Artikel.
  const liste = aktiv === "alle"
    ? [...alle].sort((a, b) => Number(istSaisonArtikel(a)) - Number(istSaisonArtikel(b)))
    : alle.filter((p) => p.kategorien.includes(aktiv as Kategorie));
  const nurWeihnacht = weihnachten && aktiv === "weihnachten";
  const gruppiert = aktiv === "alle" && modus !== "off" && liste.some(istSaisonArtikel) && liste.some((p) => !istSaisonArtikel(p));
  const normal = gruppiert ? liste.filter((p) => !istSaisonArtikel(p)) : (nurWeihnacht ? [] : liste);
  const saison = gruppiert ? liste.filter(istSaisonArtikel) : (nurWeihnacht ? liste : []);
  const halloween = aktiv === "halloween";
  const karte = (p: (typeof liste)[number], i: number) => (
    <ProductCard key={p.slug} p={p} farben={farben} gesperrt={wunschtextPausiert && !!p.personalisierung} vorschau={modus === "preview"} halloweenSicht={halloween} erste={i === 0 && aktiv === "alle" && !!p.bestseller} />
  );
  // Weihnachts-Kollektion gliedert sich in Rubriken (leere entfallen), Artikel ohne Rubrik stehen am Ende
  const rubriken = weihnachten
    ? [
        ...UNTERKATEGORIEN.map((u) => ({ id: u.id as string, label: u.label, items: saison.filter((p) => p.unterkategorie === u.id) })),
        { id: "weitere", label: "Weitere Stücke", items: saison.filter((p) => !p.unterkategorie) },
      ].filter((r) => r.items.length > 0)
    : [];

  return (
    <ShopShell theme={halloween ? "halloween" : undefined} saison={weihnachten ? "weihnachten" : !halloween && hwModus !== "off" ? "halloween-dark" : undefined} ton="nacht" banner={<PauseBanner />} zurueck={aktiv === "alle" ? "pixldrop" : "shop"}>
      <div className="shop-wrap">
        {weihnachten ? (
          <section className="shop-hero wn-hero" aria-labelledby="titel">
            <WeihnachtenBuehne />
            <div className="wn-scrim" aria-hidden="true" />
            <div className="wn-text">
              <p className="shop-overline">Advent 2026 &middot; selbst gedruckt</p>
              <h1 id="titel">Schicht für Schicht <em>Weihnachten.</em></h1>
              <div className="wn-abstand" aria-hidden="true" />
              <p className="lead">
                Teelichthalter, Sterne und Deko für den Advent, gedruckt in der Werkstatt.
                {modus === "preview" && " Noch nicht bestellbar: stöbern ist erlaubt, der Verkauf startet später."}
              </p>
              <div className="shop-hero-actions">
                <a className="shop-btn" href="#stuecke">Stücke ansehen</a>
                <Link className="shop-link" href="/3d-druck/anfrage">Etwas Eigenes anfragen</Link>
              </div>
            </div>
          </section>
        ) : halloween ? (
          <section className="shop-hero" style={{ minHeight: 0, paddingTop: 12 }} aria-labelledby="titel">
            <p className="shop-overline" style={{ color: "#ff8a1f" }}>Halloween-Kollektion</p>
            <h1 id="titel">Bis Anfang November dürfen sie spuken.</h1>
            <p className="lead">
              Kürbisse, Geister und Untersetzer für den Herbst.
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


        {!halloween && !weihnachten && <HalloweenBanner modus={hwModus} />}

        {!halloween && <IndividuellBanner pausiert={bestellungPausiert} linien={weihnachten} />}

        {weihnachten && aktiv === "alle" && modus !== "off" && <WeihnachtenKachel modus={modus === "sale" ? "sale" : "preview"} />}

        <div id="stuecke" className="shop-stuecke">
        {(halloween || nurWeihnacht) && <p className="shop-alle-link"><Link href="/3d-druck#stuecke">&larr; Alle Stücke</Link></p>}
        {weihnachten && modus === "preview" && aktiv !== "alle" && <WeihnachtenHinweis />}
        {liste.length > 0 ? (
          <>
            {normal.length > 0 && (
              <ul className="shop-grid" aria-label="Produkte">
                {normal.map(karte)}
              </ul>
            )}
            {saison.length > 0 && weihnachten && (
              <>
                <div className="shop-gruppe"><h2 className="shop-gruppe-titel" id="saison-titel"><span>Weihnachts-Kollektion</span><small>{SAISONEN.weihnachten.label} 2026</small></h2></div>
                {rubriken.map((r) => (
                  <section key={r.id} className="wn-rubrik" aria-labelledby={`rubrik-${r.id}`}>
                    <h3 id={`rubrik-${r.id}`}>{r.label}</h3>
                    <ul className="shop-grid" aria-labelledby={`rubrik-${r.id}`}>{r.items.map(karte)}</ul>
                  </section>
                ))}
              </>
            )}
            {saison.length > 0 && !weihnachten && (
              <>
                <div className="shop-gruppe"><h2 className="shop-gruppe-titel" id="saison-titel"><span>Halloween-Kollektion</span><small>nur bis Anfang November</small></h2></div>
                <ul className="shop-grid" aria-labelledby="saison-titel">
                  {saison.map(karte)}
                </ul>
              </>
            )}
          </>
        ) : weihnachten ? (
          <div className="shop-empty" role="status">
            <h2>Hier ist noch Platz unter dem Baum.</h2>
            <Link className="shop-btn" href="/3d-druck#stuecke">Alle Stücke ansehen</Link>
          </div>
        ) : (
          <div className="shop-empty" role="status">
            <EddieSchnitt className="shop-eddie-mini" />
            <h2>Hier ist&rsquo;s so leer wie Eddies Tasse um 7:55.</h2>
            <Link className="shop-btn" href="/3d-druck#stuecke">Alle Stücke ansehen</Link>
          </div>
        )}
        </div>

        {halloween && (
          <p className="shop-individuell-teaser">
            {bestellungPausiert ? (
              <>Etwas Eigenes? <span className="shop-btn--aus" aria-disabled="true">Individuell anfragen</span> <span className="shop-aus-hinweis">Vorübergehend pausiert</span></>
            ) : (
              <>Etwas Eigenes? <Link href="/3d-druck/anfrage">Individuell anfragen</Link> (Preis nach Anfrage)</>
            )}
          </p>
        )}

        <section className="shop-section" aria-labelledby="ablauf">
          <h2 id="ablauf">So läuft&rsquo;s</h2>
          <ol className="shop-steps">
            <li><strong>Aussuchen</strong>Farbe, Größe und auf Wunsch deinen Text wählen.</li>
            <li><strong>Bestellen</strong>In drei Schritten, mit Bon und allen Angaben vorab.</li>
            <li><strong>Ich drucke und verschicke</strong>Dein Stück wird frisch für dich gedruckt und von mir verpackt.</li>
          </ol>
        </section>

        <aside className={weihnachten ? "shop-alex shop-alex--ohne" : "shop-alex"} aria-labelledby="eddie-sagt">
          {!weihnachten && <EddieSchnitt className="shop-alex-eddie" />}
          <div className="shop-alex-text">
            <h2 id="eddie-sagt" style={{ fontSize: "1.25rem" }}>{weihnachten ? "Von der Werkbank" : "Eddie sagt"}</h2>
            <p>Ich entwerfe, drucke und verpacke selbst. Wenn etwas nicht passt, schreib mir.</p>
            <KontaktDialog label="Schreib mir" />
          </div>
        </aside>
      </div>
    </ShopShell>
  );
}
