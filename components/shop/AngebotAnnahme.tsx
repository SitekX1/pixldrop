"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ANGEBOT_TEXTE, ANGEBOT_TEXTE_FREIGEGEBEN } from "@/lib/shop/angebot-texte";
import { formatPreis, TEXTE } from "@/lib/shop/config";
import { istPaypalUrl } from "@/lib/shop/client";

// Annahme-Seite fuer ein Angebot (Client-Teil): Bon mit den Angebotsdaten + Formular (Anschrift, Pflicht-Checkboxen) -> POST /api/shop/angebot/annehmen -> PayPal.
// Der Preis wird nur angezeigt; der Server nimmt ihn aus der DB. Die E-Mail wird nicht abgefragt (der Link ging an sie).
export interface AngebotDaten {
  token: string;
  anfragenummer: string;
  name: string;
  beschreibung: string;
  farbe: string | null;
  preisCent: number;
  versandCent: number;
  gesamtCent: number;
  lieferzeit: string | null;
  text: string | null;
  gueltigBis: string; // bereits formatiert, z. B. "24.10.2026"
  /** true = Bestellung zu diesem Angebot existiert schon, Zahlung steht noch aus (Wiederaufnahme) */
  zahlungOffen: boolean;
}

interface Daten { name: string; strasse: string; plz: string; ort: string }
type Fehler = Partial<Record<keyof Daten | "agb" | "verzicht", string>>;
const FELDNAMEN: Record<string, string> = { name: "Name", strasse: "Straße", plz: "Postleitzahl", ort: "Ort", agb: "AGB und Widerrufsbelehrung", verzicht: "Widerrufsausschluss" };

function pruefe(d: Daten): Fehler {
  const f: Fehler = {};
  if (d.name.trim().length < 2) f.name = "Bitte gib deinen vollständigen Namen ein, z. B. Max Mustermann.";
  if (d.strasse.trim().length < 3) f.strasse = "Bitte gib Straße und Hausnummer ein, z. B. Hauptstraße 12.";
  if (!/^[0-9]{5}$/.test(d.plz.trim())) f.plz = "Bitte eine fünfstellige Postleitzahl eingeben, z. B. 86663.";
  if (d.ort.trim().length < 2) f.ort = "Bitte gib deinen Ort ein.";
  return f;
}

const HINWEIS_ABBRUCH = "Die Zahlung wurde nicht abgeschlossen, es ist noch nichts abgebucht worden. Dein Angebot bleibt bis zum Ablaufdatum gültig, du kannst es unten erneut annehmen.";

