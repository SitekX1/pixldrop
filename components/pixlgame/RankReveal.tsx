"use client";

import { useEffect, useState } from "react";

const RANK_VIDEOS: Record<string, string> = {
  "1": "/pixlgame-media/rank1.mp4",
  "2": "/pixlgame-media/rank2.mp4",
  "3": "/pixlgame-media/rank3.mp4",
  other: "/pixlgame-media/rank-other.mp4",
};

const RANK_LABELS: Record<string, string> = {
  "1": "Platz 1 🏆",
  "2": "Platz 2 🥈",
  "3": "Platz 3 🥉",
  other: "Knapp daneben!",
};

export default function RankReveal({
  rank,
  onDone,
}: {
  rank: number;
  onDone: () => void;
}) {
  const key = rank <= 3 ? String(rank) : "other";
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const t = setTimeout(onDone, 4500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        padding: "20px 0",
      }}
    >
      <div
        style={{
          width: 260,
          height: 462,
          borderRadius: 20,
          overflow: "hidden",
          background: "#171928",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!videoFailed ? (
          <video
            src={RANK_VIDEOS[key]}
            autoPlay
            muted
            playsInline
            onError={() => setVideoFailed(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ textAlign: "center", color: "#b7bade", padding: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🐾</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#fff" }}>
              {RANK_LABELS[key]}
            </div>
            <div style={{ fontSize: 12, marginTop: 8 }}>(Platzhalter-Video folgt)</div>
          </div>
        )}
      </div>
    </div>
  );
}
