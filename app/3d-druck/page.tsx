import Link from "next/link";
import ShopShell from "@/components/shop/ShopShell";
import PauseBanner from "@/components/shop/PauseBanner";
import KontaktDialog from "@/components/shop/KontaktDialog";
import BereichMerker from "@/components/shop/BereichMerker";
import LogoMarke from "@/components/shop/LogoMarke";
import StartKarte from "@/components/shop/StartKarte";
import HeroIntro from "@/components/shop/HeroIntro";
import { aktiveSaison, saisonModus } from "@/lib/shop/saison";
import { sichtbareProdukte, type Produkt } from "@/lib/shop/produkte";
import { AKTIONEN, datumDe } from "@/lib/shop/aktion";
import { BEREICH_NAME, TECHNIK_ANZEIGE, WAND_INSPIRATION, bereichFuer, type BereichId } from "@/lib/shop/bereiche";
import { fotosFuer } from "@/lib/shop/fotos";
import { formatPreis, TEXTE } from "@/lib/shop/config";
import { holeEinstellungen } from "@/lib/shop/server/einstellungen";

// Saison-Status und Aktion hängen vom Datum ab: pro Anfrage auswerten, nicht beim Build einfrieren.
export const dynamic = "force-dynamic";

// Später ins Weihnachtssortiment aufgenommene Artikel (Alex 06.11.): hinter den Weihnachtsartikeln.
const NACHTRAG = new Set(["kuerbis-teelichthalter", "design-kuerbis"]);
const cover = (slug: string) => `/shop/cover/${slug}.webp`;

