"use client";
import { useEffect, useRef, useState } from "react";
import {
  holeFreigabeDaten, sendeFreigabe,
  type FreigabeDaten, type FreigabeErgebnisDaten, type FreigabeFehler, type FreigabePosition,
} from "@/lib/shop/client";
import { SCHRIFTEN } from "@/lib/shop/schriften";

type Phase =
  | { t: "laden" }
  | { t: "fehler"; fehler: FreigabeFehler }
  | { t: "daten"; daten: FreigabeDaten }
  | { t: "fertig"; daten: FreigabeDaten; ergebnis: FreigabeErgebnisDaten };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const schriftVon = (s: string | null) => {
  if (!s) return undefined;
  const k = s.toLowerCase();
  return SCHRIFTEN.find((x) => x.id === k || x.name.toLowerCase() === k);
};

function Schild({ p }: { p: FreigabePosition }) {
  const zeilen = (p.text ?? "").split(/\r?\n/).map((z) => z.trimEnd());
  const klein = zeilen.length > 1 ? zeilen[0] : "Wunschtext";
  const gross = zeilen.length > 1 ? zeilen.slice(1).join("\n") : zeilen[0];
  return (
    <div className="fg-schild" style={{ fontFamily: schriftVon(p.schrift)?.family }} role="group" aria-label={`Wunschtext: ${(p.text ?? "").replace(/\n/g, ", ")}`}>
      {klein && <span className="fg-klein" aria-hidden="true">{klein}</span>}
      <span className="fg-gross" aria-hidden="true">{gross}</span>
    </div>
  );
}

function Positionen({ liste }: { liste: FreigabePosition[] }) {
  return (
    <ul className="fg-liste">
      {liste.map((p, i) => (
        <li key={i} className="fg-pos">
          <div className="fg-kopf">
            <strong>{p.name}</strong>
            <span>{p.menge}×</span>
          </div>
          {p.farbe && (
            <p className="fg-farbe"><span className="fg-dot" style={{ background: p.farbeHex ?? "transparent" }} aria-hidden="true" />{p.farbe}</p>
          )}
          {p.text ? (
            <>
              <Schild p={p} />
              <p className="fg-schrift">Schrift: {schriftVon(p.schrift)?.name ?? p.schrift ?? "–"}</p>
            </>
          ) : p.individuell ? <p className="fg-schrift">Individuell, ohne Wunschtext.</p> : null}
        </li>
      ))}
    </ul>
  );
}

const datum = (iso: string | null) => (iso ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : null);

