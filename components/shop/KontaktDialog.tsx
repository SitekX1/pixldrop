"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { holeKontaktToken, sendeKontakt, type KontaktEingabe } from "@/lib/shop/client";

type Feld = keyof KontaktEingabe;
const LEER: KontaktEingabe = { name: "", email: "", nachricht: "" };
const NAMEN: Record<Feld, string> = { name: "Name", email: "E-Mail", nachricht: "Nachricht" };

// Kontaktformular als modaler Dialog (natives <dialog>: Fokusfalle, Esc schließt, Fokus zurück auf den Button).
// Backend: GET /api/shop/formtoken?f=kontakt, POST /api/shop/kontakt.
export default function KontaktDialog({ label = "Schreib mir" }: { label?: string }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [daten, setDaten] = useState<KontaktEingabe>(LEER);
  const [fehler, setFehler] = useState<Partial<Record<Feld, string>>>({});
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fertig, setFertig] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const [offen, setOffen] = useState(false);

  useEffect(() => {
    if (!offen) return;
    let aktiv = true;
    holeKontaktToken().then((t) => { if (aktiv) setToken(t); });
    return () => { aktiv = false; };
  }, [offen]);

  function oeffnen() {
    setOffen(true);
    dlg.current?.showModal();
    requestAnimationFrame(() => nameRef.current?.focus());
  }
  function schliessen() { dlg.current?.close(); }

  const upd = (k: Feld) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDaten({ ...daten, [k]: e.target.value });
    if (fehler[k]) setFehler({ ...fehler, [k]: undefined });
  };
  const zeigeFehler = () => requestAnimationFrame(() => alertRef.current?.focus());

  async function senden() {
    if (laeuft) return;
    const f: Partial<Record<Feld, string>> = {};
    if (daten.name.trim().length < 2) f.name = "Bitte gib deinen Namen ein.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(daten.email.trim())) f.email = "Bitte eine gültige E-Mail-Adresse eingeben, z. B. name@mail.de";
    if (daten.nachricht.trim().length < 5) f.nachricht = "Bitte schreib mir kurz, worum es geht.";
    setFehler(f);
    setServerFehler(null);
    if (Object.keys(f).length) { zeigeFehler(); return; }
    setLaeuft(true);
    const t = token ?? (await holeKontaktToken());
    if (!t) {
      setLaeuft(false);
      setServerFehler("Das Kontaktformular ist gerade nicht erreichbar. Deine Eingaben sind noch da, bitte versuch es später noch einmal.");
      zeigeFehler();
      return;
    }
    setToken(t);
    const r = await sendeKontakt({ token: t, website, daten });
    setLaeuft(false);
    if (r.ok) { setFertig(true); setDaten(LEER); return; }
    const fe = r.fehler;
    if (fe.code === "token") holeKontaktToken().then(setToken);
    if (fe.felder && Object.keys(fe.felder).length) setFehler(fe.felder as Partial<Record<Feld, string>>);
    setServerFehler(fe.felder && Object.keys(fe.felder).length ? null : fe.meldung);
    zeigeFehler();
  }

  const liste = Object.entries(fehler).filter(([, v]) => v) as [Feld, string][];

  return (
    <>
      <button type="button" className="shop-btn" onClick={oeffnen} aria-haspopup="dialog">{label}</button>
      <dialog
        ref={dlg}
        className="shop-dialog"
        aria-labelledby="kd-titel"
        onClose={() => { setOffen(false); if (fertig) { setFertig(false); } }}
        onClick={(e) => { if (e.target === dlg.current) schliessen(); }}
      >
        <div className="shop-dialog-head">
          <h2 id="kd-titel" style={{ fontSize: "1.375rem" }}>{fertig ? "Nachricht angekommen." : "Schreib mir"}</h2>
          <button type="button" className="shop-dialog-close" onClick={schliessen} aria-label="Schließen">×</button>
        </div>
        {fertig ? (
          <div style={{ display: "grid", gap: 14, marginTop: 14 }} role="status">
            <p>Danke! Ich melde mich per E-Mail bei dir.</p>
            <button type="button" className="shop-btn" onClick={schliessen}>Schließen</button>
          </div>
        ) : (
          <form noValidate style={{ marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); senden(); }}>
            {(liste.length > 0 || serverFehler) && (
              <div className="shop-alert" role="alert" tabIndex={-1} ref={alertRef}>
                <strong>{serverFehler ? "Das hat nicht geklappt." : "Bitte prüfe diese Angaben:"}</strong>
                {serverFehler && <p>{serverFehler}</p>}
                {liste.length > 0 && <ul>{liste.map(([k, v]) => <li key={k}><a href={`#kd-${k}`}>{NAMEN[k]}</a>: {v}</li>)}</ul>}
              </div>
            )}
            <div className="shop-field">
              <label htmlFor="kd-name">Name <span className="opt">(Pflicht)</span></label>
              <input id="kd-name" ref={nameRef} name="name" className="shop-input" type="text" autoComplete="name" value={daten.name} onChange={upd("name")}
                aria-invalid={!!fehler.name} aria-describedby={fehler.name ? "kd-e-name" : undefined} />
              {fehler.name && <span id="kd-e-name" className="shop-err">{fehler.name}</span>}
            </div>
            <div className="shop-field">
              <label htmlFor="kd-email">E-Mail <span className="opt">(Pflicht)</span></label>
              <input id="kd-email" name="email" className="shop-input" type="email" autoComplete="email" spellCheck={false} value={daten.email} onChange={upd("email")}
                aria-invalid={!!fehler.email} aria-describedby={fehler.email ? "kd-e-email" : undefined} />
              {fehler.email && <span id="kd-e-email" className="shop-err">{fehler.email}</span>}
            </div>
            <div className="shop-field">
              <label htmlFor="kd-nachricht">Nachricht <span className="opt">(Pflicht)</span></label>
              <textarea id="kd-nachricht" name="nachricht" className="shop-input" value={daten.nachricht} onChange={upd("nachricht")} maxLength={2000}
                aria-invalid={!!fehler.nachricht} aria-describedby={fehler.nachricht ? "kd-e-nachricht" : undefined} />
              {fehler.nachricht && <span id="kd-e-nachricht" className="shop-err">{fehler.nachricht}</span>}
            </div>
            <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
              <label>Bitte leer lassen<input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
            </div>
            <p className="muted">
              Mit dem Absenden willigst du ein, dass ich deine Angaben nur zur Beantwortung deiner Nachricht verwende. Mehr dazu in der{" "}
              <Link className="shop-link" style={{ minHeight: 0 }} href="/datenschutz" target="_blank" rel="noopener">Datenschutzerklärung</Link>.
            </p>
            <div className="shop-actions" style={{ marginTop: 0 }}>
              <button type="submit" className="shop-btn" aria-disabled={laeuft} aria-busy={laeuft}>{laeuft ? "Wird gesendet…" : "Nachricht senden"}</button>
              <button type="button" className="shop-btn shop-btn--ghost" onClick={schliessen}>Abbrechen</button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