function Pfeil() {
  return <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default async function ShopUebersicht() {
  const saisonId = aktiveSaison();
  const modus = saisonModus(saisonId);
  const weihnachten = saisonId === "weihnachten";
  const { wunschtextPausiert, bestellungPausiert } = await holeEinstellungen();

  const gruppen: Record<BereichId, Produkt[]> = { bubble: [], wand: [], technik: [], weihnachten: [], lieblinge: [] };
  for (const p of sichtbareProdukte()) gruppen[bereichFuer(p)].push(p);
  gruppen.weihnachten.sort((x, y) => Number(NACHTRAG.has(x.slug)) - Number(NACHTRAG.has(y.slug)));

  const zeigeTechnik = TECHNIK_ANZEIGE !== "aus";
  const zeigeWn = gruppen.weihnachten.length > 0;
  const bubble = gruppen.bubble[0];
  const bubbleFotos = fotosFuer("bubble-buchstabe");
  const bubbleBild = bubbleFotos[5] ?? { src: cover("bubble-buchstabe"), alt: "Bubble Buchstaben in vielen Farben" };
  const bubbleZweit = bubbleFotos[8];
  const bubblePreis = bubble ? `${bubble.optionen.some((g) => g.optionen.some((o) => (o.aufpreisCent ?? 0) > 0)) ? "ab " : ""}${formatPreis(bubble.preisCent)}` : "";

  // Aktion: Daten aus lib/shop/aktion.ts (nie hart kodieren), sichtbar solange sie läuft und Weihnachten verkauft wird.
  const a = AKTIONEN[0];
  const aktionLaeuft = weihnachten && modus === "sale" && !!a && Date.now() <= Date.parse(a.bis);

  const karte = (p: Produkt, i: number) => (
    <StartKarte key={p.slug} p={p} gesperrt={wunschtextPausiert && !!p.personalisierung} vorschau={modus === "preview"} erste={i === 0} />
  );

  const bereiche: { id: BereichId; label: string; sub: string; bild?: string }[] = [
    { id: "bubble", label: "Buchstaben", sub: "Bubble", bild: cover("bubble-buchstabe") },
    { id: "wand", label: "Wandtexte", sub: "Bald verfügbar" },
    ...(zeigeTechnik ? [{ id: "technik" as const, label: "Technik", sub: "Bald" }] : []),
    ...(zeigeWn ? [{ id: "weihnachten" as const, label: "Weihnachten", sub: aktionLaeuft ? "Aktion" : "Advent", bild: cover("weihnachtskugel") }] : []),
    { id: "lieblinge", label: "Lieblingsstücke", sub: "Spaß & Besonderes", bild: cover("wochentags-untersetzer-set") },
  ];

  const nav = (
    <nav className="sx-nav" aria-label="Bereiche">
      {bereiche.map((b) => <a key={b.id} href={`#${b.id}`}>{BEREICH_NAME[b.id]}</a>)}
    </nav>
  );

  return (
    <ShopShell look="modern" nav={nav} banner={<PauseBanner />}>
      <div className="shop-wrap">
        <BereichMerker kategorie="alle" />
        <HeroIntro />
        <LogoMarke />

        <section className="sx-hero" aria-labelledby="titel">
          <div className="sx-hero-tx">
            <span className="sx-pill">Bestseller</span>
            <h1 id="titel">Dein Name.<br />Deine Wand.</h1>
            <p>Bubble Buchstaben in 23 Farben, auf Bestellung gedruckt. Höhe, Farbe und Oberfläche wählst du selbst, den Preis siehst du sofort.</p>
            <div className="sx-row">
              <Link className="sx-btn" href="/3d-druck/bubble-buchstabe">Buchstaben gestalten</Link>
              <a className="sx-btn sx-btn--o" href="#lieblinge">Alle Produkte</a>
            </div>
            <ul className="sx-perks">
              <li><b>23 Farben</b>zum Aussuchen</li>
              <li><b>Selbst gedruckt</b>auf Bestellung</li>
              <li><b>3 bis 15 cm</b>Höhe wählbar</li>
            </ul>
          </div>
          <div className="sx-hero-bild">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover("bubble-buchstabe")} alt="Bubble Buchstaben in vielen Farben, Alphabet von A bis Z" width={1100} height={1100} fetchPriority="high" decoding="async" />
          </div>
        </section>

        <nav className="sx-cats" aria-label="Bereiche im Überblick">
          {bereiche.map((b) => (
            <a key={b.id} className="sx-cat" href={`#${b.id}`}>
              {b.bild ? (
                // eslint-disable-next-line @next/next/no-img-element
                <i><img src={b.bild} alt="" width={240} height={240} loading="lazy" decoding="async" /></i>
              ) : (
                <i className="sx-cat-ph" aria-hidden="true">{b.id === "wand" ? <span className="sx-aa">Aa</span> : <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4.5 7.5v9L12 21l7.5-4.5v-9L12 3Z" /><circle cx="12" cy="12" r="3" /></svg>}</i>
              )}
              {b.label}<small>{b.sub}</small>
            </a>
          ))}
        </nav>

        {aktionLaeuft && a && (
          <aside className="sx-aktion" aria-label={`${a.label}: ${a.prozent} % Rabatt`}>
            <div className="sx-aktion-tx">
              <p className="sx-eyebrow">Aktion bis {datumDe(a.bis)}</p>
              <h2>{a.prozent} % auf Weihnachtsdeko</h2>
              <p className="sx-aktion-code">Code <strong>{a.code}</strong> im Warenkorb eingeben</p>
              <p className="sx-aktion-klein">Gilt auf den Warenwert der Weihnachtsartikel, nicht auf Versandkosten und nicht auf andere Artikel. Zeitraum {datumDe(a.von)} bis {datumDe(a.bis)}.</p>
              <a className="sx-btn sx-btn--hell" href="#weihnachten">Jetzt ansehen</a>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="sx-aktion-bild" src={cover("weihnachtsbaum")} alt="" width={400} height={400} loading="lazy" decoding="async" />
          </aside>
        )}

        {/* 1. Bubble Buchstaben */}
        <section id="bubble" className="sx-sec" aria-labelledby="h-bubble">
          <div className="sx-hd"><h2 id="h-bubble">{BEREICH_NAME.bubble}</h2></div>
          {bubble && (
            <div className="sx-feature">
              <Link className="sx-feature-bild" href={`/3d-druck/${bubble.slug}`} tabIndex={-1} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bubbleBild.src} alt="" width={1100} height={1100} loading="lazy" decoding="async" />
              </Link>
              <div className="sx-feature-tx">
                <h3>{bubble.name}</h3>
                <p>{bubble.kurz}</p>
                <p className="sx-feature-preis"><span className="num">{bubblePreis}</span> pro Buchstabe</p>
                <div className="sx-row">
                  <Link className="sx-btn" href={`/3d-druck/${bubble.slug}`}>Konfigurieren</Link>
                </div>
                {bubbleZweit && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="sx-feature-klein" src={bubbleZweit.src} alt={bubbleZweit.alt} width={1100} height={1100} loading="lazy" decoding="async" />
                )}
              </div>
            </div>
          )}
        </section>

        {/* 2. Moderne Wandbuchstaben (noch nicht bestellbar) */}
        <section id="wand" className="sx-sec" aria-labelledby="h-wand">
          <div className="sx-hd"><h2 id="h-wand">{BEREICH_NAME.wand}</h2></div>
          <div className="sx-bald">
            <div>
              <span className="sx-pill">Bald verfügbar</span>
              <h3>Dein Wort in Schrift an der Wand</h3>
              <p>Wandtexte und Namen in eleganten Schriften, nach Maß gedruckt. Bestellen geht noch nicht. Wenn du etwas Bestimmtes im Kopf hast, schreib mir deine Anfrage.</p>
            </div>
            {bestellungPausiert ? (
              <div><span className="sx-btn sx-btn--aus" role="link" aria-disabled="true">Anfrage</span><p className="sx-klein">Vorübergehend pausiert</p></div>
            ) : (
              <Link className="sx-btn" href="/3d-druck/anfrage">Anfrage</Link>
            )}
          </div>
          <div className="sx-insp" role="list" aria-label="Inspiration für Wandbuchstaben">
            {WAND_INSPIRATION.length > 0
              ? WAND_INSPIRATION.map((f) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={f.src} role="listitem" src={f.src} alt={f.alt} width={800} height={1000} loading="lazy" decoding="async" />
                ))
              : [0, 1, 2, 3, 4].map((i) => <div key={i} role="listitem" className="sx-insp-ph"><span>Inspiration folgt</span></div>)}
          </div>
        </section>

        {/* 3. Technik (noch leer, per Konfig ausblendbar) */}
        {zeigeTechnik && (
          <section id="technik" className="sx-sec" aria-labelledby="h-technik">
            <div className="sx-hd"><h2 id="h-technik">{BEREICH_NAME.technik}</h2></div>
            {gruppen.technik.length > 0 ? (
              <ul className="sx-grid" aria-label="Technik-Artikel">{gruppen.technik.map(karte)}</ul>
            ) : (
              <div className="sx-bald sx-bald--ruhig">
                <div>
                  <span className="sx-pill">Bald</span>
                  <h3>Praktisches für Technik und Alltag</h3>
                  <p>Halter, Profile und Kleinteile, die ein Problem lösen. Hier kommt demnächst das Erste.</p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 4. Weihnachten */}
        {zeigeWn && (
          <section id="weihnachten" className="sx-sec" aria-labelledby="h-wn">
            <div className="sx-hd"><h2 id="h-wn">{BEREICH_NAME.weihnachten}</h2><span className="sx-hd-sub">Advent 2026</span></div>
            {modus === "preview" && <p className="sx-hinweis" role="status">Noch nicht bestellbar: stöbern ist erlaubt, der Verkauf startet später.</p>}
            <ul className="sx-grid" aria-labelledby="h-wn">{gruppen.weihnachten.map(karte)}</ul>
          </section>
        )}

        {/* 5. Lieblingsstücke: alles Verspielte und Besondere, ganz hinten */}
        <section id="lieblinge" className="sx-sec" aria-labelledby="h-lieblinge">
          <div className="sx-hd"><h2 id="h-lieblinge">{BEREICH_NAME.lieblinge}</h2><span className="sx-hd-sub">Untersetzer, Schilder und Deko mit Humor</span></div>
          {gruppen.lieblinge.length > 0 ? (
            <ul className="sx-grid" aria-labelledby="h-lieblinge">{gruppen.lieblinge.map(karte)}</ul>
          ) : (
            <p className="sx-hinweis" role="status">Gerade ist hier nichts im Angebot.</p>
          )}
        </section>

        {/* "Etwas Eigenes?" steht immer unter dem letzten Artikel */}
        <section className="sx-ind" aria-labelledby="ind-titel">
          <div>
            <p className="sx-eyebrow">Individuell</p>
            <h2 id="ind-titel">Etwas Eigenes gewünscht?</h2>
            <p>Beschreib deine Idee, lade ein Foto hoch, du bekommst ein unverbindliches Angebot. {TEXTE.preisAnfrage}.</p>
          </div>
          {bestellungPausiert ? (
            <div><span className="sx-btn sx-btn--aus" role="link" aria-disabled="true">Individuell anfragen</span><p className="sx-klein">Vorübergehend pausiert</p></div>
          ) : (
            <Link className="sx-btn" href="/3d-druck/anfrage">Individuell anfragen<Pfeil /></Link>
          )}
        </section>

        <section className="sx-sec" aria-labelledby="ablauf">
          <div className="sx-hd"><h2 id="ablauf">So läuft&rsquo;s</h2></div>
          <ol className="sx-steps">
            <li><strong>Aussuchen</strong>Farbe, Größe und auf Wunsch deinen Text wählen.</li>
            <li><strong>Bestellen</strong>In drei Schritten, mit Bon und allen Angaben vorab.</li>
            <li><strong>Ich drucke und verschicke</strong>Dein Stück wird frisch für dich gedruckt und von mir verpackt.</li>
          </ol>
        </section>

        <aside className="sx-kontakt" aria-labelledby="werkbank">
          <div>
            <h2 id="werkbank">Von der Werkbank</h2>
            <p>Ich entwerfe, drucke und verpacke selbst. Wenn etwas nicht passt, schreib mir.</p>
          </div>
          <KontaktDialog label="Schreib mir" />
        </aside>
      </div>
    </ShopShell>
  );
}
