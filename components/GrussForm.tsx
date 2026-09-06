"use client";

import { useState, type FormEvent } from "react";
import { submitGrussLead } from "@/lib/gruss-supabase";

const OCCASIONS = ["Geburtstag", "Einladung"] as const;
const GEBURTSTAG_VARIANTEN = ["Gesprochen", "Gesungen"] as const;
const EINLADUNG_VARIANTE = "Gesprochen";

const MESSAGE_HINTS: Record<(typeof OCCASIONS)[number], string> = {
  Geburtstag: "z. B. Name der Person, worüber sie sich freut, Insider-Witz...",
  Einladung:
    "Bitte angeben: Was wird gefeiert, Datum & Uhrzeit, Ort, Kleidung, bis wann Rückmeldung...",
};

export default function GrussForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [occasion, setOccasion] = useState<(typeof OCCASIONS)[number]>(OCCASIONS[0]);
  const [variante, setVariante] = useState<string>(GEBURTSTAG_VARIANTEN[0]);
  const [textMode, setTextMode] = useState<"exact_text" | "stichpunkte">("stichpunkte");
  const [message, setMessage] = useState("");
  const [privateUseConsent, setPrivateUseConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  function handleOccasionChange(next: (typeof OCCASIONS)[number]) {
    setOccasion(next);
    setVariante(next === "Einladung" ? EINLADUNG_VARIANTE : GEBURTSTAG_VARIANTEN[0]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || !privateUseConsent) return;
    setStatus("sending");
    try {
      await submitGrussLead({
        name,
        contact,
        occasion,
        tone: variante,
        message,
        privateUseConsent,
        textMode,
      });
      // Benachrichtigung ist best-effort — schlägt sie fehl, ist die Anfrage
      // trotzdem sicher in der Datenbank, also den Erfolg davon nicht abhängig machen.
      fetch("/api/gruss-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, occasion, tone: variante, message, textMode }),
      }).catch(() => {});
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="gruss-form-done">
        <h3>Angekommen! 🎉</h3>
        <p>
          Wir melden uns bei dir mit einem Preisvorschlag — je nach Aufwand kann der variieren.
          Nach deiner Zusage produzieren wir das Video und schicken es dir per E-Mail zu.
        </p>
      </div>
    );
  }

  return (
    <form className="gruss-form" onSubmit={handleSubmit}>
      <label>
        Dein Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>

      <label>
        E-Mail oder Instagram/TikTok-Handle
        <input
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="damit wir dir dein Video schicken können"
          required
        />
      </label>

      <label>
        Anlass
        <select
          value={occasion}
          onChange={(e) => handleOccasionChange(e.target.value as (typeof OCCASIONS)[number])}
        >
          {OCCASIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>

      {occasion === "Geburtstag" ? (
        <label>
          Variante
          <select value={variante} onChange={(e) => setVariante(e.target.value)}>
            {GEBURTSTAG_VARIANTEN.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label>
          Variante
          <select value={EINLADUNG_VARIANTE} disabled>
            <option value={EINLADUNG_VARIANTE}>{EINLADUNG_VARIANTE}</option>
          </select>
        </label>
      )}

      <fieldset className="gruss-textmode-fieldset">
        <label className="gruss-radio-label">
          <input
            type="radio"
            name="textMode"
            checked={textMode === "stichpunkte"}
            onChange={() => setTextMode("stichpunkte")}
          />
          <span>Nur Stichpunkte — ihr schreibt den Text für mich</span>
        </label>
        <label className="gruss-radio-label">
          <input
            type="radio"
            name="textMode"
            checked={textMode === "exact_text"}
            onChange={() => setTextMode("exact_text")}
          />
          <span>Ich gebe dir den genauen Text vor, den Eddie sagen soll</span>
        </label>
      </fieldset>

      <label>
        {textMode === "exact_text" ? "Der genaue Text für Eddie" : "Was soll Eddie sagen?"}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
        />
      </label>
      <p className="gruss-field-note">{MESSAGE_HINTS[occasion]}</p>
      <p className="gruss-field-note">
        Kein eigenes Foto oder eine Sprachaufnahme nötig — Eddie bleibt immer Eddie, nur der
        Text ändert sich.
      </p>

      <label className="gruss-checkbox-label">
        <input
          type="checkbox"
          checked={privateUseConsent}
          onChange={(e) => setPrivateUseConsent(e.target.checked)}
          required
        />
        <span>
          Ich bestätige, dass ich das Video ausschließlich privat nutze (z.&nbsp;B. zum Teilen
          mit Familie/Freunden via WhatsApp oder Social Media). Eine gewerbliche
          Weiterverwendung oder ein Weiterverkauf ist nicht gestattet.
        </span>
      </label>

      <p className="gruss-field-note">
        Mit dem Absenden entstehen dir noch keine Kosten — du bekommst zuerst ein
        unverbindliches Preisangebot. Zu deinem <a href="/widerrufsrecht">Widerrufsrecht</a>{" "}
        informieren wir dich, bevor du das Angebot annimmst.
      </p>

      <button
        type="submit"
        className="pill-btn gruss-submit"
        disabled={status === "sending" || !privateUseConsent}
      >
        {status === "sending" ? "Wird gesendet…" : "Grußvideo anfragen"}
      </button>

      {status === "error" && (
        <p className="gruss-error">
          Hat leider nicht geklappt — versuch's gleich nochmal.
        </p>
      )}
    </form>
  );
}
