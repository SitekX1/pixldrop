"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VIEWPORT_W = 380;
const VIEWPORT_H = 760;
const TICK_MS = 16;

const CLIP_SIZE = 5;
const RELOAD_MS = 550;

const TIME_START = 30;
const TIME_CAP = 60;
const TIME_CLOCK_BONUS = 5;
const LIVES_START = 3;
const BOOST_SECONDS = 6;
const LIFE_BONUS_PER_LIFE = 50;

const RUSH_START_SECONDS = 30;
const RUSH_SPEED_MULT = 1.8;
const RUSH_SPAWN_CAP = 8;
const RUSH_SPAWN_MS = [220, 420] as [number, number];
const RUSH_POINT_MULT = 2;
const RUSH_BANNER_MS = 1800;
const RUSH_PENALTY_WEIGHT_MULT = 4.5;
const RUSH_OTHER_WEIGHT_MULT = 1.6;
const RUSH_CLOCK_WEIGHT_MULT = 0.3;
const RUSH_FLASH_MS = 700;

const IMG_SRC: Record<KindKey, string> = {
  cup: "/pixlgame-media/coffee-cup.png",
  bean: "/pixlgame-media/coffee-bean.png",
  golden: "/pixlgame-media/coffee-golden.png",
  clock: "/pixlgame-media/coffee-clock.png",
  muffin: "/pixlgame-media/coffee-muffin.png",
  eddie: "/pixlgame-media/eddie-iso.png",
  wasp: "/pixlgame-media/wasp.png",
};

const KINDS = {
  cup: {
    role: "score" as const,
    size: 60,
    speed: [70, 100] as [number, number],
    bob: 10,
    points: 10,
  },
  bean: {
    role: "score" as const,
    size: 34,
    speed: [150, 200] as [number, number],
    bob: 20,
    points: 25,
  },
  golden: {
    role: "score" as const,
    size: 40,
    speed: [200, 250] as [number, number],
    bob: 26,
    points: 100,
  },
  clock: {
    role: "time" as const,
    size: 50,
    speed: [90, 130] as [number, number],
    bob: 12,
    points: 0,
  },
  muffin: {
    role: "boost" as const,
    size: 46,
    speed: [90, 130] as [number, number],
    bob: 14,
    points: 0,
  },
  eddie: {
    role: "penalty" as const,
    size: 48,
    speed: [130, 190] as [number, number],
    bob: 0,
    points: 0,
  },
  wasp: {
    role: "penalty" as const,
    size: 32,
    speed: [160, 220] as [number, number],
    bob: 24,
    points: 0,
  },
};

