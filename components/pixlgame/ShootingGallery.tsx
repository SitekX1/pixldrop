"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VIEWPORT_W = 340;
const VIEWPORT_H = 480;
const HUD_H = 0; // HUD liegt außerhalb des Spielfelds, kein Platz reserviert
const TICK_MS = 16;

const TOTAL_AMMO = 40;
const CLIP_SIZE = 6;
const RELOAD_MS = 550;

// BILDPFADE ANPASSEN: hier eure eigenen Pixel-Art-Grafiken von Eddie eintragen.
// Solange die Dateien fehlen, wird automatisch ein Emoji-Platzhalter angezeigt.
const KINDS = {
  normal: {
    img: "/pixlgame-media/eddie-normal.png",
    fallbackEmoji: "🐾",
    points: 10,
    weight: 62,
    size: 58,
    speed: [70, 110] as [number, number],
    bob: 14,
  },
  fast: {
    img: "/pixlgame-media/eddie-fast.png",
    fallbackEmoji: "🐶",
    points: 25,
    weight: 30,
    size: 46,
    speed: [140, 190] as [number, number],
    bob: 22,
  },
  golden: {
    img: "/pixlgame-media/eddie-golden.png",
    fallbackEmoji: "🐾",
    points: 100,
    weight: 8,
    size: 50,
    speed: [190, 240] as [number, number],
    bob: 30,
  },
};

type KindKey = keyof typeof KINDS;

type Target = {
  id: number;
  kind: KindKey;
  x: number;
  baseY: number;
  y: number;
  dir: 1 | -1;
  speed: number;
  phase: number;
  bob: number;
  size: number;
  hit: boolean;
};

