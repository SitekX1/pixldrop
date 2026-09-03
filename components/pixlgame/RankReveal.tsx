"use client";

import { useEffect, useRef, useState } from "react";

const RANK_VIDEOS: Record<string, string> = {
  "1": "/pixlgame-media/rank1.mp4",
  "2": "/pixlgame-media/rank2.mp4",
  "3": "/pixlgame-media/rank3.mp4",
  other: "/pixlgame-media/rank-other.mp4",
};

// Frame direkt aus dem jeweiligen Video, als Poster — zeigt sofort etwas
// Passendes statt eines grauen Player-Platzhalters, bis das Video selbst
// bereit zum Abspielen ist.
const RANK_POSTERS: Record<string, string> = {
  "1": "/pixlgame-media/rank1-poster.jpg",
  "2": "/pixlgame-media/rank2-poster.jpg",
  "3": "/pixlgame-media/rank3-poster.jpg",
  other: "/pixlgame-media/rank-other-poster.jpg",
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
  const [needsTap, setNeedsTap] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // Harter Sicherheits-Fallback: egal was mit Autoplay/Tap passiert, nach
  // spätestens 7s geht's weiter — man bleibt hier nie hängen.
  useEffect(() => {
    const t = setTimeout(() => doneRef.current(), 7000);
    return () => clearTimeout(t);
  }, []);

  const tryPlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.play()
      .then(() => setNeedsTap(false))
      .catch(() => setNeedsTap(true));
  };

  useEffect(() => {
    tryPlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          position: "relative",
          width: 260,
          height: 462,
          borderRadius: 20,
          overflow: "hidden",
          background: "linear-gradient(180deg, #fbeedd 0%, #f3d9b8 45%, #7a5236 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!videoFailed ? (
          <>
            <video
              ref={videoRef}
              src={RANK_VIDEOS[key]}
              poster={RANK_POSTERS[key]}
              autoPlay
              playsInline
              onPlay={() => setNeedsTap(false)}
              onEnded={() => doneRef.current()}
              onError={() => setVideoFailed(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {needsTap && (
              <button
                onClick={tryPlay}
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(15,27,77,0.55)",
                  border: "none",
                  color: "#fff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                <span style={{ fontSize: 40 }}>▶</span>
                Antippen für Ton
              </button>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", color: "#6b4226", padding: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🐾</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#3f2716" }}>
              {RANK_LABELS[key]}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