const WEIGHTS: Record<KindKey, number> = {
  cup: 50,
  bean: 25,
  golden: 6,
  clock: 10,
  muffin: 8,
  eddie: 14,
  wasp: 14,
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

type Floater = { id: number; x: number; y: number; text: string; color: string };

function pickWeightedKind(rush: boolean): KindKey {
  const entries = (Object.entries(WEIGHTS) as [KindKey, number][]).map(([key, w]) => {
    if (!rush) return [key, w] as [KindKey, number];
    const role = KINDS[key].role;
    const mult =
      role === "penalty" ? RUSH_PENALTY_WEIGHT_MULT : role === "time" ? RUSH_CLOCK_WEIGHT_MULT : RUSH_OTHER_WEIGHT_MULT;
    return [key, w * mult] as [KindKey, number];
  });
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return "cup";
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function TargetVisual({ kind }: { kind: KindKey }) {
  switch (kind) {
    case "cup":
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <ellipse cx="26" cy="46" rx="20" ry="6" fill="#d8c3a5" />
          <path d="M8 22h36v20a18 18 0 0 1-18 18A18 18 0 0 1 8 42z" fill="#f5ead9" stroke="#8a5a34" strokeWidth="2" />
          <path d="M44 26h6a8 8 0 0 1 0 16h-6" fill="none" stroke="#8a5a34" strokeWidth="3" />
          <path d="M14 22c8-10 22-10 30 0" fill="#6b4226" />
          <path d="M18 12c1-3 4-3 4-6M28 12c1-3 4-3 4-6" stroke="#c9b6a3" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "bean":
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <path
            d="M32 4C16 4 6 20 6 34c0 16 12 26 26 26s26-10 26-26C58 20 48 4 32 4z"
            fill="#6b4226"
          />
          <path
            d="M32 8c-9 6-11 20-11 26 0 10 5 18 11 22 6-4 11-12 11-22 0-6-2-20-11-26z"
            fill="#8a5a34"
          />
          <path d="M32 10c-3 8-3 36 0 44" stroke="#3f2716" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "golden":
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <ellipse cx="26" cy="46" rx="20" ry="6" fill="#e7c25a" />
          <path
            d="M8 22h36v20a18 18 0 0 1-18 18A18 18 0 0 1 8 42z"
            fill="#fff3d6"
            stroke="#c9971f"
            strokeWidth="2"
          />
          <path d="M44 26h6a8 8 0 0 1 0 16h-6" fill="none" stroke="#c9971f" strokeWidth="3" />
          <path d="M14 22c8-10 22-10 30 0" fill="#e7c25a" />
          <g fill="#fff3d6">
            <path d="M50 8l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
            <path d="M12 46l1.4 2.8L16 50l-2.6 1.2L12 54l-1.4-2.8L8 50l2.6-1.2z" />
          </g>
        </svg>
      );
    case "clock":
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <circle cx="32" cy="34" r="22" fill="#f5ead9" stroke="#2fc2e8" strokeWidth="3" />
          <path d="M20 8l6 6M44 8l-6 6" stroke="#2fc2e8" strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="34" r="2.4" fill="#1b2a6b" />
          <path d="M32 34V20M32 34l10 6" stroke="#1b2a6b" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case "muffin":
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <path d="M12 32l4 24a4 4 0 0 0 4 4h24a4 4 0 0 0 4-4l4-24z" fill="#7b4fc4" />
          <path d="M12 32c0-6 6-8 10-6-2-6 4-10 10-8 4-6 14-4 14 4 6-2 10 4 6 10z" fill="#5b2a9e" />
          <circle cx="24" cy="20" r="2.4" fill="#fff3d6" />
          <circle cx="34" cy="16" r="2.4" fill="#fff3d6" />
          <circle cx="42" cy="24" r="2.4" fill="#fff3d6" />
        </svg>
      );
    case "wasp":
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <ellipse cx="20" cy="30" rx="16" ry="10" fill="#e5e0d0" opacity="0.7" />
          <ellipse cx="44" cy="30" rx="16" ry="10" fill="#e5e0d0" opacity="0.7" />
          <ellipse cx="32" cy="32" rx="10" ry="7" fill="#1a1a1a" />
          <path d="M24 27h16M25 32h14M26 37h12" stroke="#f2c94c" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="32" cy="24" r="5" fill="#1a1a1a" />
        </svg>
      );
    default:
      return null;
  }
}

// Alle Ziele (inkl. Eddie, seit sein Foto ebenfalls freigestellt ist) sind
// transparente Fotos, die frei mit Schlagschatten schweben, ohne Rahmen/Ring.
// Fällt auf die SVG-Form zurück, falls ein Bild mal nicht lädt.
function TargetSprite({ kind, size }: { kind: KindKey; size: number }) {
  const isEddie = kind === "eddie";
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <img
        src={IMG_SRC[kind]}
        alt=""
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
          const fb = (e.target as HTMLImageElement).nextSibling as HTMLElement | null;
          if (fb) fb.style.display = "flex";
        }}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
      <div
        style={{
          display: "none",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          position: "absolute",
          inset: 0,
          fontSize: size * 0.6,
          background: isEddie ? "radial-gradient(circle, #ffd9a0, #e0433c)" : "transparent",
        }}
      >
        {isEddie ? "🐾" : <TargetVisual kind={kind} />}
      </div>
    </div>
  );
}