export default function FreigabeSeite({ b, t, vorauswahl }: { b: string; t: string; vorauswahl: "ok" | "nein" }) {
  const [phase, setPhase] = useState<Phase>({ t: "laden" });
  const [dialog, setDialog] = useState<"ok" | "nein" | null>(null);
  const [grund, setGrund] = useState("");
  const [sendet, setSendet] = useState(false);
  const [sendFehler, setSendFehler] = useState<FreigabeFehler | null>(null);
  const sperre = useRef(false);
  const dlg = useRef<HTMLDialogElement>(null);
  const ausloeser = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let weg = false;
    if (!UUID.test(b) || !t) { setPhase({ t: "fehler", fehler: { code: "ungueltig", meldung: "Link ungültig oder abgelaufen." } }); return; }
    holeFreigabeDaten({ b, t }).then((r) => { if (!weg) setPhase(r.ok ? { t: "daten", daten: r.daten } : { t: "fehler", fehler: r.fehler }); });
    return () => { weg = true; };
  }, [b, t]);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (dialog && !d.open) d.showModal();
    if (!dialog && d.open) d.close();
  }, [dialog]);

  function oeffne(a: "ok" | "nein", el: HTMLElement) {
    ausloeser.current = el; setSendFehler(null); setGrund(""); setDialog(a);
  }
  function schliesse() {
    if (sperre.current) return;
    setDialog(null);
    ausloeser.current?.focus();
  }

  async function los() {
    if (sperre.current || phase.t !== "daten" || !dialog) return;
    if (dialog === "nein" && !grund) return;
    sperre.current = true; setSendet(true); setSendFehler(null);
    const r = await sendeFreigabe({ b, t, aktion: dialog, grund: dialog === "nein" ? grund : undefined });
    sperre.current = false; setSendet(false);
    if (r.ok) { setDialog(null); setPhase({ t: "fertig", daten: phase.daten, ergebnis: r.daten }); return; }
    if (r.fehler.code === "bereits_entschieden" && r.fehler.status) {
      setDialog(null);
      setPhase({ t: "daten", daten: { ...phase.daten, status: r.fehler.status } });
      return;
    }
    if (r.fehler.code === "ungueltig") { setDialog(null); setPhase({ t: "fehler", fehler: r.fehler }); return; }
    setSendFehler(r.fehler);
  }

  if (phase.t === "laden") {
    return <section className="fg" aria-busy="true"><p className="shop-overline">Textfreigabe</p><p role="status" className="fg-laden">Lade Bestellung …</p></section>;
  }
  if (phase.t === "fehler") {
    return (
      <section className="fg" aria-labelledby="fg-t">
        <p className="shop-overline">Textfreigabe</p>
        <h1 id="fg-t">{phase.fehler.code === "ungueltig" ? "Link ungültig oder abgelaufen" : "Das hat nicht geklappt"}</h1>
        <p className="shop-alert" role="alert">{phase.fehler.meldung}</p>
        {phase.fehler.code !== "ungueltig" && <button type="button" className="shop-btn fg-btn" onClick={() => location.reload()}>Neu laden</button>}
        {phase.fehler.code === "ungueltig" && <p className="fg-hint">Einen neuen Link gibt es mit der nächsten Telegram-Erinnerung.</p>}
      </section>
    );
  }

  if (phase.t === "fertig") {
    const { ergebnis: e, daten: d } = phase;
    return (
      <section className="fg" aria-labelledby="fg-t">
        <p className="shop-overline">Bestellung {d.bestellnummer}</p>
        <h1 id="fg-t">{e.status === "freigegeben" ? "Freigegeben" : "Abgelehnt"}</h1>
        <div className={e.status === "freigegeben" ? "fg-ok" : "fg-nok"} role="status">
          {e.status === "freigegeben" ? (
            <p>{e.neu ? "Text freigegeben." : "Das war schon freigegeben."} {e.mail ? "Die Bestellbestätigung ging an den Kunden." : "Die Mail an den Kunden ist NICHT rausgegangen. Bitte selbst nachsehen."}</p>
          ) : (
            <>
              <p>{e.neu ? "Text abgelehnt." : "Das war schon abgelehnt."}</p>
              <p>{e.erstattung === "erstattet" ? "Der Betrag ist erstattet." : <strong>Erstattung offen. Bitte in PayPal erstatten.</strong>}</p>
              <p>{e.mail ? "Der Kunde wurde per Mail informiert." : "Die Mail an den Kunden ist NICHT rausgegangen. Bitte selbst nachsehen."}</p>
            </>
          )}
        </div>
      </section>
    );
  }

  const d = phase.daten;
  const offen = d.status === "offen";
  const reihe: ("ok" | "nein")[] = vorauswahl === "nein" ? ["nein", "ok"] : ["ok", "nein"];
  return (
    <section className="fg" aria-labelledby="fg-t">
      <p className="shop-overline">Textfreigabe</p>
      <h1 id="fg-t">Bestellung {d.bestellnummer}</h1>
      {d.angefordertAm && <p className="fg-hint">Angefordert {datum(d.angefordertAm)}</p>}
      {!offen && (
        <p className={d.status === "freigegeben" ? "fg-ok" : "fg-nok"} role="status">
          <strong>Bereits {d.status === "freigegeben" ? "freigegeben" : "abgelehnt"}</strong>
          {d.entschiedenAm ? ` am ${datum(d.entschiedenAm)}` : ""}.
          {d.grund ? ` Grund: ${d.gruende.find((g) => g.id === d.grund)?.label ?? d.grund}.` : ""} Keine weitere Aktion nötig.
        </p>
      )}
      <Positionen liste={d.positionen} />
      {offen && (
        <div className="fg-aktionen">
          {reihe.map((a) => (
            <button key={a} type="button" className={`shop-btn shop-btn--block fg-btn ${a === "nein" ? "fg-btn--nein" : ""}`} onClick={(e) => oeffne(a, e.currentTarget)}>
              {a === "ok" ? "Freigeben" : "Ablehnen"}
            </button>
          ))}
        </div>
      )}

      <dialog ref={dlg} className="fg-dialog" aria-labelledby="fg-dt" onCancel={(e) => { e.preventDefault(); schliesse(); }} onClose={() => { if (!sperre.current) setDialog(null); }}>
        {dialog && (
          <form onSubmit={(e) => { e.preventDefault(); void los(); }}>
            <h2 id="fg-dt">{dialog === "ok" ? "Wirklich freigeben?" : "Wirklich ablehnen?"}</h2>
            <p>{dialog === "ok" ? "Der Kunde bekommt jetzt die Bestellbestätigung (Vertrag)." : "Der Betrag wird erstattet und der Kunde per Mail informiert."}</p>
            {dialog === "nein" && (
              <fieldset className="fg-gruende">
                <legend>Grund</legend>
                {d.gruende.map((g) => (
                  <label key={g.id} className="fg-radio">
                    <input type="radio" name="grund" value={g.id} checked={grund === g.id} onChange={() => setGrund(g.id)} disabled={sendet} />
                    <span>{g.label}</span>
                  </label>
                ))}
              </fieldset>
            )}
            {sendFehler && <p className="shop-alert" role="alert">{sendFehler.meldung}</p>}
            <div className="fg-aktionen">
              <button type="submit" className={`shop-btn shop-btn--block fg-btn ${dialog === "nein" ? "fg-btn--nein" : ""}`} disabled={sendet || (dialog === "nein" && !grund)}>
                {sendet ? "Sende …" : dialog === "ok" ? "Ja, freigeben" : "Ja, ablehnen"}
              </button>
              <button type="button" className="shop-btn shop-btn--ghost shop-btn--block" onClick={schliesse} disabled={sendet}>Zurück</button>
            </div>
          </form>
        )}
      </dialog>
    </section>
  );
}
