"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Produkt } from "@/lib/shop/produkte";
import type { Farbe } from "@/lib/shop/farben";
import { ladeAuswahl, speichereAuswahl, type Auswahl } from "@/lib/shop/auswahl";
import { SHOP_AKTIV, TEXTE, VERKAEUFER, VERSAND_CENT, LIEFERZEIT_TEXT, formatPreis } from "@/lib/shop/config";
import ProductImage from "./ProductImage";
import { baueBestellung, holeFormToken, idempotenzKeyFuer, istPaypalUrl, ladeKunde, sendeBestellung, speichereKunde } from "@/lib/shop/client";

const ZAHLUNG_HINWEIS: Record<string, string> = {
  abgebrochen: "Zahlung nicht abgeschlossen, es ist kein Vertrag zustande gekommen. Es wurde nichts abgebucht. Du kannst unten erneut bestellen.",
  fehler: "Die Zahlung hat nicht geklappt. Es wurde nichts abgebucht. Bitte versuch es noch einmal oder schreib an as@sitekx.de.",
  unklar: "Wir konnten deine Zahlung gerade nicht zuordnen. Bitte bestelle nicht erneut. Falls bei PayPal etwas abgebucht wurde, bekommst du eine Bestätigung per E-Mail, sonst schreib bitte an as@sitekx.de.",
};

interface Daten { name: string; strasse: string; plz: string; ort: string; email: string; hinweis: string }
const LEER: Daten = { name: "", strasse: "", plz: "", ort: "", email: "", hinweis: "" };
const SCHRITTE = ["Dein Stück", "Deine Daten", "Prüfen & bestellen"];

type Fehler = Partial<Record<keyof Daten | "agb" | "widerruf", string>>;

function pruefeDaten(d: Daten): Fehler {
  const f: Fehler = {};
  if (d.name.trim().length < 2) f.name = "Bitte gib deinen vollständigen Namen ein, z. B. Max Mustermann.";
  if (d.strasse.trim().length < 3) f.strasse = "Bitte gib Straße und Hausnummer ein, z. B. Hauptstraße 12.";
  if (!/^[0-9]{5}$/.test(d.plz.trim())) f.plz = "Bitte eine fünfstellige Postleitzahl eingeben, z. B. 86663.";
  if (d.ort.trim().length < 2) f.ort = "Bitte gib deinen Ort ein.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) f.email = "Bitte eine gültige E-Mail eingeben, z. B. name@mail.de";
  return f;
}

const FELDNAMEN: Record<string, string> = {
  name: "Name", strasse: "Straße", plz: "Postleitzahl", ort: "Ort", email: "E-Mail", agb: "AGB und Widerrufsbelehrung", widerruf: "Widerrufsausschluss",
};

