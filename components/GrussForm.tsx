"use client";

import { useState, type FormEvent } from "react";
import { submitGrussLead } from "@/lib/gruss-supabase";

const OCCASIONS = ["Geburtstag", "Jubiläum", "Aufmunterung", "Einfach so"];
const TONES = ["Süß", "Süß mit Seitenhieb (schwarzer Humor)"];

export default function GrussForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [tone, setTone] = useState(TONES[0]);
  const [message, setMessage] = useState("");
  const [privateUseConsent, setPrivateUseConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || !privateUseConsent) return;
    setStatus("sending");
    try {
      await submitGrussLead({ name, contact, occasion, tone, message, privateUseConsent });
      // Benachrichtigung ist best-effort — schlägt sie fehl, ist die Anfrage
      // trotzdem sicher in der Datenbank, also den Erfolg davon nicht abhängig machen.
      fetch("/api/gruss-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, occasion, tone, message }),
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
        <select value={occasion} onChange={(e) => setOccasion(e.target.value)}>
          {OCCASIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>

      <label>
        Ton
        <select value={tone} onChange={(e) => setTone(e.target.value)}>
          {TONES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label>
        Was soll Eddie sagen? (Stichpunkte reichen)
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="z.B. Name der Person, worüber sich die Person freut, Insider-Witz..."
        />
      </label>

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
