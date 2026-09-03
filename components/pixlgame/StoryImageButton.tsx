"use client";

import { useState } from "react";
import { uploadStoryImage } from "@/lib/pixlgame-supabase";

const RANK_POSTERS: Record<string, string> = {
  "1": "/pixlgame-media/rank1-poster.jpg",
  "2": "/pixlgame-media/rank2-poster.jpg",
  "3": "/pixlgame-media/rank3-poster.jpg",
  other: "/pixlgame-media/rank-other-poster.jpg",
};

const RANK_HEADLINES: Record<string, string> = {
  "1": "🏆 Platz 1",
  "2": "🥈 Platz 2",
  "3": "🥉 Platz 3",
  other: "☕ Mitgespielt!",
};

const RANK_SUBLINES: Record<string, string> = {
  "1": "bei Eddie's Café geworden!",
  "2": "bei Eddie's Café geworden!",
  "3": "bei Eddie's Café geworden!",
  other: "bei Eddie's Café!",
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Bild konnte nicht geladen werden: ${src}`));
    img.src = src;
  });
}

// Vertikales 1080x1920-Story-Format (Instagram/TikTok-Standard) — Eddie-Poster
// als Hintergrund, Platz + Score + CTA + Logo als Canvas-Text/Overlay obendrauf.
// Läuft komplett clientseitig, kein Server-Rendering nötig.
async function renderStoryImage(rank: number, score: number): Promise<{ dataUrl: string; blob: Blob }> {
  const key = rank <= 3 ? String(rank) : "other";
  const W = 1080;
  const H = 1920;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas wird nicht unterstützt");

  const [poster, logo] = await Promise.all([
    loadImage(RANK_POSTERS[key]),
    loadImage("/pixldrop-logo-transparent.png"),
  ]);

  const coverScale = Math.max(W / poster.width, H / poster.height);
  const dw = poster.width * coverScale;
  const dh = poster.height * coverScale;
  ctx.drawImage(poster, (W - dw) / 2, (H - dh) / 2, dw, dh);

  const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.32);
  topGrad.addColorStop(0, "rgba(15,10,5,0.7)");
  topGrad.addColorStop(1, "rgba(15,10,5,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, H * 0.32);

  const botGrad = ctx.createLinearGradient(0, H * 0.62, 0, H);
  botGrad.addColorStop(0, "rgba(15,10,5,0)");
  botGrad.addColorStop(1, "rgba(15,10,5,0.88)");
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, H * 0.62, W, H * 0.38);

  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 24;

  ctx.fillStyle = "#fff";
  ctx.font = "800 92px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(RANK_HEADLINES[key], W / 2, 180);

  ctx.font = "700 46px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(RANK_SUBLINES[key], W / 2, 250);

  ctx.shadowBlur = 12;
  ctx.font = "800 64px 'Segoe UI', system-ui, sans-serif";
  ctx.fillText(`${score} Punkte`, W / 2, 1470);

  ctx.shadowBlur = 0;
  ctx.font = "600 34px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("Jetzt selbst spielen:", W / 2, 1550);

  ctx.font = "800 42px 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText("pixldrop.de/pixlgame", W / 2, 1600);

  const logoW = 340;
  const logoH = (logo.height / logo.width) * logoW;
  ctx.drawImage(logo, (W - logoW) / 2, 1660, logoW, logoH);

  // data:-URL statt nur blob: — "Antippen & halten → Speichern" ist auf
  // vielen Mobilbrowsern/In-App-Webviews für blob:-Bilder unzuverlässig,
  // data:-URLs werden dafür deutlich breiter unterstützt. Für die
  // Web-Share-API (braucht eine echte File) wird zusätzlich ein Blob erzeugt.
  const dataUrl = canvas.toDataURL("image/png");
  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export fehlgeschlagen"))), "image/png");
  });
  return { dataUrl, blob };
}

export default function StoryImageButton({ rank, score }: { rank: number; score: number }) {
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [canShareFile, setCanShareFile] = useState(false);
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileName = `eddies-cafe-platz-${rank <= 3 ? rank : "mitgespielt"}.png`;

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setHostedUrl(null);
    setUploadFailed(false);
    setCopied(false);
    try {
      const { dataUrl, blob } = await renderStoryImage(rank, score);
      setPreviewBlob(blob);
      setPreviewUrl(dataUrl);
      // Nicht nur prüfen OB canShare existiert, sondern ob es für GENAU
      // diese Datei true zurückgibt — sonst zeigen wir auf Browsern ohne
      // echte Datei-Unterstützung einen Teilen-Button, der nichts tut.
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      const file = new File([blob], fileName, { type: "image/png" });
      setCanShareFile(Boolean(nav.canShare?.({ files: [file] })));
      setGenerating(false);

      // Im Hintergrund hochladen für eine ECHTE, dauerhafte URL — die lokale
      // data:-URL geht verloren, sobald TikToks/Instagrams "Im Browser
      // öffnen" die Seite in einem neuen Browser komplett neu lädt. Eine
      // echte URL übersteht das und lässt sich zur Not auch einfach
      // manuell in einen Browser kopieren.
      try {
        const url = await uploadStoryImage(blob, fileName);
        setHostedUrl(url);
      } catch {
        setUploadFailed(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bild konnte nicht erstellt werden");
      setGenerating(false);
    }
  };

  const closePreview = () => {
    setPreviewUrl(null);
    setPreviewBlob(null);
    setCanShareFile(false);
    setHostedUrl(null);
    setUploadFailed(false);
    setCopied(false);
  };

  const handleShare = async () => {
    if (!previewBlob) return;
    const file = new File([previewBlob], fileName, { type: "image/png" });
    try {
      await navigator.share({ files: [file], title: "Eddie's Café", text: "Ich hab bei Eddie's Café gespielt! 🐾☕" });
    } catch {
      // Nutzer hat den Teilen-Dialog abgebrochen — kein Fehler.
    }
  };

  const handleCopyLink = async () => {
    if (!hostedUrl) return;
    try {
      await navigator.clipboard.writeText(hostedUrl);
      setCopied(true);
    } catch {
      setError("Link konnte nicht kopiert werden");
    }
  };

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="pill-btn"
        style={{ border: "none", cursor: generating ? "default" : "pointer", opacity: generating ? 0.6 : 1 }}
      >
        {generating ? "Erstellt…" : "📸 Story-Bild erstellen"}
      </button>
      {error && <p style={{ color: "#e0433c", fontSize: 12, margin: 0 }}>⚠ {error}</p>}

      {previewUrl && (
        <div className="modal-overlay" onClick={closePreview}>
          <div className="modal-box" style={{ maxWidth: 300 }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closePreview} aria-label="Schließen">
              ✕
            </button>
            <img
              src={previewUrl}
              alt="Story-Bild Vorschau"
              style={{ width: "100%", borderRadius: 16, marginBottom: 16, display: "block" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {canShareFile && (
                <button onClick={handleShare} className="pill-btn modal-copy-btn" style={{ border: "none" }}>
                  Teilen
                </button>
              )}

              {hostedUrl ? (
                <>
                  {/* Echte, dauerhafte Bild-URL statt nur lokaler data:-URL —
                      übersteht auch einen Browserwechsel (z.B. TikToks "Im
                      Browser öffnen"), weil sie nicht vom lokalen
                      Seiten-Speicher abhängt. Das ist der zuverlässigste Weg. */}
                  <a
                    href={hostedUrl}
                    download={fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pill-btn modal-copy-btn"
                    style={{ border: "none" }}
                  >
                    🔗 Bild öffnen zum Speichern
                  </a>
                  <button
                    onClick={handleCopyLink}
                    className="pill-btn modal-copy-btn"
                    style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                  >
                    {copied ? "Link kopiert ✓" : "Link kopieren"}
                  </button>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, textAlign: "center", lineHeight: 1.5 }}>
                    Falls "Bild öffnen" im TikTok/Instagram-Browser nichts tut: Link kopieren, dann
                    manuell in Chrome/Safari öffnen und dort das Bild antippen &amp; halten zum Speichern.
                  </p>
                </>
              ) : (
                <>
                  <a
                    href={previewUrl}
                    download={fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pill-btn modal-copy-btn"
                    style={{ background: "var(--bg)", color: "var(--text)", border: "1px solid var(--border)" }}
                  >
                    Herunterladen
                  </a>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, textAlign: "center", lineHeight: 1.5 }}>
                    {uploadFailed
                      ? "Stabiler Link konnte nicht erstellt werden — bitte oben antippen & halten zum Speichern."
                      : "Erstelle einen stabilen Link zum Speichern…"}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