export default function AngebotAnnahme({
  angebot, pausiert = false, pauseText, abgebrochen = false, entwurf = !ANGEBOT_TEXTE_FREIGEGEBEN,
}: { angebot: AngebotDaten; pausiert?: boolean; pauseText?: string | null; abgebrochen?: boolean; entwurf?: boolean }) {
  const [daten, setDaten] = useState<Daten>({ name: angebot.name, strasse: "", plz: "", ort: "" });
  const [agb, setAgb] = useState(false);
  const [verzicht, setVerzicht] = useState(false);
  const [fehler, setFehler] = useState<Fehler>({});
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [pauseServer, setPauseServer] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const alertRef = useRef<HTMLDivElement>(null);
  const fokus = () => requestAnimationFrame(() => alertRef.current?.focus());

  const upd = (k: keyof Daten) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setDaten({ ...daten, [k]: e.target.value });
    if (fehler[k]) setFehler({ ...fehler, [k]: undefined });
  };
  const sperre = pausiert || !!pauseServer;
  const sperreText = pauseServer ?? pauseText ?? "Bestellungen sind aktuell pausiert.";

  async function annehmen() {
    if (laeuft || sperre) return;
    const f: Fehler = pruefe(daten);
    if (!agb) f.agb = "Bitte bestätige AGB und Widerrufsbelehrung.";
    if (!verzicht) f.verzicht = "Bitte bestätige den Widerrufsausschluss für dein individuell gefertigtes Stück.";
    setFehler(f);
    setServerFehler(null);
    if (Object.keys(f).length) { fokus(); return; }
    setLaeuft(true);
    try {
      const res = await fetch("/api/shop/angebot/annehmen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          t: angebot.token, website,
          kunde: { name: daten.name.trim(), strasse: daten.strasse.trim(), plz: daten.plz.trim(), ort: daten.ort.trim() },
          einwilligungen: { agb: true, verzicht: true },
        }),
      });
      const r = (await res.json().catch(() => null)) as { ok?: boolean; code?: string; error?: string; approveUrl?: string; felder?: Record<string, string> } | null;
      if (r?.ok && typeof r.approveUrl === "string" && istPaypalUrl(r.approveUrl)) {
        window.location.href = r.approveUrl; // Button bleibt gesperrt bis die Seite wechselt
        return;
      }
      setLaeuft(false);
      if (r?.ok) setServerFehler("Die Weiterleitung zu PayPal ist ungültig. Es wurde nichts abgebucht. Bitte versuch es noch einmal.");
      else if (r?.code === "pausiert") setPauseServer(r.error ?? "Bestellungen sind aktuell pausiert.");
      else if (r?.code === "abgelaufen" || r?.code === "bereits_angenommen" || r?.code === "ungueltig") {
        // Zustand hat sich geaendert: Seite neu laden, die Server-Seite zeigt den passenden Hinweis.
        window.location.reload();
        return;
      } else if (r?.felder && Object.keys(r.felder).length) { setFehler(r.felder as Fehler); setServerFehler(r.error ?? "Bitte prüfe deine Angaben."); }
      else setServerFehler(r?.error ?? "Das hat nicht geklappt. Es wurde nichts abgebucht. Bitte versuch es noch einmal oder schreib an as@sitekx.de.");
    } catch {
      setLaeuft(false);
      setServerFehler("Keine Verbindung. Deine Eingaben sind noch da, es wurde nichts abgebucht. Bitte prüfe dein Netz und versuch es gleich noch einmal.");
    }
    fokus();
  }

  const fehlerListe = Object.entries(fehler).filter(([, v]) => v) as [string, string][];
  const FehlerBlock = (fehlerListe.length > 0 || serverFehler) && (
    <div className="shop-alert" role="alert" tabIndex={-1} ref={alertRef}>
      <strong>{serverFehler ? "Das hat nicht geklappt." : "Bitte prüfe diese Angaben:"}</strong>
      {serverFehler && <p>{serverFehler}</p>}
      <ul>
        {fehlerListe.map(([k, v]) => <li key={k}><a href={`#f-${k}`}>{FELDNAMEN[k]}</a>: {v}</li>)}
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
      <p className="shop-overline">Dein Angebot · {angebot.anfragenummer}</p>
      <h1 style={{ fontSize: "clamp(1.9rem, 8vw, 2.8rem)", margin: "8px 0 12px" }}>Hallo {angebot.name.split(" ")[0]}, hier ist dein Angebot.</h1>
      {angebot.text && <p style={{ whiteSpace: "pre-line", overflowWrap: "anywhere", marginBottom: 16 }}>{angebot.text}</p>}

      {entwurf && (
        <p className="shop-demo" role="note"><strong>Entwurf:</strong> Die rechtlichen Texte auf dieser Seite sind Platzhalter und noch nicht freigegeben.</p>
      )}
      {abgebrochen && !sperre && <p className="shop-demo" role="status" style={{ marginBottom: 16 }}>{HINWEIS_ABBRUCH}</p>}
      {angebot.zahlungOffen && !abgebrochen && (
        <p className="shop-demo" role="status" style={{ marginBottom: 16 }}>Du hast dieses Angebot schon angenommen, die Zahlung steht noch aus. Du kannst sie unten abschließen.</p>
      )}
      {sperre && (
        <div className="shop-pause" data-voll="true" role="status" style={{ marginBottom: 16 }}>
          <span className="shop-pause-icon" aria-hidden="true">!</span>
          <div><strong>Bestellungen sind gerade pausiert</strong><p>{sperreText} Es wurde nichts abgebucht. Dein Angebot bleibt bis {angebot.gueltigBis} gültig; ist die Pause bis dahin nicht vorbei, melde dich bei mir.</p></div>
        </div>
      )}

      <section className="shop-bon" aria-labelledby="bon-t">
        <h2 id="bon-t">Dein Angebot</h2>
        <dl>
          <div><dt>Anfrage</dt><dd>{angebot.anfragenummer}</dd></div>
          {angebot.farbe && <div><dt>Wunschfarbe</dt><dd>{angebot.farbe}</dd></div>}
          <div><dt>Lieferzeit</dt><dd>{angebot.lieferzeit ? `${angebot.lieferzeit} nach Zahlung` : "nach Absprache"}</dd></div>
          <div><dt>Gültig bis</dt><dd>{angebot.gueltigBis}</dd></div>
        </dl>
        <div>
          <p className="shop-label" style={{ marginBottom: 4 }}>Deine Anfrage</p>
          <p style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{angebot.beschreibung}</p>
        </div>
        <dl>
          <div><dt>Individuelle Anfertigung</dt><dd>{formatPreis(angebot.preisCent)}</dd></div>
          <div><dt>Versand (Deutschland)</dt><dd>{angebot.versandCent === 0 ? "kostenlos" : formatPreis(angebot.versandCent)}</dd></div>
        </dl>
        <dl><div className="gesamt"><dt>Gesamtpreis</dt><dd>{formatPreis(angebot.gesamtCent)}</dd></div></dl>
        <div className="kleinteil">
          <p>{TEXTE.kleinunternehmer}</p>
          <p>Zahlung: sofort per PayPal. Lieferung nur innerhalb Deutschlands.</p>
          <p>Verkäufer: siehe <a className="shop-link" style={{ minHeight: 0 }} href="/impressum" target="_blank" rel="noopener">Impressum</a></p>
        </div>
      </section>

      <h2 style={{ margin: "28px 0 4px", fontSize: "1.5rem" }}>Annehmen und bezahlen</h2>
      <form className="shop-form" style={{ marginTop: 12 }} noValidate onSubmit={(e) => { e.preventDefault(); void annehmen(); }}>
        {FehlerBlock}
        <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
          <label>Bitte leer lassen<input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
        </div>
        {feld("name", "Name", { type: "text", autoComplete: "name" })}
        {feld("strasse", "Straße und Hausnummer", { type: "text", autoComplete: "address-line1" })}
        <div style={{ display: "grid", gridTemplateColumns: "120px minmax(0,1fr)", gap: 10 }}>
          {feld("plz", "PLZ", { type: "text", inputMode: "numeric", autoComplete: "postal-code", pattern: "[0-9]{5}", maxLength: 5 })}
          {feld("ort", "Ort", { type: "text", autoComplete: "address-level2" })}
        </div>
        <div className="shop-field">
          <label htmlFor="f-land">Land</label>
          <input id="f-land" className="shop-input" value="Deutschland" readOnly aria-describedby="land-info" />
          <span id="land-info" className="muted">Wir liefern nur innerhalb Deutschlands. Die Bestätigung geht per E-Mail an die Adresse, an die das Angebot gesendet wurde.</span>
        </div>

        <p className="shop-note shop-note--warn" role="note">{ANGEBOT_TEXTE.verzichtHinweis}</p>
        <div className="shop-field">
          <label className="shop-check" htmlFor="f-agb">
            <input id="f-agb" type="checkbox" checked={agb} onChange={(e) => { setAgb(e.target.checked); setFehler({ ...fehler, agb: undefined }); }} aria-invalid={!!fehler.agb} />
            <span>Ich habe die <Link className="shop-link" style={{ minHeight: 0 }} href="/3d-druck/agb" target="_blank" rel="noopener">AGB</Link> und die <Link className="shop-link" style={{ minHeight: 0 }} href="/3d-druck/widerruf" target="_blank" rel="noopener">Widerrufsbelehrung</Link> zur Kenntnis genommen und akzeptiere die AGB. <span className="opt">(Pflicht)</span></span>
          </label>
        </div>
        <div className="shop-field">
          <label className="shop-check" htmlFor="f-verzicht">
            <input id="f-verzicht" type="checkbox" checked={verzicht} onChange={(e) => { setVerzicht(e.target.checked); setFehler({ ...fehler, verzicht: undefined }); }} aria-invalid={!!fehler.verzicht} />
            <span>{ANGEBOT_TEXTE.verzichtLabel} <span className="opt">(Pflicht)</span></span>
          </label>
        </div>

        <section aria-labelledby="zsf-t" style={{ borderTop: "2px solid currentColor", borderBottom: "1px solid currentColor", padding: "12px 0", margin: "8px 0 4px" }}>
          <h3 id="zsf-t" className="shop-label" style={{ margin: "0 0 6px" }}>Das nimmst du jetzt an</h3>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: "4px 14px", fontSize: "0.95rem" }}>
            <dt>Ware</dt>
            <dd style={{ margin: 0, overflowWrap: "anywhere" }}>
              Individuelle Anfertigung, Anfrage {angebot.anfragenummer}
              <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", opacity: 0.8 }}>{angebot.beschreibung}</span>
            </dd>
            <dt>Gesamtpreis</dt>
            <dd style={{ margin: 0 }}><strong>{formatPreis(angebot.gesamtCent)}</strong> inkl. Versand{angebot.versandCent === 0 ? " (kostenlos)" : ""}, ohne&nbsp;USt. (§&nbsp;19&nbsp;UStG)</dd>
            <dt>Lieferzeit</dt>
            <dd style={{ margin: 0 }}>{angebot.lieferzeit ? `${angebot.lieferzeit} nach Zahlung` : "nach Absprache"}</dd>
            <dt>Gültig bis</dt>
            <dd style={{ margin: 0 }}>{angebot.gueltigBis}</dd>
          </dl>
        </section>
        <button type="submit" className="shop-btn shop-btn--block" aria-disabled={laeuft || sperre} aria-busy={laeuft}>
          {sperre ? "Bestellannahme pausiert" : laeuft ? "Einen Moment, weiter zu PayPal…" : ANGEBOT_TEXTE.buttonLabel}
        </button>
        <p className="muted">{ANGEBOT_TEXTE.zahlungHinweis}</p>
        <p className="muted">{TEXTE.datenschutzHinweis} <a href="/datenschutz" target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>Datenschutzerklärung</a>.</p>
        <p className="muted">Fragen zum Angebot? Schreib an <a className="shop-link" style={{ minHeight: 0 }} href="mailto:as@sitekx.de">as@sitekx.de</a>.</p>
      </form>
    </div>
  );
}
