"use client";

import { useCallback, useState } from "react";
import ShootingGallery from "./ShootingGallery";
import RankReveal from "./RankReveal";
import Leaderboard from "./Leaderboard";
import { startGameSession, submitScore, getScoreRank } from "@/lib/pixlgame-supabase";

type Screen = "start" | "playing" | "name" | "reveal" | "leaderboard";

const RULES: { img: string; ring: string; label: string; value: string; valueColor: string }[] = [
  { img: "/pixlgame-media/coffee-cup.jpg", ring: "#e4d3b8", label: "Kaffeetasse", value: "+10 PUNKTE", valueColor: "var(--navy)" },
  { img: "/pixlgame-media/coffee-bean.jpg", ring: "#6b4226", label: "Kaffeebohne (klein, schnell)", value: "+25 PUNKTE", valueColor: "var(--navy)" },
  { img: "/pixlgame-media/coffee-golden.jpg", ring: "#e7c25a", label: "Goldene Tasse (selten)", value: "+100 PUNKTE", valueColor: "#c9971f" },
  { img: "/pixlgame-media/coffee-pot.jpg", ring: "#2fc2e8", label: "Kaffeekanne", value: "+5 SEK.", valueColor: "var(--cyan)" },
  { img: "/pixlgame-media/coffee-muffin.jpg", ring: "#7b4fc4", label: "Gebäck (6 Sek. lang)", value: "2X PUNKTE", valueColor: "var(--violet)" },
  { img: "/pixlgame-media/eddie-sprite.png", ring: "#e0433c", label: "Eddie — NICHT treffen!", value: "−1 LEBEN", valueColor: "#e0433c" },
];

export default function GameApp() {
  const [screen, setScreen] = useState<Screen>("start");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState({ total: 0, base: 0, bonus: 0 });
  const [name, setName] = useState("");
  const [rank, setRank] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--bg)",
        color: "var(--text)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        gap: 18,
      }}
    >
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

      {error && <div style={{ color: "#e0433c", fontSize: 13 }}>⚠ {error}</div>}

      {screen === "start" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", maxWidth: 320 }}>
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
          <p style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center" }}>
            3 Leben · 60 Sekunden · manuelles Nachladen
          </p>
          <button onClick={startGame} className="pill-btn" style={{ border: "none", cursor: "pointer" }}>
            Spiel starten
          </button>
        </div>
      )}

      {screen === "playing" && <ShootingGallery onGameOver={handleGameOver} />}

      {screen === "name" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", maxWidth: 320 }}>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              background: "var(--gradient)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {finalScore.total}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: -12 }}>Runde beendet</div>

          <div className="card" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
            <Row label="Erspielte Punkte" value={finalScore.base} />
            <Row label="Lebensbonus" value={finalScore.bonus} accent />
            <Row label="Gesamtpunktzahl" value={finalScore.total} bold />
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            placeholder="Dein Name"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "12px 14px",
              color: "var(--text)",
              fontSize: 15,
              width: "100%",
              textAlign: "center",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            className="pill-btn"
            style={{ border: "none", cursor: "pointer", opacity: submitting || !name.trim() ? 0.6 : 1 }}
          >
            {submitting ? "Speichert…" : "Highscore eintragen"}
          </button>
        </div>
      )}

      {screen === "reveal" && rank !== null && (
        <RankReveal rank={rank} onDone={() => setScreen("leaderboard")} />
      )}

      {screen === "leaderboard" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%" }}>
          <Leaderboard />
          <button
            onClick={() => {
              setScreen("start");
              setSessionId(null);
              setName("");
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