export default function ShootingGallery({
  onGameOver,
}: {
  onGameOver: (total: number, base: number, bonus: number) => void;
}) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES_START);
  const [timeLeft, setTimeLeft] = useState(TIME_START);
  const [clipLeft, setClipLeft] = useState(CLIP_SIZE);
  const [reloading, setReloading] = useState(false);
  const [boostActive, setBoostActive] = useState(false);
  const [boostFrac, setBoostFrac] = useState(0);
  const [rushActive, setRushActive] = useState(false);
  const [showRushBanner, setShowRushBanner] = useState(false);
  const [rushFlash, setRushFlash] = useState(false);
  const [flash, setFlash] = useState(false);
  const [crosshair, setCrosshair] = useState<{ x: number; y: number } | null>(null);
  const [muzzle, setMuzzle] = useState<{ x: number; y: number; id: number } | null>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [scale, setScale] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const reloadClusterRef = useRef<HTMLDivElement>(null);
  const topHeaderRef = useRef<HTMLDivElement>(null);
  const bottomExclusionRef = useRef(150);
  const topExclusionRef = useRef(100);
  const targetsRef = useRef<Target[]>([]);
  const overRef = useRef(false);
  const scoreRef = useRef(0);
  const livesRef = useRef(LIVES_START);
  const timeLeftRef = useRef(TIME_START);
  const clipRef = useRef(CLIP_SIZE);
  const reloadingRef = useRef(false);
  const boostUntilRef = useRef(0);
  const rushActiveRef = useRef(false);
  const nextIdRef = useRef(1);
  const spawnTimerRef = useRef(600);
  const elapsedRef = useRef(0);

  const spawnTarget = useCallback(() => {
    const kind = pickWeightedKind(rushActiveRef.current);
    const cfg = KINDS[kind];
    const fromLeft = Math.random() < 0.5;
    const speedMult = rushActiveRef.current ? RUSH_SPEED_MULT : 1;
    const speed = rand(cfg.speed[0], cfg.speed[1]) * speedMult * (fromLeft ? 1 : -1);
    const baseY = rand(topExclusionRef.current, VIEWPORT_H - bottomExclusionRef.current);
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

  const endGame = useCallback(() => {
    if (overRef.current) return;
    overRef.current = true;
    const bonus = livesRef.current > 0 ? livesRef.current * LIFE_BONUS_PER_LIFE : 0;
    onGameOver(scoreRef.current + bonus, scoreRef.current, bonus);
  }, [onGameOver]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (overRef.current) return;
      const dt = TICK_MS / 1000;
      elapsedRef.current += dt;

      const newTime = Math.max(0, timeLeftRef.current - dt);
      if (Math.ceil(newTime) !== Math.ceil(timeLeftRef.current)) setTimeLeft(Math.ceil(newTime));
      timeLeftRef.current = newTime;

      const boostNow = elapsedRef.current < boostUntilRef.current;
      setBoostActive((prev) => (prev !== boostNow ? boostNow : prev));
      setBoostFrac(boostNow ? Math.max(0, (boostUntilRef.current - elapsedRef.current) / BOOST_SECONDS) : 0);

      if (!rushActiveRef.current && elapsedRef.current >= RUSH_START_SECONDS) {
        rushActiveRef.current = true;
        setRushActive(true);
        clipRef.current = CLIP_SIZE;
        setClipLeft(CLIP_SIZE);
        setRushFlash(true);
        setTimeout(() => setRushFlash(false), RUSH_FLASH_MS);
        setShowRushBanner(true);
        setTimeout(() => setShowRushBanner(false), RUSH_BANNER_MS);
      }

      spawnTimerRef.current -= TICK_MS;
      const spawnCap = rushActiveRef.current ? RUSH_SPAWN_CAP : 3;
      if (spawnTimerRef.current <= 0 && targetsRef.current.length < spawnCap) {
        spawnTarget();
        spawnTimerRef.current = rushActiveRef.current ? rand(RUSH_SPAWN_MS[0], RUSH_SPAWN_MS[1]) : rand(500, 950);
      }

      const survived: Target[] = [];
      for (const t of targetsRef.current) {
        if (t.hit) continue;
        const nx = t.x + t.speed * dt;
        const ny = t.bob > 0 ? t.baseY + Math.sin(t.phase + elapsedRef.current * 3) * t.bob : t.baseY;
        if (nx < -t.size - 10 || nx > VIEWPORT_W + t.size + 10) continue;
        survived.push({ ...t, x: nx, y: ny });
      }
      targetsRef.current = survived;
      setTargets(survived);

      if (newTime <= 0) endGame();
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [spawnTarget, endGame]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      // "cover"-Fit statt "contain": das Spielfeld soll den Bildschirm wirklich
      // komplett füllen (links-rechts UND oben-unten), notfalls mit minimalem
      // Beschnitt an einer Kante, statt Lücken zu lassen.
      const nextScale = w > 0 && h > 0 ? Math.max(w / VIEWPORT_W, h / VIEWPORT_H) : 1;
      setScale(nextScale);

      // Der Reload-Cluster liegt außerhalb des skalierten Canvas in echten
      // Bildschirm-Pixeln (safe-area-aware, siehe unten). Wie weit er auf DIESEM
      // Gerät tatsächlich vom unteren Rand absteht, messen wir direkt statt es
      // zu erraten — daraus ergibt sich die logische Sperrzone für Spawns.
      const cluster = reloadClusterRef.current;
      if (cluster && nextScale > 0) {
        const containerBottom = el.getBoundingClientRect().bottom;
        const clusterTop = cluster.getBoundingClientRect().top;
        const realGap = Math.max(0, containerBottom - clusterTop);
        bottomExclusionRef.current = realGap / nextScale + 40; // +40 = Bob-Puffer
      }

      const header = topHeaderRef.current;
      if (header && nextScale > 0) {
        const containerTop = el.getBoundingClientRect().top;
        const headerBottom = header.getBoundingClientRect().bottom;
        const realGap = Math.max(0, headerBottom - containerTop);
        topExclusionRef.current = realGap / nextScale + 20; // +20 = kleiner Puffer
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const addFloater = useCallback((x: number, y: number, text: string, color: string) => {
    const id = nextIdRef.current++;
    setFloaters((prev) => [...prev, { id, x, y, text, color }]);
    setTimeout(() => setFloaters((prev) => prev.filter((f) => f.id !== id)), 650);
  }, []);

  const reload = useCallback(() => {
    if (overRef.current || reloadingRef.current || clipRef.current >= CLIP_SIZE) return;
    reloadingRef.current = true;
    setReloading(true);
    setTimeout(() => {
      clipRef.current = CLIP_SIZE;
      reloadingRef.current = false;
      setClipLeft(CLIP_SIZE);
      setReloading(false);
    }, RELOAD_MS);
  }, []);

  const fire = useCallback(
    (clientX: number, clientY: number, rect: DOMRect) => {
      if (overRef.current || reloadingRef.current || (!rushActiveRef.current && clipRef.current <= 0)) return;

      // rect reflects the on-screen (scaled) size; normalize back to the fixed
      // logical VIEWPORT_W x VIEWPORT_H coordinate space the game simulates in.
      const x = ((clientX - rect.left) / rect.width) * VIEWPORT_W;
      const y = ((clientY - rect.top) / rect.height) * VIEWPORT_H;

      // Im Rush-Modus unbegrenzte Munition — Magazin bleibt sichtbar voll,
      // Nachladen wird dadurch automatisch überflüssig (Button ist disabled).
      if (!rushActiveRef.current) {
        clipRef.current -= 1;
        setClipLeft(clipRef.current);
      }
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
        const kind = hitTarget.kind;
        const cfg = KINDS[kind];
        hitTarget.hit = true;
        targetsRef.current = targetsRef.current.filter((t) => t.id !== hitTarget!.id);
        setTargets(targetsRef.current);

        if (cfg.role === "penalty") {
          livesRef.current -= 1;
          setLives(livesRef.current);
          addFloater(hitTarget.x, hitTarget.y, "-1 Leben", "#e0433c");
          setFlash(true);
          setTimeout(() => setFlash(false), 220);
          if (livesRef.current <= 0) {
            setTimeout(() => endGame(), 250);
          }
        } else if (cfg.role === "time") {
          timeLeftRef.current = Math.min(TIME_CAP, timeLeftRef.current + TIME_CLOCK_BONUS);
          setTimeLeft(Math.ceil(timeLeftRef.current));
          addFloater(hitTarget.x, hitTarget.y, `+${TIME_CLOCK_BONUS}s`, "#2fc2e8");
        } else if (cfg.role === "boost") {
          boostUntilRef.current = elapsedRef.current + BOOST_SECONDS;
          setBoostActive(true);
          addFloater(hitTarget.x, hitTarget.y, "Boost x2!", "#7b4fc4");
        } else {
          const boosted = elapsedRef.current < boostUntilRef.current;
          const mult = (boosted ? 2 : 1) * (rushActiveRef.current ? RUSH_POINT_MULT : 1);
          const gained = cfg.points * mult;
          scoreRef.current += gained;
          setScore(scoreRef.current);
          addFloater(
            hitTarget.x,
            hitTarget.y,
            `+${gained}${mult > 1 ? ` x${mult}` : ""}`,
            mult > 1 ? "#7b4fc4" : "#1b2a6b"
          );
        }
      }
    },
    [addFloater, endGame]
  );

  const timeFrac = Math.max(0, Math.min(1, timeLeft / TIME_CAP));

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      <div
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setCrosshair({
            x: ((e.clientX - rect.left) / rect.width) * VIEWPORT_W,
            y: ((e.clientY - rect.top) / rect.height) * VIEWPORT_H,
          });
        }}
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          fire(e.clientX, e.clientY, rect);
        }}
        onPointerLeave={() => setCrosshair(null)}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: VIEWPORT_W,
          height: VIEWPORT_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
          background: "linear-gradient(180deg, #fbeedd 0%, #f3d9b8 45%, #7a5236 100%)",
          touchAction: "none",
          cursor: "none",
          userSelect: "none",
        }}
      >
        {/* Deko: Café-Lichter + Theke, bis ein echtes Hintergrundbild da ist */}
        <div style={{ position: "absolute", top: 18, left: 30, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,235,190,0.55)", filter: "blur(6px)" }} />
        <div style={{ position: "absolute", top: 34, right: 46, width: 30, height: 30, borderRadius: "50%", background: "rgba(255,235,190,0.45)", filter: "blur(6px)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 86, height: 3, background: "rgba(90,58,32,0.35)" }} />

        {/* Dezente Muster-Textur (Kaffeebohnen/Tassen-Umrisse), bis ein echtes Hintergrundbild da ist */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.07,
            mixBlendMode: "multiply",
            pointerEvents: "none",
            backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
              `<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72'>
                <ellipse cx='16' cy='16' rx='9' ry='11' fill='none' stroke='%235a3a1e' stroke-width='2'/>
                <path d='M16 8v16' stroke='%235a3a1e' stroke-width='1.4'/>
                <circle cx='54' cy='50' r='10' fill='none' stroke='%235a3a1e' stroke-width='2'/>
                <path d='M46 44c4-4 12-4 16 0' fill='none' stroke='%235a3a1e' stroke-width='1.6'/>
              </svg>`
            )}")`,
            backgroundSize: "72px 72px",
          }}
        />

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
            pointerEvents: "none",
          }}
        />

        {targets.map((t) => (
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
              filter: t.kind === "golden" ? "drop-shadow(0 0 10px rgba(231,194,90,0.85))" : undefined,
            }}
          >
            <TargetSprite kind={t.kind} size={t.size} />
          </div>
        ))}

        {floaters.map((f) => (
          <div
            key={f.id}
            style={{
              position: "absolute",
              left: f.x,
              top: f.y,
              transform: "translate(-50%, -50%)",
              fontWeight: 900,
              fontSize: 18,
              color: f.color,
              textShadow: "0 2px 4px rgba(0,0,0,0.25)",
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
              border: "2px solid rgba(27,42,107,0.55)",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: -4,
                width: 2,
                height: 10,
                background: "rgba(27,42,107,0.55)",
                transform: "translateX(-50%)",
              }}
            />
          </div>
        )}

        {flash && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(224,67,60,0.35)",
              pointerEvents: "none",
            }}
          />
        )}

        {rushFlash && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle, rgba(255,179,71,0.9), rgba(224,67,60,0.75))",
              pointerEvents: "none",
              animation: `rushFlashFade ${RUSH_FLASH_MS}ms ease-out forwards`,
            }}
          />
        )}

      </div>

      {/* Kopfzeile, Leben-Badge und Reload-Cluster liegen bewusst AUSSERHALB des
          skalierten Canvas-Divs, in echten Bildschirm-Pixeln — sonst würde
          env(safe-area-inset-*) durch das transform:scale() falsch mitskaliert und
          iOS Safaris Status-/Toolbar könnte sie trotzdem überlappen.
          Fester 54px-Mindestabstand (statt nur 12px) als Fallback: auf manchen
          Geräten/Browserkontexten (z.B. Dynamic-Island-iPhones in Safaris
          Minimal-UI-Scrollzustand) liefert env(safe-area-inset-top) trotz
          viewport-fit:cover einen zu kleinen oder gar keinen Wert — dann muss
          dieser feste Boden allein reichen, um unter der Kamera-Insel zu bleiben. */}
      <div
        ref={topHeaderRef}
        style={{
          position: "absolute",
          top: "max(54px, calc(env(safe-area-inset-top) + 12px))",
          left: 16,
          right: 16,
          display: "flex",
          flexDirection: "column",
          gap: 7,
        }}
      >
        <MiniBar
          icon={rushActive ? "🔥" : "⏱"}
          frac={timeFrac}
          fillGradient={rushActive ? "linear-gradient(90deg, #ffb347, #e0433c)" : "linear-gradient(90deg, #8fe6f7, #2fc2e8)"}
        />
        <MiniBar icon="⚡" frac={boostFrac} fillGradient="linear-gradient(90deg, #2fc2e8, #7b4fc4)" />
        <Badge style={{ position: "static", alignSelf: "flex-start", marginTop: 4 }} icon="☕" value={score} />
      </div>

      <Badge style={{ bottom: 10, left: 10 }} icon="❤️" value={lives} urgent={lives <= 1} />

      {showRushBanner && (
        <div
          style={{
            position: "absolute",
            top: "38%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "linear-gradient(90deg, #ffb347, #e0433c)",
            color: "#fff",
            fontWeight: 900,
            fontSize: 26,
            padding: "10px 26px",
            borderRadius: 16,
            boxShadow: "0 8px 24px rgba(224,67,60,0.5)",
            pointerEvents: "none",
            animation: `rushPop ${RUSH_BANNER_MS}ms ease-out forwards`,
            whiteSpace: "nowrap",
          }}
        >
          🔥 RUSH! 2X PUNKTE
        </div>
      )}

      <div
        ref={reloadClusterRef}
        style={{
          position: "absolute",
          bottom: "max(16px, calc(env(safe-area-inset-bottom) + 12px))",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            background: "rgba(27,42,107,0.85)",
            padding: "8px 14px",
            borderRadius: 999,
          }}
        >
          {Array.from({ length: CLIP_SIZE }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: i < clipLeft ? "#2fc2e8" : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
        <button
          onClick={reload}
          disabled={reloading || clipLeft >= CLIP_SIZE}
          style={{
            background: reloading ? "rgba(27,42,107,0.5)" : "var(--gradient)",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "14px 28px",
            fontWeight: 800,
            fontSize: 15,
            boxShadow: "0 6px 16px rgba(27,42,107,0.35)",
            cursor: clipLeft >= CLIP_SIZE ? "default" : "pointer",
            opacity: clipLeft >= CLIP_SIZE ? 0.55 : 1,
          }}
        >
          {reloading ? "Lädt…" : "🔄 Nachladen"}
        </button>
      </div>

      <style>{`
        @keyframes floatUpGallery {
          0% { opacity: 1; transform: translate(-50%, -50%) translateY(0); }
          100% { opacity: 0; transform: translate(-50%, -50%) translateY(-50px); }
        }
        @keyframes muzzlePulse {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(0.4); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.6); }
        }
        @keyframes rushPop {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
          15% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
          25% { transform: translate(-50%, -50%) scale(1); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes rushFlashFade {
          0% { opacity: 1; }
          20% { opacity: 0.9; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// Dicke Balken in der Kopfzeile (Zeit oben, Booster darunter) — dieser Bereich
// ist bewusst frei von Zielen (siehe Spawn-baseY-Mindestwert).
function MiniBar({ icon, frac, fillGradient }: { icon: string; frac: number; fillGradient: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 14, width: 16, textAlign: "center", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}>{icon}</span>
      <div
        style={{
          flex: 1,
          height: 14,
          borderRadius: 999,
          background: "rgba(27,42,107,0.4)",
          boxShadow: "inset 0 0 4px rgba(0,0,0,0.2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(1, frac)) * 100}%`,
            height: "100%",
            background: fillGradient,
            transition: "width 150ms linear",
          }}
        />
      </div>
    </div>
  );
}

function Badge({
  icon,
  value,
  style,
  urgent,
}: {
  icon: string;
  value: number;
  style: React.CSSProperties;
  urgent?: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: urgent ? "#e0433c" : "rgba(27,42,107,0.85)",
        color: "#fff",
        fontWeight: 800,
        fontSize: 13,
        padding: "6px 12px",
        borderRadius: 999,
        boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
        ...style,
      }}
    >
      <span>{icon}</span>
      <span>{value}</span>
    </div>
  );
}
