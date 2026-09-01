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
    <div style={{ width: "100%", maxWidth: 340 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
        🏆 Bestenliste
      </h2>
      {error && <div style={{ color: "#ff8080", fontSize: 13 }}>Fehler: {error}</div>}
      {!scores && !error && <div style={{ color: "#b7bade", fontSize: 13 }}>Lädt…</div>}
      {scores && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {scores.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: i < 3 ? "#2a1f45" : "#171928",
                borderRadius: 10,
                fontSize: 13,
                color: "#fff",
              }}
            >
              <span>
                {i + 1}. {s.player_name}
              </span>
              <span style={{ fontWeight: 700 }}>{s.score}</span>
            </div>
          ))}
          {scores.length === 0 && (
            <div style={{ color: "#b7bade", fontSize: 13 }}>Noch keine Einträge.</div>
          )}
        </div>
      )}
    </div>
  );
}
