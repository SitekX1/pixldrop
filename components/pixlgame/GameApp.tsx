"use client";

import { useCallback, useRef, useState } from "react";
import ShootingGallery from "./ShootingGallery";
import RankReveal from "./RankReveal";
import Leaderboard from "./Leaderboard";
import { startGameSession, submitScore, getScoreRank } from "@/lib/pixlgame-supabase";
import TrackedLink from "@/components/TrackedLink";
import { TikTokIcon, InstagramIcon } from "@/components/Icons";

type Screen = "intro" | "start" | "playing" | "name" | "reveal" | "leaderboard";

const SOCIAL_LINKS = {
  tiktok: "https://www.tiktok.com/@pixldropai",
  instagram: "https://www.instagram.com/pixl.drop",
};

const RULES: { img: string; ring: string; label: string; value: string; valueColor: string }[] = [
  { img: "/pixlgame-media/coffee-cup.png", ring: "#e4d3b8", label: "Kaffeetasse", value: "+10 PUNKTE", valueColor: "var(--navy)" },
  { img: "/pixlgame-media/coffee-bean.png", ring: "#6b4226", label: "Kaffeebohne (klein, schnell)", value: "+25 PUNKTE", valueColor: "var(--navy)" },
  { img: "/pixlgame-media/coffee-golden.png", ring: "#e7c25a", label: "Goldene Tasse (selten)", value: "+100 PUNKTE", valueColor: "#c9971f" },
  { img: "/pixlgame-media/coffee-clock.png", ring: "#2fc2e8", label: "Kaffee-Uhr", value: "+5 SEK.", valueColor: "var(--cyan)" },
  { img: "/pixlgame-media/coffee-muffin.png", ring: "#7b4fc4", label: "Gebäck (6 Sek. lang)", value: "2X PUNKTE", valueColor: "var(--violet)" },
  { img: "/pixlgame-media/eddie-iso.png", ring: "#e0433c", label: "Eddie — NICHT treffen!", value: "−1 LEBEN", valueColor: "#e0433c" },
  { img: "/pixlgame-media/wasp.png", ring: "#e0433c", label: "Wespe — auch NICHT treffen!", value: "−1 LEBEN", valueColor: "#e0433c" },
];

// Kräftiger Navy/Violet/Gold-Strukturhintergrund als pixldrop-eigene Seiten-Kulisse
// (Pendant zu honeycrews Honigwaben, aber in Markenfarben statt Honig-Thema).
const PAGE_PATTERN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56'>
  <path d='M0 56L56 0' stroke='%235b2a9e' stroke-width='1' stroke-opacity='0.12'/>
  <path d='M-14 14L14 -14' stroke='%23e7c25a' stroke-width='1' stroke-opacity='0.10'/>
  <path d='M42 70L70 42' stroke='%23e7c25a' stroke-width='1' stroke-opacity='0.10'/>
</svg>`;
const PAGE_BACKGROUND = `radial-gradient(circle at 8% 6%, rgba(91,42,158,0.30), transparent 55%), radial-gradient(circle at 92% 12%, rgba(231,194,90,0.30), transparent 50%), radial-gradient(circle at 88% 94%, rgba(47,194,232,0.28), transparent 55%), url("data:image/svg+xml,${encodeURIComponent(
  PAGE_PATTERN_SVG
)}"), #fff3e6`;

