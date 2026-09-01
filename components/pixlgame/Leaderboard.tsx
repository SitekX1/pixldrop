"use client";

import { useEffect, useState } from "react";
import { fetchTopScores, type TopScore } from "@/lib/pixlgame-supabase";

export default function Leaderboard() {
  const [scores, setScores] = useState<TopScore[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopScores(20)
      .then(setScores)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="card" style={{ width: "100%", maxWidth: 340, padding: 0, overflow: "hidden" }}>
      <div
        style={{
          background: "var(--navy)",
          color: "#fff",
          fontSize: 15,
          fontWeight: 800,
          padding: "12px 16px",
        }}
      >
        🏆 Bestenliste
      </div>
      {error && <div style={{ color: "#e0433c", fontSize: 13, padding: 16 }}>Fehler: {error}</div>}
      {!scores && !error && <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 16 }}>Lädt…</div>}
      {scores && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {scores.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 16px",
                background: i % 2 === 0 ? "var(--card)" : "var(--bg)",
                borderTop: "1px solid var(--border)",
                fontSize: 13,
                color: "var(--text)",
              }}
            >
              <span>
                {i + 1}. {s.player_name}
              </span>
              <span style={{ fontWeight: 800, color: i < 3 ? "var(--violet)" : "var(--text)" }}>{s.score}</span>
            </div>
          ))}
          {scores.length === 0 && (
            <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 16 }}>Noch keine Einträge.</div>
          )}
        </div>
      )}
    </div>
  );
}
