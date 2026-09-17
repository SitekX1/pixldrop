"use client";

import { useState, type FormEvent } from "react";

export default function KontaktForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/kontakt-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok !== true) throw new Error("send failed");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="gruss-form-done">
        <h3>Angekommen! 📬</h3>
        <p>Danke für deine Nachricht — wir melden uns per E-Mail bei dir.</p>
      </div>
    );
  }

  return (
    <form className="gruss-form kontakt-form" onSubmit={handleSubmit}>
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
        Deine E-Mail-Adresse
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="damit wir dir antworten können"
          required
        />
      </label>

      <label>
        Deine Nachricht
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          required
        />
      </label>

      <button
        type="submit"
        className="pill-btn gruss-submit"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Wird gesendet…" : "Nachricht senden"}
      </button>

      {status === "error" && (
        <p className="gruss-error">
          Hat leider nicht geklappt — schreib uns in der Zwischenzeit gern direkt an{" "}
          <a href="mailto:as@sitekx.de">as@sitekx.de</a>.
        </p>
      )}
    </form>
  );
}