function pickWeightedKind(): KindKey {
  const entries = Object.entries(KINDS) as [KindKey, (typeof KINDS)[KindKey]][];
  const total = entries.reduce((s, [, k]) => s + k.weight, 0);
  let r = Math.random() * total;
  for (const [key, k] of entries) {
    r -= k.weight;
    if (r <= 0) return key;
  }
  return "normal";
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function ShootingGallery({
  onGameOver,
}: {
  onGameOver: (score: number) => void;
}) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [ammoLeft, setAmmoLeft] = useState(TOTAL_AMMO);
  const [clipLeft, setClipLeft] = useState(CLIP_SIZE);
  const [reloading, setReloading] = useState(false);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);
  const [muzzle, setMuzzle] = useState<{ x: number; y: number; id: number } | null>(null);
  const [floaters, setFloaters] = useState<{ id: number; x: number; y: number; text: string; kind: KindKey }[]>([]);

  const targetsRef = useRef<Target[]>([]);
  const overRef = useRef(false);
  const ammoRef = useRef(TOTAL_AMMO);
  const clipRef = useRef(CLIP_SIZE);
  const reloadingRef = useRef(false);
  const nextIdRef = useRef(1);
  const spawnTimerRef = useRef(600);
  const elapsedRef = useRef(0);

  const spawnTarget = useCallback(() => {
    const kind = pickWeightedKind();
    const cfg = KINDS[kind];
    const fromLeft = Math.random() < 0.5;
    const speed = rand(cfg.speed[0], cfg.speed[1]) * (fromLeft ? 1 : -1);
    const baseY = rand(50, VIEWPORT_H - 60);
    const t: Target = {
      id: nextIdRef.current++,
      kind,
      x: fromLeft ? -cfg.size : VIEWPORT_W + cfg.size,
      baseY,
      y: baseY,
      dir: fromLeft ? 1 : -1,
      speed,
      phase: Math.random() * Math.PI * 2,
      bob: cfg.bob,
      size: cfg.size,
      hit: false,
    };
    targetsRef.current = [...targetsRef.current, t];
    setTargets(targetsRef.current);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (overRef.current) return;
      const dt = TICK_MS / 1000;
      elapsedRef.current += dt;

      spawnTimerRef.current -= TICK_MS;
      if (spawnTimerRef.current <= 0 && targetsRef.current.length < 3) {
        spawnTarget();
        spawnTimerRef.current = rand(500, 950);
      }

      const survived: Target[] = [];
      for (const t of targetsRef.current) {
        if (t.hit) continue;
        const nx = t.x + t.speed * dt;
        const ny = t.baseY + Math.sin(t.phase + elapsedRef.current * 3) * t.bob;
        if (nx < -t.size - 10 || nx > VIEWPORT_W + t.size + 10) continue;
        survived.push({ ...t, x: nx, y: ny });
      }
      targetsRef.current = survived;
      setTargets(survived);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [spawnTarget]);

  const endGame = useCallback(() => {
    overRef.current = true;
    onGameOver(score);
  }, [onGameOver, score]);

  const scoreRef = useRef(score);
  scoreRef.current = score;

  const fire = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      if (overRef.current || reloadingRef.current || ammoRef.current <= 0) return;

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      ammoRef.current -= 1;
      clipRef.current -= 1;
      setAmmoLeft(ammoRef.current);
      setClipLeft(clipRef.current);
      setMuzzle({ x, y, id: Date.now() });

      let hitTarget: Target | null = null;
      for (const t of targetsRef.current) {
        if (t.hit) continue;
        const dx = x - t.x;
        const dy = y - t.y;
        const r = t.size / 2 + 8;
        if (dx * dx + dy * dy <= r * r) {
          hitTarget = t;
          break;
        }
      }

      if (hitTarget) {
        const cfg = KINDS[hitTarget.kind];
        hitTarget.hit = true;
        targetsRef.current = targetsRef.current.filter((t) => t.id !== hitTarget!.id);
        setTargets(targetsRef.current);
        const newScore = scoreRef.current + cfg.points;
        scoreRef.current = newScore;
        setScore(newScore);
        const floaterId = nextIdRef.current++;
        setFloaters((prev) => [
          ...prev,
          { id: floaterId, x: hitTarget!.x, y: hitTarget!.y, text: "+" + cfg.points, kind: hitTarget!.kind },
        ]);
        setTimeout(() => {
          setFloaters((prev) => prev.filter((f) => f.id !== floaterId));
        }, 650);
      }

      if (clipRef.current <= 0 && ammoRef.current > 0) {
        reloadingRef.current = true;
        setReloading(true);
        setTimeout(() => {
          clipRef.current = CLIP_SIZE;
          reloadingRef.current = false;
          setClipLeft(CLIP_SIZE);
          setReloading(false);
        }, RELOAD_MS);
      }

      if (ammoRef.current <= 0) {
        setTimeout(() => endGame(), 250);
      }
    },
    [endGame]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", gap: 14, fontSize: 14, color: "#fff", fontWeight: 700 }}>
        <span>Punkte: {score}</span>
        <span>
          Munition: {ammoLeft}{" "}
          <span style={{ color: "#8a93c9", fontWeight: 500 }}>
            ({"●".repeat(clipLeft)}
            {"○".repeat(CLIP_SIZE - clipLeft)})
          </span>
        </span>
      </div>
      <div
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setCrosshair({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          fire(e.clientX, e.clientY, rect);
        }}
        onPointerLeave={() => setCrosshair(null)}
        style={{
          position: "relative",
          width: VIEWPORT_W,
          height: VIEWPORT_H,
          borderRadius: 16,
          overflow: "hidden",
          background: "linear-gradient(180deg, #bfe3ff 0%, #eaf7ff 55%, #d7ecc9 100%)",
          touchAction: "none",
          cursor: "none",
          userSelect: "none",
        }}
      >
        {/* BILDPFAD ANPASSEN: Hintergrund-Szenerie für die Schießbude */}
        <img
          src="/pixlgame-media/gallery-bg.png"
          alt=""
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            imageRendering: "pixelated",
            pointerEvents: "none",
          }}
        />

        {targets.map((t) => {
          const cfg = KINDS[t.kind];
          return (
            <div
              key={t.id}
              style={{
                position: "absolute",
                left: t.x,
                top: t.y,
                width: t.size,
                height: t.size,
                transform: `translate(-50%, -50%) scaleX(${t.dir})`,
                pointerEvents: "none",
              }}
            >
              <img
                src={cfg.img}
                alt=""
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  const fb = (e.target as HTMLImageElement).nextSibling as HTMLElement | null;
                  if (fb) fb.style.display = "flex";
                }}
                style={{ width: "100%", height: "100%", imageRendering: "pixelated" }}
              />
              <div
                style={{
                  display: "none",
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: t.size * 0.6,
                  position: "absolute",
                  inset: 0,
                  background:
                    t.kind === "golden"
                      ? "radial-gradient(circle, #ffe27a, #f2a900)"
                      : t.kind === "fast"
                      ? "radial-gradient(circle, #ffb199, #ff6a3d)"
                      : "radial-gradient(circle, #cdb7ff, #7c5cff)",
                  boxShadow: t.kind === "golden" ? "0 0 14px 4px rgba(255,210,80,0.7)" : "none",
                }}
              >
                {cfg.fallbackEmoji}
              </div>
            </div>
          );
        })}

        {floaters.map((f) => (
          <div
            key={f.id}
            style={{
              position: "absolute",
              left: f.x,
              top: f.y,
              transform: "translate(-50%, -50%)",
              fontWeight: 900,
              fontSize: f.kind === "golden" ? 24 : 18,
              color: f.kind === "golden" ? "#f2a900" : f.kind === "fast" ? "#ff6a3d" : "#5b2a9e",
              textShadow: "0 2px 4px rgba(0,0,0,0.3)",
              pointerEvents: "none",
              animation: "floatUpGallery 650ms ease-out forwards",
            }}
          >
            {f.text}
          </div>
        ))}

        {muzzle && (
          <div
            key={muzzle.id}
            style={{
              position: "absolute",
              left: muzzle.x,
              top: muzzle.y,
              width: 26,
              height: 26,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.85)",
              pointerEvents: "none",
              animation: "muzzlePulse 220ms ease-out forwards",
            }}
          />
        )}

        {crosshair && (
          <div
            style={{
              position: "absolute",
              left: crosshair.x,
              top: crosshair.y,
              width: 30,
              height: 30,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              borderRadius: "50%",
              border: "2px solid rgba(20,20,30,0.55)",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: -4,
                width: 2,
                height: 10,
                background: "rgba(20,20,30,0.55)",
                transform: "translateX(-50%)",
              }}
            />
          </div>
        )}

        {reloading && (
          <div
            style={{
              position: "absolute",
              bottom: 14,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(20,12,8,0.75)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              padding: "6px 14px",
              borderRadius: 999,
            }}
          >
            Nachladen…
          </div>
        )}
      </div>
      <p style={{ color: "#b7bade", fontSize: 12, textAlign: "center", maxWidth: 260 }}>
        Tippen/Klicken zum Schießen. Trifft die vorbeifliegenden Eddies — der goldene
        ist selten und bringt am meisten Punkte!
      </p>
      <style>{`
        @keyframes floatUpGallery {
          0% { opacity: 1; transform: translate(-50%, -50%) translateY(0); }
          100% { opacity: 0; transform: translate(-50%, -50%) translateY(-50px); }
        }
        @keyframes muzzlePulse {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(0.4); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.6); }
        }
      `}</style>
    </div>
  );
}
