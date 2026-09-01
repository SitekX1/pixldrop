"use client";

import { useCallback, useState } from "react";
import HelixTower from "./HelixTower";
import RankReveal from "./RankReveal";
import Leaderboard from "./Leaderboard";
import { startGameSession, submitScore, getScoreRank } from "@/lib/pixlgame-supabase";

type Screen = "start" | "playing" | "name" | "reveal" | "leaderboard";

export default function GameApp() {
  const [screen, setScreen] = useState<Screen>("start");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState(0);
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

  const handleGameOver = useCallback((score: number) => {
    setFinalScore(score);
    setScreen("name");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!sessionId || !name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitScore(sessionId, name.trim(), finalScore);
      const r = await getScoreRank(finalScore);
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
        background: "#0b0c14",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        gap: 18,
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>🐾 Flucht aus dem Büro</h1>

      {error && <div style={{ color: "#ff8080", fontSize: 13 }}>⚠ {error}</div>}

      {screen === "start" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <p style={{ color: "#b7bade", fontSize: 14, textAlign: "center", maxWidth: 280 }}>
            Dreh den Bürogebäude-Turm und lass Eddie durch die Lücken fallen. Rote Etagen
            (der Chef!) meiden — wie tief schaffst du's?
          </p>
          <button onClick={startGame} style={primaryBtn}>
            Spiel starten
          </button>
        </div>
      )}

      {screen === "playing" && <HelixTower onGameOver={handleGameOver} />}

      {screen === "name" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Spiel vorbei! Score: {finalScore}</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            placeholder="Dein Name"
            style={{
              background: "#171928",
              border: "1px solid #2a2d45",
              borderRadius: 12,
              padding: "12px 14px",
              color: "#fff",
              fontSize: 15,
              width: 220,
              textAlign: "center",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            style={{ ...primaryBtn, opacity: submitting || !name.trim() ? 0.6 : 1 }}
          >
            {submitting ? "Speichert…" : "Score speichern"}
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
              setFinalScore(0);
            }}
            style={primaryBtn}
          >
            Nochmal spielen
          </button>
        </div>
      )}
    </main>
  );
}

const primaryBtn: React.CSSProperties = {
  background: "linear-gradient(135deg, #1b2a6b 0%, #5b2a9e 55%, #2fc2e8 100%)",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  padding: "12px 24px",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
};
