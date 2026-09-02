"use client";

import { useEffect, useState } from "react";
import { fetchTopScores, type TopScore } from "@/lib/pixlgame-supabase";

function ScoreRow({ rank, s }: { rank: number; s: TopScore }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "10px 16px",
        background: rank % 2 === 1 ? "var(--card)" : "var(--bg)",
        borderTop: "1px solid var(--border)",
        fontSize: 13,
        color: "var(--text)",
      }}
    >
      <span>
        {rank}. {s.player_name}
      </span>
      <span style={{ fontWeight: 800, color: rank <= 3 ? "var(--violet)" : "var(--text)" }}>{s.score}</span>
    </div>
  );
}

export default function Leaderboard() {
  const [scores, setScores] = useState<TopScore[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [allScores, setAllScores] = useState<TopScore[] | null>(null);
  const [allError, setAllError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopScores(10)
      .then(setScores)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!showAll || allScores || allError) return;
    fetchTopScores(100)
      .then(setAllScores)
      .catch((e) => setAllError(e.message));
  }, [showAll, allScores, allError]);

  return (
    <>
    <div className="card" style={{ width: "100%", maxWidth: 420, padding: 0, overflow: "hidden" }}>
      <div
        style={{
          background: "var(--navy)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 800 }}>🏆 TOP 10</span>
        <button
          onClick={() => setShowAll(true)}
          style={{
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "6px 12px",
            fontSize: 11,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Top 100 anzeigen
        </button>
      </div>
      {error && <div style={{ color: "#e0433c", fontSize: 13, padding: 16 }}>Fehler: {error}</div>}
      {!scores && !error && <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 16 }}>Lädt…</div>}
      {scores && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {scores.map((s, i) => (
            <ScoreRow key={i} rank={i + 1} s={s} />
          ))}
          {scores.length === 0 && (
            <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 16 }}>Noch keine Einträge.</div>
          )}
        </div>
      )}
    </div>

      {showAll && (
        <div className="modal-overlay" onClick={() => setShowAll(false)}>
          <div
            className="modal-box"
            style={{ maxWidth: 420, maxHeight: "80vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setShowAll(false)} aria-label="Schließen">
              ✕
            </button>
            <div style={{ background: "var(--navy)", color: "#fff", fontSize: 15, fontWeight: 800, padding: "16px" }}>
              🏆 TOP 100
            </div>
            <div style={{ overflowY: "auto" }}>
              {allError && <div style={{ color: "#e0433c", fontSize: 13, padding: 16 }}>Fehler: {allError}</div>}
              {!allScores && !allError && <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 16 }}>Lädt…</div>}
              {allScores &&
                allScores.map((s, i) => <ScoreRow key={i} rank={i + 1} s={s} />)}
              {allScores && allScores.length === 0 && (
                <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 16 }}>Noch keine Einträge.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
