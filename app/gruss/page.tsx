import type { Metadata, Viewport } from "next";
import Image from "next/image";
import GrussForm from "@/components/GrussForm";
import LegalFooter from "@/components/LegalFooter";

export const metadata: Metadata = {
  title: "Grußvideo von Eddie — PixlDrop",
  description:
    "Ein persönliches Geburtstags- oder Grußvideo, gesprochen von Eddie. Süß, mit Seitenhieb, in wenigen Tagen fertig.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const HOW_STEPS = [
  {
    title: "Anfrage abschicken",
    text: "Formular unten ausfüllen, dauert eine Minute.",
  },
  {
    title: "Preisangebot",
    text: "Wir melden uns per E-Mail mit einem Preis, passend zum Aufwand deiner Wünsche.",
  },
  {
    title: "Zusage & Zahlung",
    text: "Du bestätigst, wir schicken dir einen Zahlungslink.",
  },
  {
    title: "Lieferung",
    text: "Dein fertiges Video kommt als Datei per E-Mail, fertig zum Weiterschicken.",
  },
];

// TODO: Platzhalter-Videos, sobald die drei echten Beispiele (Geburtstag gesprochen/gesungen,
// Einladung gesprochen) produziert sind hier gegen die richtigen Dateien tauschen.
const EXAMPLES = [
  {
    file: "beispiel-geburtstag.mp4",
    label: "Geburtstag · Gesprochen",
    title: "Alles Gute!",
    text: "Eddie gratuliert persönlich mit ein paar netten (oder frechen) Worten.",
  },
  {
    file: "beispiel-gutenacht.mp4",
    label: "Geburtstag · Gesungen",
    title: "Eddies Geburtstagslied",
    text: "Der volle Songausschnitt, mit deinem Namen statt der Platzhalterzeile.",
  },
  {
    file: "beispiel-schwarzer-humor.mp4",
    label: "Einladung · Gesprochen",
    title: "Du bist eingeladen!",
    text: "Datum, Ort und alles Wichtige — persönlich von Eddie überbracht.",
  },
];

const PRICES = [
  { label: "Geburtstag — Gesprochen", price: "3–6€" },
  { label: "Geburtstag — Gesungen", price: "8–12€" },
  { label: "Einladung — Gesprochen", price: "8–14€" },
];

export default function GrussPage() {
  return (
    <main className="page gruss-page">
      <header className="gruss-hero">
        <Image
          src="/pixldrop-header-logo.png"
          alt="PixlDrop"
          width={728}
          height={536}
          className="gruss-logo"
          priority
        />
        <div className="eyebrow-small">Neu bei PixlDrop</div>
        <h1>Ein Grußvideo von Eddie</h1>
        <p className="gruss-sub">
          Ein Geburtstagsgruß — gesprochen oder als eigener Song — oder eine persönlich
          überbrachte Einladung: Eddie nimmt ein kurzes, individuelles Video für diese Person
          auf. Süß, manchmal mit Seitenhieb, immer eindeutig PixlDrop.
        </p>
        <div className="gruss-price">
          <ul className="gruss-price-list">
            {PRICES.map((p) => (
              <li key={p.label}>
                <span>{p.label}</span>
                <strong>{p.price}</strong>
              </li>
            ))}
          </ul>
          <span className="gruss-price-note">
            Richtwerte — genauer Preis kommt nach deiner Anfrage &middot; Lieferung in 24–48h
          </span>
        </div>
      </header>

      <section className="gruss-examples">
        {EXAMPLES.map((ex) => (
          <div className="card gruss-example-card" key={ex.file}>
            <video
              className="gruss-example-video"
              src={`/gruss-media/${ex.file}`}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
            />
            <div className="eyebrow-small">{ex.label}</div>
            <h3>{ex.title}</h3>
            <p>{ex.text}</p>
          </div>
        ))}
      </section>

      <section className="gruss-how-section">
        <h2 className="gruss-section-title">So läuft's ab</h2>
        <div className="gruss-how-grid">
          {HOW_STEPS.map((step, i) => (
            <div className="card gruss-how-card" key={step.title}>
              <div className="gruss-how-num">{i + 1}</div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
        <p className="gruss-how-note">
          Das Video ist für dich und die beschenkte Person gedacht — zum privaten Teilen, nicht
          zur kommerziellen Weiterverwendung.
        </p>
      </section>

      <section className="gruss-form-section">
        <div className="card gruss-form-card">
          <h2>Video anfragen</h2>
          <p className="gruss-form-intro">
            Kurz ausfüllen, wir melden uns mit einem Preisvorschlag.
          </p>
          <GrussForm />
        </div>

        <p className="gruss-legal-note">
          <strong>Rechtliche Hinweise &amp; Lizenz:</strong> Nutzung ausschließlich zur privaten
          Verwendung. Dieses kreative, fiktionale Animationsvideo wurde unter Zuhilfenahme von
          KI-gestützten Design-Tools erstellt. Format: MP4.
        </p>
      </section>

      <footer>
        <LegalFooter />
      </footer>
    </main>
  );
}