export default function GameApp({ src }: { src?: "tiktok" | "instagram" }) {
  const [screen, setScreen] = useState<Screen>("intro");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState({ total: 0, base: 0, bonus: 0 });
  const [name, setName] = useState("");
  const [rank, setRank] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const nameCardRef = useRef<HTMLDivElement>(null);

  const startGame = useCallback(async () => {
    setError(null);
    try {
      const id = await startGameSession();
      setSessionId(id);
      setScreen("playing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Starten");
    }
  }, []);

  const handleGameOver = useCallback((total: number, base: number, bonus: number) => {
    setFinalScore({ total, base, bonus });
    setScreen("name");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!sessionId || !name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitScore(sessionId, name.trim(), finalScore.total);
      const r = await getScoreRank(finalScore.total);
      setRank(r);
      setScreen("reveal");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Speichern");
    } finally {
      setSubmitting(false);
    }
  }, [sessionId, name, finalScore]);

  const playing = screen === "playing";

  return (
    <main
      style={{
        height: "100dvh",
        background: PAGE_BACKGROUND,
        color: "var(--text)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: playing ? "stretch" : "center",
        paddingTop: playing ? 0 : "max(20px, calc(env(safe-area-inset-top) + 12px))",
        paddingBottom: playing ? 0 : "max(20px, calc(env(safe-area-inset-bottom) + 12px))",
        paddingLeft: playing ? 0 : 12,
        paddingRight: playing ? 0 : 12,
        overflowY: playing ? "hidden" : "auto",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        gap: playing ? 6 : 18,
      }}
    >
      {screen !== "playing" && screen !== "intro" && (
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            background: "var(--gradient)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          ☕ Eddie&apos;s Café
        </h1>
      )}

      {error && <div style={{ color: "#e0433c", fontSize: 13 }}>⚠ {error}</div>}

      {screen === "intro" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%", maxWidth: 360 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pixlgame-media/eddie-iso.png"
            alt="Eddie"
            style={{
              width: 180,
              height: "auto",
              filter: "drop-shadow(0 12px 18px rgba(27,42,107,0.35))",
            }}
          />
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              margin: 0,
              background: "var(--gradient)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              textAlign: "center",
            }}
          >
            ☕ Eddie&apos;s Café
          </h1>
          <p style={{ color: "var(--text)", fontSize: 14, textAlign: "center", lineHeight: 1.5 }}>
            Eddie hat sich ins Café geschlichen! Schieß Kaffeebohnen und Tassen für Punkte,
            schnapp dir Uhr und Gebäck für Boni — aber lass Eddie und die Wespe in Ruhe, sonst kostet's ein Leben.
          </p>
          <button
            onClick={() => setScreen("start")}
            className="pill-btn"
            style={{ border: "none", cursor: "pointer" }}
          >
            Weiter
          </button>
        </div>
      )}

      {screen === "start" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", maxWidth: 420 }}>
          <div className="card" style={{ width: "100%", padding: 0, overflow: "hidden" }}>
            {RULES.map((r, i) => (
              <div
                key={r.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderTop: i === 0 ? "none" : "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    overflow: "hidden",
                    flexShrink: 0,
                    boxShadow: `0 0 0 2px ${r.ring}`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{r.label}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#fff",
                    background: r.valueColor,
                    padding: "4px 8px",
                    borderRadius: 999,
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.value}
                </span>
              </div>
            ))}
          </div>
          <div
            className="card"
            style={{
              width: "100%",
              padding: "8px 10px",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <InfoChip icon="❤️" label="3 Leben" />
            <InfoChip icon="⏱" label="30 Sek. Start" />
            <InfoChip icon="🔄" label="Manuelles Nachladen" />
            <InfoChip icon="🔥" label="Ab 30s: Rush-Modus" />
          </div>
          <button onClick={startGame} className="pill-btn" style={{ border: "none", cursor: "pointer" }}>
            Spiel starten
          </button>
        </div>
      )}

      {playing && (
        <div style={{ flex: 1, width: "100%", minHeight: 0, display: "flex" }}>
          <ShootingGallery onGameOver={handleGameOver} />
        </div>
      )}

      {screen === "name" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", maxWidth: 420 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>Runde beendet</div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              lineHeight: 1,
              background: "var(--gradient)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              marginTop: -6,
            }}
          >
            {finalScore.total}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--violet)", marginTop: -12 }}>
            PUNKTE
          </div>

          <div className="card" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
            <Row label="Erspielte Punkte" value={finalScore.base} />
            <Row label="Lebensbonus" value={finalScore.bonus} accent />
            <Row label="Gesamtpunktzahl" value={finalScore.total} bold />
          </div>

          <div ref={nameCardRef} className="card" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>In die Rangliste eintragen</div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "left" }}>Öffentlicher Spielername</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              onFocus={() => {
                // Auf dem Handy schiebt sich die Tastatur über Eingabefeld
                // und Button — sobald sie aufgeht (kurze Verzögerung fürs
                // Animations-Timing), die ganze Karte ins Sichtbare scrollen.
                setTimeout(() => {
                  nameCardRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
                }, 300);
              }}
              placeholder="Dein Name"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "12px 14px",
                color: "var(--text)",
                fontSize: 15,
                width: "100%",
                textAlign: "center",
              }}
            />
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "var(--text-muted)", textAlign: "left", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              Ich bin damit einverstanden, dass mein Spielername, mein Score und das Spieldatum öffentlich in der Eddie&apos;s-Café-Rangliste angezeigt werden.
            </label>
            <button
              onClick={handleSubmit}
              disabled={submitting || !name.trim() || !consent}
              className="pill-btn"
              style={{ border: "none", cursor: "pointer", justifyContent: "center", opacity: submitting || !name.trim() || !consent ? 0.5 : 1 }}
            >
              {submitting ? "Speichert…" : "Highscore eintragen"}
            </button>
          </div>

          <button
            onClick={() => {
              setScreen("start");
              setSessionId(null);
              setName("");
              setConsent(false);
              setFinalScore({ total: 0, base: 0, bonus: 0 });
            }}
            className="pill-btn"
            style={{ border: "none", cursor: "pointer", background: "var(--navy)" }}
          >
            Nochmal spielen
          </button>
        </div>
      )}

      {screen === "reveal" && rank !== null && (
        <RankReveal rank={rank} onDone={() => setScreen("leaderboard")} />
      )}

      {screen === "leaderboard" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%" }}>
          <Leaderboard />

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>Folg uns für mehr Eddie 🐾</p>
            <div className="social-row" style={{ marginBottom: 0 }}>
              {src !== "instagram" && (
                <TrackedLink
                  href={SOCIAL_LINKS.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon"
                  event="social-click"
                  eventData={{ platform: "tiktok", source: "pixlgame" }}
                  aria-label="TikTok"
                >
                  <TikTokIcon />
                </TrackedLink>
              )}
              {src !== "tiktok" && (
                <TrackedLink
                  href={SOCIAL_LINKS.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-icon"
                  event="social-click"
                  eventData={{ platform: "instagram", source: "pixlgame" }}
                  aria-label="Instagram"
                >
                  <InstagramIcon />
                </TrackedLink>
              )}
            </div>
          </div>

          <button
            onClick={() => {
              setScreen("start");
              setSessionId(null);
              setName("");
              setConsent(false);
              setRank(null);
              setFinalScore({ total: 0, base: 0, bonus: 0 });
            }}
            className="pill-btn"
            style={{ border: "none", cursor: "pointer" }}
          >
            Nochmal spielen
          </button>
        </div>
      )}
    </main>
  );
}

function InfoChip({ icon, label }: { icon: string; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: 999,
        padding: "5px 10px",
        fontSize: 11,
        fontWeight: 700,
        color: "var(--text)",
        whiteSpace: "nowrap",
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: number; bold?: boolean; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: bold ? 16 : 14 }}>
      <span style={{ color: bold ? "var(--text)" : "var(--text-muted)", fontWeight: bold ? 700 : 500 }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 700, color: bold ? "var(--navy)" : accent ? "var(--cyan)" : "var(--text)" }}>
        {value > 0 && !bold ? "+" : ""}
        {value}
      </span>
    </div>
  );
}