export default function Bestellablauf({
  schritt, produkte, farben, zahlung,
}: { schritt: 1 | 2 | 3; produkte: Produkt[]; farben: Farbe[]; zahlung?: string }) {
  const router = useRouter();
  const [auswahl, setAuswahl] = useState<Auswahl | null>(null);
  const [geladen, setGeladen] = useState(false);
  const [daten, setDaten] = useState<Daten>(LEER);
  const [agb, setAgb] = useState(false);
  const [fehler, setFehler] = useState<Fehler>({});
  const [entfernen, setEntfernen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tokenFehler, setTokenFehler] = useState(false);
  const [website, setWebsite] = useState("");
  const kopf = useRef<HTMLHeadingElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const erster = useRef(true);

  useEffect(() => {
    setAuswahl(ladeAuswahl());
    const k = ladeKunde();
    if (k) setDaten({ ...LEER, ...k });
    setGeladen(true);
  }, []);
  useEffect(() => { if (geladen) speichereKunde(daten); }, [daten, geladen]);
  useEffect(() => {
    if (!SHOP_AKTIV || schritt !== 3) return;
    let aktiv = true;
    holeFormToken().then((t) => { if (aktiv) { setToken(t); setTokenFehler(!t); } });
    return () => { aktiv = false; };
  }, [schritt]);
  useEffect(() => {
    if (erster.current) { erster.current = false; return; }
    kopf.current?.focus();
  }, [schritt]);

  const p = auswahl ? produkte.find((x) => x.slug === auswahl.slug) : undefined;

  if (!geladen) return <div className="shop-skeleton" style={{ aspectRatio: "16 / 9" }} aria-busy="true" aria-label="Wird geladen" />;
  if (!auswahl || !p) {
    return (
      <div className="shop-empty" role="status">
        {zahlung && ZAHLUNG_HINWEIS[zahlung] && <p className={zahlung === "unklar" ? "shop-alert" : "shop-demo"}>{ZAHLUNG_HINWEIS[zahlung]}</p>}
        <h2>Noch nichts auf dem Tresen.</h2>
        <p>Such dir ein Stück aus, dann geht es hier weiter.</p>
        <Link className="shop-btn" href="/3d-druck#stuecke">Alle Stücke ansehen</Link>
      </div>
    );
  }

  const farbe = farben.find((f) => f.id === auswahl.farbeId);
  const optText = p.optionen.map((g) => `${g.label}: ${g.optionen.find((o) => o.id === auswahl.optionen[g.id])?.label ?? ""}`);
  const gesamt = p.preisCent != null ? p.preisCent * auswahl.menge + (VERSAND_CENT ?? 0) : null;
  const gehe = (n: number) => router.push(`/3d-druck/bestellung?schritt=${n}`);
  const setze = (a: Auswahl) => { setAuswahl(a); speichereAuswahl(a); };
  const upd = (k: keyof Daten) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDaten({ ...daten, [k]: e.target.value });
    if (fehler[k]) setFehler({ ...fehler, [k]: undefined });
  };
  const datenOk = Object.keys(pruefeDaten(daten)).length === 0;
  const aktuell = schritt === 3 && !datenOk ? 2 : schritt;

  function zuSchritt3() {
    const f = pruefeDaten(daten);
    setFehler(f);
    if (Object.keys(f).length) {
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }
    gehe(3);
  }
  async function bestellen() {
    if (laeuft || !auswahl) return;
    const f: Fehler = {};
    if (!agb) f.agb = "Bitte bestätige, dass du AGB und Widerrufsbelehrung gelesen hast und einverstanden bist.";
    setFehler(f);
    setServerFehler(null);
    if (Object.keys(f).length) {
      setStatus(null);
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }
    if (!SHOP_AKTIV) { setStatus("Bestellung noch nicht aktiv. Es wurde nichts gesendet oder gespeichert."); return; }
    setLaeuft(true);
    const t = token ?? (await holeFormToken());
    if (!t) {
      setLaeuft(false); setTokenFehler(true);
      setServerFehler("Die Bestellung ist gerade nicht erreichbar. Deine Eingaben sind noch da. Bitte versuch es gleich noch einmal oder schreib an as@sitekx.de.");
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }
    setToken(t);
    const inhalt = { auswahl, daten };
    const key = idempotenzKeyFuer(JSON.stringify(inhalt));
    const r = await sendeBestellung(baueBestellung({ token: t, idempotenzKey: key, auswahl, kunde: daten, agb, widerruf: false, website }));
    if (r.ok && istPaypalUrl(r.approveUrl)) {
      window.location.href = r.approveUrl; // Button bleibt gesperrt bis die Seite wechselt
      return;
    }
    setLaeuft(false);
    if (r.ok) { setServerFehler("Die Weiterleitung zu PayPal ist ungültig. Es wurde nichts abgebucht. Bitte versuch es noch einmal."); }
    else {
      const fe = r.fehler;
      if (fe.code === "token") holeFormToken().then(setToken);
      if (fe.felder && Object.keys(fe.felder).length) {
        gehe(2);
        setFehler(fe.felder as Fehler);
        setServerFehler(fe.meldung);
      } else setServerFehler(fe.meldung);
    }
    requestAnimationFrame(() => alertRef.current?.focus());
  }

  const fehlerListe = Object.entries(fehler).filter(([, v]) => v) as [string, string][];
  const FehlerBlock = (fehlerListe.length > 0 || serverFehler) && (
    <div className="shop-alert" role="alert" tabIndex={-1} ref={alertRef}>
      <strong>{serverFehler ? "Das hat nicht geklappt." : "Bitte prüfe diese Angaben:"}</strong>
      {serverFehler && <p>{serverFehler}</p>}
      <ul>
        {fehlerListe.map(([k, v]) => (
          <li key={k}><a href={`#f-${k}`}>{FELDNAMEN[k]}</a>: {v}</li>
        ))}
      </ul>
    </div>
  );

  const feld = (k: keyof Daten, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="shop-field">
      <label htmlFor={`f-${k}`}>{label} <span className="opt">(Pflicht)</span></label>
      <input id={`f-${k}`} name={k} className="shop-input" value={daten[k]} onChange={upd(k)}
        aria-invalid={!!fehler[k]} aria-describedby={fehler[k] ? `e-${k}` : undefined} {...props} />
      {fehler[k] && <span id={`e-${k}`} className="shop-err">{fehler[k]}</span>}
    </div>
  );

  return (
    <div>
      {!SHOP_AKTIV && (
        <p className="shop-demo" role="note">
          <strong>Vorschau-Modus:</strong> Der Shop ist noch nicht aktiv. Es wird nichts gesendet oder gespeichert,
          deine Eingaben bleiben nur in diesem Tab. <Link className="shop-link" href="/3d-druck/danke?vorschau=1">Dankeseite ansehen</Link>
        </p>
      )}
      {zahlung && ZAHLUNG_HINWEIS[zahlung] && (
        <p className={zahlung === "unklar" ? "shop-alert" : "shop-demo"} role="status" style={{ marginBottom: 16 }}>{ZAHLUNG_HINWEIS[zahlung]}</p>
      )}
      <ol className="shop-progress" aria-label="Bestellschritte">
        {SCHRITTE.map((s, i) => (
          <li key={s} aria-current={aktuell === i + 1 ? "step" : undefined} className={aktuell > i + 1 ? "done" : undefined}>{s}</li>
        ))}
      </ol>

      {aktuell === 1 && (
        <section aria-labelledby="s1">
          <h1 id="s1" tabIndex={-1} ref={kopf} style={{ fontSize: "clamp(1.75rem, 7vw, 2.4rem)", outline: "none" }}>Dein Stück</h1>
          <div className="shop-form" style={{ marginTop: 16 }}>
            <div className="shop-summary">
              <ProductImage form={p.form} farbe={farbe?.hex ?? p.grundfarbe} />
              <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                <h2 style={{ fontSize: "1.125rem" }}>{p.name}</h2>
                {farbe && <p className="muted">Farbe: {farbe.name}</p>}
                {optText.map((t) => <p key={t} className="muted">{t}</p>)}
                <p className="shop-price-small">{formatPreis(p.preisCent)}</p>
              </div>
            </div>
            <div className="shop-field">
              <label htmlFor="b-menge">Menge</label>
              <div className="shop-stepper">
                <button type="button" aria-label="Menge verringern" onClick={() => setze({ ...auswahl, menge: Math.max(1, auswahl.menge - 1) })}>−</button>
                <input id="b-menge" className="shop-input" type="number" inputMode="numeric" min={1} max={20} value={auswahl.menge}
                  onChange={(e) => setze({ ...auswahl, menge: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })} />
                <button type="button" aria-label="Menge erhöhen" onClick={() => setze({ ...auswahl, menge: Math.min(20, auswahl.menge + 1) })}>+</button>
              </div>
            </div>
            <p className="shop-note" role="note">{TEXTE.startHinweis} <Link className="shop-link" style={{ minHeight: 0 }} href="/3d-druck/anfrage">Individueller Druck</Link></p>
            <p className="muted">Zwischensumme: {formatPreis(p.preisCent != null ? p.preisCent * auswahl.menge : null)} · {TEXTE.versandHinweis}</p>
            <div className="shop-actions" style={{ marginTop: 0 }}>
              <button type="button" className="shop-btn" onClick={() => gehe(2)}>Weiter</button>
              {!entfernen ? (
                <button type="button" className="shop-link" style={{ background: "none", border: 0, cursor: "pointer", font: "inherit", fontWeight: 600 }} onClick={() => setEntfernen(true)}>Entfernen</button>
              ) : (
                <span role="alert" style={{ display: "inline-flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  Wirklich entfernen?
                  <button type="button" className="shop-btn shop-btn--small" onClick={() => { speichereAuswahl(null); setAuswahl(null); }}>Ja, entfernen</button>
                  <button type="button" className="shop-btn shop-btn--small shop-btn--ghost" onClick={() => setEntfernen(false)}>Abbrechen</button>
                </span>
              )}
            </div>
          </div>
        </section>
      )}

      {aktuell === 2 && (
        <section aria-labelledby="s2">
          <h1 id="s2" tabIndex={-1} ref={kopf} style={{ fontSize: "clamp(1.75rem, 7vw, 2.4rem)", outline: "none" }}>Deine Daten</h1>
          <form className="shop-form" style={{ marginTop: 16 }} noValidate onSubmit={(e) => { e.preventDefault(); zuSchritt3(); }}>
            {FehlerBlock}
            {feld("name", "Name", { type: "text", autoComplete: "name" })}
            {feld("strasse", "Straße und Hausnummer", { type: "text", autoComplete: "address-line1" })}
            <div style={{ display: "grid", gridTemplateColumns: "120px minmax(0,1fr)", gap: 10 }}>
              {feld("plz", "PLZ", { type: "text", inputMode: "numeric", autoComplete: "postal-code", pattern: "[0-9]{5}", maxLength: 5 })}
              {feld("ort", "Ort", { type: "text", autoComplete: "address-level2" })}
            </div>
            <div className="shop-field">
              <label htmlFor="f-land">Land</label>
              <input id="f-land" className="shop-input" value="Deutschland" readOnly aria-describedby="land-info" />
              <span id="land-info" className="muted">Wir liefern nur innerhalb Deutschlands.</span>
            </div>
            {feld("email", "E-Mail", { type: "email", autoComplete: "email", spellCheck: false })}
            <div className="shop-field">
              <label htmlFor="f-hinweis">Hinweise <span className="opt">(optional)</span></label>
              <textarea id="f-hinweis" name="hinweis" className="shop-input" value={daten.hinweis} onChange={upd("hinweis")} placeholder="z. B. bitte ohne Geschenkverpackung…" />
            </div>
            <div className="shop-actions" style={{ marginTop: 0 }}>
              <button type="submit" className="shop-btn">Weiter</button>
              <button type="button" className="shop-link" style={{ background: "none", border: 0, cursor: "pointer", font: "inherit", fontWeight: 600 }} onClick={() => gehe(1)}>Zurück</button>
            </div>
          </form>
        </section>
      )}

      {aktuell === 3 && (
        <section aria-labelledby="s3">
          <h1 id="s3" tabIndex={-1} ref={kopf} style={{ fontSize: "clamp(1.75rem, 7vw, 2.4rem)", outline: "none" }}>Prüfen &amp; bestellen</h1>
          <div className="shop-form" style={{ marginTop: 16 }}>
            {FehlerBlock}
            <div className="shop-field">
              <label className="shop-check" htmlFor="f-agb" id="f-agb-l">
                <input id="f-agb" type="checkbox" checked={agb} onChange={(e) => { setAgb(e.target.checked); setFehler({ ...fehler, agb: undefined }); }} aria-invalid={!!fehler.agb} />
                <span>Ich habe die <Link className="shop-link" style={{ minHeight: 0 }} href="/3d-druck/agb" target="_blank" rel="noopener">AGB</Link> und die <Link className="shop-link" style={{ minHeight: 0 }} href="/3d-druck/widerruf" target="_blank" rel="noopener">Widerrufsbelehrung</Link> gelesen und bin damit einverstanden. <span className="opt">(Pflicht)</span></span>
              </label>
            </div>

            <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
              <label>Bitte leer lassen<input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
            </div>
            <section className="shop-bon" aria-labelledby="bon-t">
              <h2 id="bon-t">Dein Bon</h2>
              <dl>
                <div><dt>Ware</dt><dd>{p.name}</dd></div>
                {farbe && <div><dt>Farbe</dt><dd>{farbe.name}</dd></div>}
                {optText.map((t) => { const [a, b] = t.split(": "); return <div key={t}><dt>{a}</dt><dd>{b}</dd></div>; })}
                <div><dt>Maße</dt><dd>{p.masse ?? "folgen"}</dd></div>
                <div><dt>Material</dt><dd>{p.material}</dd></div>
                <div><dt>{auswahl.menge} × Einzelpreis</dt><dd>{formatPreis(p.preisCent)}</dd></div>
                <div><dt>Versand (Deutschland)</dt><dd>{VERSAND_CENT != null ? formatPreis(VERSAND_CENT) : "folgt"}</dd></div>
              </dl>
              <dl><div className="gesamt"><dt>Gesamtpreis</dt><dd>{gesamt != null ? formatPreis(gesamt) : "folgt"}</dd></div></dl>
              <div className="kleinteil">
                <p>{TEXTE.kleinunternehmer}</p>
                <p>Lieferzeit: {LIEFERZEIT_TEXT ?? "folgt"}. Lieferung nur innerhalb Deutschlands.</p>
                <p>Zahlung: sofort per PayPal. {TEXTE.vertragsschluss}</p>
                <p>
                  Widerruf: 14 Tage Widerruf.{" "}
                  <Link className="shop-link" style={{ minHeight: 0 }} href="/3d-druck/widerruf" target="_blank" rel="noopener">Zur Belehrung</Link>
                </p>
                <p>Verkäufer: {VERKAEUFER.name}, {VERKAEUFER.anschrift}, {VERKAEUFER.mail}</p>
                <p>{TEXTE.keinSpielzeug}</p>
              </div>
            </section>
            <button type="button" className="shop-btn shop-btn--block" aria-disabled={!SHOP_AKTIV || laeuft} aria-busy={laeuft} onClick={bestellen}>
              {laeuft ? "Einen Moment, weiter zu PayPal…" : SHOP_AKTIV ? TEXTE.bestellButton : TEXTE.bestellInaktiv}
              {!SHOP_AKTIV && !laeuft && <small>Im Echtbetrieb: „{TEXTE.bestellButton}“</small>}
            </button>
            <p className="muted">{TEXTE.datenschutzHinweis} <a href="/datenschutz" target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>Datenschutzerklärung</a>.</p>
            {status && <p className="shop-demo" role="status">{status}</p>}
            <div className="shop-actions" style={{ marginTop: 0 }}>
              <button type="button" className="shop-link" style={{ background: "none", border: 0, cursor: "pointer", font: "inherit", fontWeight: 600 }} onClick={() => gehe(2)}>Daten ändern</button>
              <button type="button" className="shop-link" style={{ background: "none", border: 0, cursor: "pointer", font: "inherit", fontWeight: 600 }} onClick={() => gehe(1)}>Stück ändern</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
