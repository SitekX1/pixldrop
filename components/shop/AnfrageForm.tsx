"use client";
import { useEffect, useRef, useState } from "react";
import { SHOP_AKTIV, TEXTE } from "@/lib/shop/config";
import type { Farbe } from "@/lib/shop/farben";
import { bilderVerkleinern, holeFormToken, sendeAnfrage } from "@/lib/shop/client";

const MAX_DATEIEN = 3;
const MAX_MB = 8; // je Bild vor dem Verkleinern; gesendet werden zusammen höchstens ca. 4 MB
const TYPEN = ["image/jpeg", "image/png", "image/webp"];

interface Vorschau { file: File; url: string }
type Fehler = Partial<Record<"beschreibung" | "name" | "email" | "bilder" | "datenschutz" | "rechte", string>>;

// Sendet multipart an /api/shop/anfrage (nur bei SHOP_AKTIV). Bilder werden vorher auf zusammen <= ca. 4 MB verkleinert.
function hellFarbe(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
}

export default function AnfrageForm({ farben }: { farben: Farbe[] }) {
  const [v, setV] = useState({ beschreibung: "", breite: "", tiefe: "", hoehe: "", farbe: "egal", name: "", email: "" });
  const [dateien, setDateien] = useState<Vorschau[]>([]);
  const [datenschutz, setDatenschutz] = useState(false);
  const [rechte, setRechte] = useState(false);
  const [fehler, setFehler] = useState<Fehler>({});
  const [status, setStatus] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [fertig, setFertig] = useState<{ nr?: string; bilder: boolean } | null>(null);
  const [website, setWebsite] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const urls = useRef<string[]>([]);

  useEffect(() => {
    if (!SHOP_AKTIV) return;
    let aktiv = true;
    holeFormToken().then((t) => { if (aktiv) setToken(t); });
    return () => { aktiv = false; };
  }, []);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  function neueDateien(e: React.ChangeEvent<HTMLInputElement>) {
    // WICHTIG (Android/Samsung): input.value NICHT synchron zurücksetzen, sonst geht die Auswahl verloren.
    const gewaehlt = Array.from(e.target.files ?? []);
    const ok: Vorschau[] = [];
    let meldung: string | undefined;
    for (const f of gewaehlt) {
      if (!TYPEN.includes(f.type)) { meldung = `„${f.name}“ ist kein JPG, PNG oder WebP.`; continue; }
      if (f.size > MAX_MB * 1024 * 1024) { meldung = `„${f.name}“ ist größer als ${MAX_MB} MB.`; continue; }
      const url = URL.createObjectURL(f);
      urls.current.push(url);
      ok.push({ file: f, url });
    }
    let neu = [...dateien, ...ok];
    if (neu.length > MAX_DATEIEN) { meldung = `Es sind höchstens ${MAX_DATEIEN} Bilder möglich.`; neu = neu.slice(0, MAX_DATEIEN); }
    setDateien(neu);
    setFehler((f) => ({ ...f, bilder: meldung }));
  }

  async function senden(e: React.FormEvent) {
    e.preventDefault();
    const f: Fehler = {};
    if (v.beschreibung.trim().length < 20) f.beschreibung = "Bitte beschreibe deine Idee in mindestens 20 Zeichen, damit ich ein Angebot machen kann.";
    if (v.name.trim().length < 2) f.name = "Bitte gib deinen Namen ein.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) f.email = "Bitte eine gültige E-Mail eingeben, z. B. name@mail.de";
    if (!datenschutz) f.datenschutz = "Bitte bestätige den Datenschutzhinweis.";
    if (dateien.length > 0 && !rechte) f.rechte = "Bitte bestätige, dass du die Rechte an den Bildern hast.";
    setFehler((old) => ({ ...f, bilder: old.bilder }));
    if (Object.keys(f).length) { requestAnimationFrame(() => alertRef.current?.focus()); setStatus(null); return; }
    if (!SHOP_AKTIV) { setStatus("Anfrage noch nicht aktiv. Es wurde nichts gesendet oder gespeichert."); return; }
    if (laeuft) return;
    setLaeuft(true);
    setServerFehler(null);
    setStatus(null);
    try {
      const t = token ?? (await holeFormToken());
      if (!t) throw new Error("token");
      setToken(t);
      const bilder = await bilderVerkleinern(dateien.map((d) => d.file));
      const fd = new FormData();
      fd.set("token", t);
      fd.set("website", website);
      for (const k of ["beschreibung", "breite", "tiefe", "hoehe", "farbe", "name", "email"] as const) fd.set(k, v[k].trim());
      fd.set("datenschutz", String(datenschutz));
      fd.set("rechte", String(rechte));
      for (const b of bilder) fd.append("bilder", b, b.name);
      const r = await sendeAnfrage(fd);
      if (r.ok) { setFertig({ nr: r.anfragenummer, bilder: r.bilderFehlgeschlagen === true }); return; }
      if (r.fehler.code === "token") holeFormToken().then(setToken);
      const fe = r.fehler.felder ?? {};
      if (Object.keys(fe).length) setFehler((old) => ({ ...old, ...fe }));
      setServerFehler(r.fehler.meldung);
    } catch {
      setServerFehler("Das Senden hat nicht geklappt (Bilder oder Verbindung). Deine Eingaben sind noch da. Bitte versuch es noch einmal oder schreib an as@sitekx.de.");
    } finally {
      setLaeuft(false);
    }
    requestAnimationFrame(() => alertRef.current?.focus());
  }

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setV({ ...v, [k]: e.target.value });
    if (k in fehler) setFehler({ ...fehler, [k]: undefined });
  };
  const liste = Object.entries(fehler).filter(([, m]) => m) as [string, string][];
  const ids: Record<string, string> = { beschreibung: "a-beschreibung", name: "a-name", email: "a-email", bilder: "a-bilder", datenschutz: "a-ds", rechte: "a-rechte" };
  const err = (k: keyof Fehler) => fehler[k] && <span id={`${ids[k]}-e`} className="shop-err">{fehler[k]}</span>;

  if (fertig) {
    return (
      <div className="shop-form" role="status">
        <h2>Anfrage angekommen.</h2>
        {fertig.nr && <p>Deine Anfragenummer: <strong>{fertig.nr}</strong></p>}
        <p>Du bekommst ein Angebot per E-Mail. Unverbindlich, kein Vertrag.</p>
        {fertig.bilder && <p className="shop-alert">Mindestens ein Bild konnte nicht gespeichert werden. Bitte schick es mir kurz per Mail an as@sitekx.de{fertig.nr ? ` (${fertig.nr})` : ""}.</p>}
      </div>
    );
  }

  return (
    <form className="shop-form" noValidate onSubmit={senden}>
      {!SHOP_AKTIV && (
        <p className="shop-demo" role="note"><strong>Vorschau-Modus:</strong> Die Anfrage ist noch nicht aktiv. Es wird nichts gesendet oder gespeichert, auch deine Bilder bleiben auf deinem Gerät.</p>
      )}
      {(liste.length > 0 || serverFehler) && (
        <div className="shop-alert" role="alert" tabIndex={-1} ref={alertRef}>
          <strong>{serverFehler ? "Das hat nicht geklappt." : "Bitte prüfe diese Angaben:"}</strong>
          {serverFehler && <p>{serverFehler}</p>}
          <ul>{liste.map(([k, m]) => <li key={k}><a href={`#${ids[k]}`}>{m}</a></li>)}</ul>
        </div>
      )}
      <div className="shop-field">
        <label htmlFor="a-beschreibung">Beschreibung <span className="opt">(Pflicht, mindestens 20 Zeichen)</span></label>
        <textarea id="a-beschreibung" className="shop-input" value={v.beschreibung} onChange={set("beschreibung")} rows={6}
          placeholder="z. B. ein Halter für meine Kaffeekapseln, passend zur Schublade…" aria-invalid={!!fehler.beschreibung} aria-describedby={fehler.beschreibung ? "a-beschreibung-e" : undefined} />
        {err("beschreibung")}
      </div>
      <fieldset>
        <legend>Maße in mm <span className="opt" style={{ fontWeight: 400 }}>(optional)</span></legend>
        <div className="shop-row">
          {([["breite", "Breite"], ["tiefe", "Tiefe"], ["hoehe", "Höhe"]] as const).map(([k, l]) => (
            <div className="shop-field" key={k}>
              <label htmlFor={`a-${k}`}>{l}</label>
              <input id={`a-${k}`} className="shop-input" type="text" inputMode="decimal" autoComplete="off" value={v[k]} onChange={set(k)} />
            </div>
          ))}
        </div>
      </fieldset>
      <fieldset className="shop-field" style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <legend className="shop-label" style={{ padding: 0 }}>Wunschfarbe <span className="opt">(optional)</span></legend>
        <div className="shop-farbwahl" role="radiogroup" aria-label="Wunschfarbe">
          <label className="shop-farbopt">
            <input type="radio" name="a-farbe" value="egal" checked={v.farbe === "egal"} onChange={set("farbe")} />
            <span className="dot dot--egal" aria-hidden="true" />
            <span className="name">Keine Präferenz</span>
          </label>
          {farben.map((f) => (
            <label key={f.id} className="shop-farbopt">
              <input type="radio" name="a-farbe" value={f.id} checked={v.farbe === f.id} onChange={set("farbe")} />
              <span className="dot" style={{ background: f.hex }} aria-hidden="true">
                <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 9.5l3.5 3.5 7.5-8" fill="none" stroke={hellFarbe(f.hex) ? "#2e1c0f" : "#fff"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span className="name">{f.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="shop-field">
        <span className="shop-label" id="a-bilder-l">Bilder <span className="opt">(optional, bis {MAX_DATEIEN} Dateien, JPG/PNG/WebP, je max. {MAX_MB} MB)</span></span>
        <label className="shop-drop" htmlFor="a-bilder">
          <strong>Bild auswählen oder Foto aufnehmen</strong>
          <span className="muted">Tippen zum Auswählen</span>
          <input id="a-bilder" type="file" multiple accept="image/*" onChange={neueDateien} aria-describedby={fehler.bilder ? "a-bilder-e" : "a-bilder-h"} />
        </label>
        <span id="a-bilder-h" className="muted">Bilder mit Personen nur, wenn du das Recht dazu hast. Bilder werden 30 Tage nach Ende der Anfrage gelöscht.</span>
        {err("bilder")}
        {dateien.length > 0 && (
          <ul className="shop-thumbs" aria-label="Ausgewählte Bilder">
            {dateien.map((d, i) => (
              <li key={d.url} className="shop-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.url} alt={`Vorschau: ${d.file.name}`} width={96} height={96} />
                <button type="button" onClick={() => setDateien(dateien.filter((_, j) => j !== i))} aria-label={`${d.file.name} entfernen`}>Entfernen</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="shop-field">
        <label htmlFor="a-name">Name <span className="opt">(Pflicht)</span></label>
        <input id="a-name" className="shop-input" type="text" autoComplete="name" value={v.name} onChange={set("name")} aria-invalid={!!fehler.name} aria-describedby={fehler.name ? "a-name-e" : undefined} />
        {err("name")}
      </div>
      <div className="shop-field">
        <label htmlFor="a-email">E-Mail <span className="opt">(Pflicht)</span></label>
        <input id="a-email" className="shop-input" type="email" autoComplete="email" spellCheck={false} value={v.email} onChange={set("email")} aria-invalid={!!fehler.email} aria-describedby={fehler.email ? "a-email-e" : undefined} />
        {err("email")}
      </div>
      <div>
        <label className="shop-check" htmlFor="a-ds">
          <input id="a-ds" type="checkbox" checked={datenschutz} onChange={(e) => { setDatenschutz(e.target.checked); setFehler({ ...fehler, datenschutz: undefined }); }} aria-invalid={!!fehler.datenschutz} />
          <span>Ich habe die <a href="/datenschutz" target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>Datenschutzerklärung</a> gelesen. <span className="opt">(Pflicht)</span></span>
        </label>
        {err("datenschutz")}
        <label className="shop-check" htmlFor="a-rechte">
          <input id="a-rechte" type="checkbox" checked={rechte} onChange={(e) => { setRechte(e.target.checked); setFehler({ ...fehler, rechte: undefined }); }} aria-invalid={!!fehler.rechte} />
          <span>Ich habe die Rechte an allen Bildern und Texten, die ich hochlade. <span className="opt">(Pflicht, wenn Bilder dabei sind)</span></span>
        </label>
        {err("rechte")}
      </div>
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>Bitte leer lassen<input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
      </div>
      <button type="submit" className="shop-btn shop-btn--block" aria-disabled={!SHOP_AKTIV || laeuft} aria-busy={laeuft}>
        {laeuft ? "Wird gesendet…" : SHOP_AKTIV ? TEXTE.anfrageButton : TEXTE.anfrageInaktiv}
        {!SHOP_AKTIV && !laeuft && <small>Später: „{TEXTE.anfrageButton}“</small>}
      </button>
      {status && <p className="shop-demo" role="status">{status}</p>}
    </form>
  );
}
