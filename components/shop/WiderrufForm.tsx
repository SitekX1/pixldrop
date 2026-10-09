"use client";
import { useEffect, useRef, useState } from "react";
import { holeWiderrufToken, sendeWiderruf, type WiderrufEingabe, type WiderrufErfolg, type WiderrufZusammenfassung } from "@/lib/shop/client";

type Feld = keyof WiderrufEingabe;
type Schritt = "eingabe" | "pruefen" | "fertig";
const LEER: WiderrufEingabe = { name: "", vertrag: "", positionen: "", email: "" };
const NAMEN: Record<Feld, string> = { name: "Name", vertrag: "Bestellnummer oder Vertragsangabe", positionen: "Betroffene Positionen", email: "E-Mail" };
const AUSWEG = "Falls es nicht klappt: Schreibe deinen Widerruf per E-Mail an as@sitekx.de.";

// Elektronische Widerrufsfunktion (§ 356a BGB). Backend: /api/shop/widerruf (zweistufig: Pruefen, dann bestaetigen).
export default function WiderrufForm() {
  const [daten, setDaten] = useState<WiderrufEingabe>(LEER);
  const [schritt, setSchritt] = useState<Schritt>("eingabe");
  const [fehler, setFehler] = useState<Partial<Record<Feld, string>>>({});
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [zus, setZus] = useState<WiderrufZusammenfassung | null>(null);
  const [erfolg, setErfolg] = useState<WiderrufErfolg | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const alertRef = useRef<HTMLDivElement>(null);
  const kopf = useRef<HTMLHeadingElement>(null);
  const erster = useRef(true);

  useEffect(() => {
    let aktiv = true;
    holeWiderrufToken().then((t) => { if (aktiv) setToken(t); });
    return () => { aktiv = false; };
  }, []);
  useEffect(() => {
    if (erster.current) { erster.current = false; return; }
    kopf.current?.focus();
  }, [schritt]);

  const upd = (k: Feld) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDaten({ ...daten, [k]: e.target.value });
    if (fehler[k]) setFehler({ ...fehler, [k]: undefined });
  };
  const zeigeFehler = () => requestAnimationFrame(() => alertRef.current?.focus());

  async function senden(confirm: boolean) {
    if (laeuft) return;
    if (!confirm) {
      const f: Partial<Record<Feld, string>> = {};
      if (daten.name.trim().length < 2) f.name = "Bitte gib deinen Namen ein.";
      if (daten.vertrag.trim().length < 3) f.vertrag = "Bitte gib die Bestellnummer (z. B. PD-2026-0001) oder eine Angabe zum Vertrag ein.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(daten.email.trim())) f.email = "Bitte eine gültige E-Mail-Adresse eingeben, z. B. name@mail.de";
      setFehler(f);
      setServerFehler(null);
      if (Object.keys(f).length) { zeigeFehler(); return; }
    }
    setLaeuft(true);
    setServerFehler(null);
    const t = token ?? (await holeWiderrufToken());
    if (!t) {
      setLaeuft(false);
      setServerFehler(`Die Widerrufsfunktion ist gerade nicht erreichbar. Deine Eingaben sind noch da. ${AUSWEG}`);
      zeigeFehler();
      return;
    }
    setToken(t);
    const r = await sendeWiderruf({ token: t, website, daten, confirm });
    setLaeuft(false);
    if (r.ok) {
      if (confirm && r.widerrufsnummer) {
        setErfolg({ widerrufsnummer: r.widerrufsnummer, eingegangenAmText: r.eingegangenAmText ?? "", eingangsbestaetigung: r.eingangsbestaetigung !== false });
        setSchritt("fertig");
      } else if (!confirm && r.zusammenfassung) {
        setZus(r.zusammenfassung);
        setSchritt("pruefen");
      } else {
        setServerFehler(`Die Antwort war unvollständig. ${AUSWEG}`);
        zeigeFehler();
      }
      return;
    }
    const fe = r.fehler;
    if (fe.code === "token") holeWiderrufToken().then(setToken);
    const hatFelder = !!fe.felder && Object.keys(fe.felder).length > 0;
    if (hatFelder) {
      setFehler(fe.felder as Partial<Record<Feld, string>>);
      setSchritt("eingabe");
    }
    setServerFehler(hatFelder ? null : /as@sitekx\.de/.test(fe.meldung) ? fe.meldung : `${fe.meldung} ${AUSWEG}`);
    zeigeFehler();
  }

  const liste = Object.entries(fehler).filter(([, v]) => v) as [Feld, string][];
  const FehlerBlock = (liste.length > 0 || serverFehler) && (
    <div className="shop-alert" role="alert" tabIndex={-1} ref={alertRef}>
      <strong>{serverFehler ? "Das hat nicht geklappt." : "Bitte prüfe diese Angaben:"}</strong>
      {serverFehler && <p>{serverFehler}</p>}
      {liste.length > 0 && (
        <ul>{liste.map(([k, v]) => <li key={k}><a href={`#w-${k}`}>{NAMEN[k]}</a>: {v}</li>)}</ul>
      )}
    </div>
  );

  const feld = (k: Feld, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div className="shop-field">
      <label htmlFor={`w-${k}`}>{label} <span className="opt">(Pflicht)</span></label>
      <input id={`w-${k}`} name={k} className="shop-input" value={daten[k]} onChange={upd(k)} aria-invalid={!!fehler[k]}
        aria-describedby={fehler[k] ? `we-${k}` : undefined} {...props} />
      {fehler[k] && <span id={`we-${k}`} className="shop-err">{fehler[k]}</span>}
    </div>
  );

  if (schritt === "fertig" && erfolg) {
    return (
      <div className="shop-form" role="status">
        <h3 ref={kopf} tabIndex={-1} style={{ outline: "none" }}>Dein Widerruf ist eingegangen.</h3>
        <dl className="shop-details">
          <div><dt>Widerrufsnummer</dt><dd><strong>{erfolg.widerrufsnummer}</strong></dd></div>
          <div><dt>Eingegangen am</dt><dd>{erfolg.eingegangenAmText}</dd></div>
        </dl>
        {erfolg.eingangsbestaetigung ? (
          <p>Die Eingangsbestätigung mit dem Inhalt deines Widerrufs sowie Datum und Uhrzeit des Eingangs habe ich dir per E-Mail geschickt. Bitte bewahre sie auf.</p>
        ) : (
          <p className="shop-alert"><strong>Die Bestätigungs-E-Mail konnte nicht gesendet werden</strong> (oder wurde für diese Adresse heute schon verschickt). Dein Widerruf ist trotzdem eingegangen. Bitte notiere dir Widerrufsnummer und Datum oben, am besten als Screenshot. Bei Fragen: as@sitekx.de.</p>
        )}
      </div>
    );
  }

  if (schritt === "pruefen" && zus) {
    return (
      <div className="shop-form">
        <h3 ref={kopf} tabIndex={-1} style={{ outline: "none" }}>Bitte prüfe deine Angaben</h3>
        {FehlerBlock}
        <dl className="shop-details">
          <div><dt>Name</dt><dd>{zus.name}</dd></div>
          <div><dt>Vertrag</dt><dd>{zus.vertrag}</dd></div>
          <div><dt>Widerruf gilt für</dt><dd>{zus.ganzerVertrag ? "den ganzen Vertrag" : zus.positionen}</dd></div>
          <div><dt>E-Mail</dt><dd>{zus.email}</dd></div>
        </dl>
        <p>Mit dem Klick auf „Widerruf bestätigen“ erklärst du den Widerruf. Er ist dann bei mir eingegangen.</p>
        <div className="shop-actions" style={{ marginTop: 0 }}>
          <button type="button" className="shop-btn" aria-disabled={laeuft} aria-busy={laeuft} onClick={() => senden(true)}>
            {laeuft ? "Wird gesendet…" : "Widerruf bestätigen"}
          </button>
          <button type="button" className="shop-btn shop-btn--ghost" onClick={() => { setSchritt("eingabe"); setServerFehler(null); }}>Angaben ändern</button>
        </div>
      </div>
    );
  }

  return (
    <form className="shop-form" noValidate onSubmit={(e) => { e.preventDefault(); senden(false); }}>
      <h3 ref={kopf} tabIndex={-1} style={{ outline: "none" }}>Vertrag online widerrufen</h3>
      {FehlerBlock}
      {feld("name", "Dein Name", { type: "text", autoComplete: "name" })}
      {feld("vertrag", "Bestellnummer oder Angabe zum Vertrag", { type: "text", autoComplete: "off", placeholder: "z. B. PD-2026-0001…", spellCheck: false })}
      <div className="shop-field">
        <label htmlFor="w-positionen">Betroffene Positionen <span className="opt">(optional)</span></label>
        <textarea id="w-positionen" name="positionen" className="shop-input" style={{ minHeight: 96 }} value={daten.positionen} onChange={upd("positionen")}
          aria-describedby="w-positionen-h" placeholder="Leer lassen, wenn du den ganzen Vertrag widerrufst…" />
        <span id="w-positionen-h" className="muted">Nur ausfüllen, wenn du einzelne Artikel widerrufst.</span>
        {fehler.positionen && <span className="shop-err">{fehler.positionen}</span>}
      </div>
      {feld("email", "E-Mail für die Eingangsbestätigung", { type: "email", autoComplete: "email", spellCheck: false })}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>Bitte leer lassen<input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
      </div>
      <p className="muted">Im nächsten Schritt siehst du eine Zusammenfassung und bestätigst den Widerruf. {AUSWEG}</p>
      <div className="shop-actions" style={{ marginTop: 0 }}>
        <button type="submit" className="shop-btn" aria-disabled={laeuft} aria-busy={laeuft}>{laeuft ? "Einen Moment…" : "Weiter zur Zusammenfassung"}</button>
      </div>
    </form>
  );
}
