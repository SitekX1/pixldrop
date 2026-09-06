import type { Metadata, Viewport } from "next";
import GrussForm from "@/components/GrussForm";

export const metadata: Metadata = {
  title: "Grußvideo von Eddie — PixlDrop",
  description:
    "Ein persönliches Geburtstags- oder Grußvideo, gesprochen von Eddie. Süß, mit Seitenhieb, in wenigen Tagen fertig.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

const EXAMPLES = [
  {
    file: "beispiel-geburtstag.mp4",
    label: "Geburtstag",
    title: "Alles Gute!",
    text: "Der Klassiker — Eddie gratuliert mit Ballons, Kuchen und einer kleinen Spitze.",
  },
  {
    file: "beispiel-gutenacht.mp4",
    label: "Süß",
    title: "Gute Nacht",
    text: "Reine Süße, keine Fallhöhe — für alle, die es einfach nur herzlich mögen.",
  },
  {
    file: "beispiel-schwarzer-humor.mp4",
    label: "Schwarzer Humor",
    title: "Guten Morgen",
    text: "Süß verpackt, mit Seitenhieb — Eddies Markenzeichen.",
  },
];

export default function GrussPage() {
  return (
    <main className="page gruss-page">
      <header className="gruss-hero">
        <div className="eyebrow-small">Neu bei PixlDrop</div>
        <h1>Ein Grußvideo von Eddie</h1>
        <p className="gruss-sub">
          Geburtstag, Jubiläum oder einfach nur, weil jemand ein Lächeln verdient hat — Eddie
          nimmt ein kurzes, persönliches Video für diese Person auf. Süß, manchmal mit
          Seitenhieb, immer eindeutig PixlDrop.
        </p>
        <div className="gruss-price">
          <span className="gruss-price-value">Preis auf Anfrage</span>
          <span className="gruss-price-note">richtet sich nach Aufwand &middot; ca. 8 Sekunden &middot; Lieferung in 24–48h</span>
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

      <section className="gruss-how">
        <h2>So läuft's ab</h2>
        <ol className="gruss-how-list">
          <li>
            <strong>Anfrage abschicken</strong> — Formular unten ausfüllen, dauert eine Minute.
          </li>
          <li>
            <strong>Preisangebot</strong> — wir melden uns per E-Mail mit einem Preis, passend
            zum Aufwand deiner Wünsche.
          </li>
          <li>
            <strong>Zusage &amp; Zahlung</strong> — du bestätigst, wir schicken dir einen
            Zahlungslink.
          </li>
          <li>
            <strong>Lieferung</strong> — dein fertiges Video kommt als Datei direkt per E-Mail,
            fertig zum Weiterschicken per WhatsApp, Instagram, TikTok oder wo du magst.
          </li>
        </ol>
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
      </section>
    </main>
  );
}
