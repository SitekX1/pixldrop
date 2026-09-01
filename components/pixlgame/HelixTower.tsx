"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

const LEVEL_HEIGHT = 1.6;
const PLATFORM_RADIUS = 2.2;
const COLUMN_RADIUS = 0.4;
const PLATFORM_THICKNESS = 0.4;
const MIN_GAP = Math.PI * 0.22; // ~40deg
const MAX_GAP = Math.PI * 0.55; // ~100deg
const EDDIE_RADIUS = 1.4;
const EDDIE_WORLD_ANGLE = Math.PI / 2; // Eddie sits toward +Z, facing the camera
const GRAVITY = 16;
const BOUNCE_VELOCITY = 9;
const EDDIE_START_Y = 4;
const GENERATE_AHEAD = 20;
const GENERATE_BUFFER = 8;

const SAFE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#06b6d4", "#a855f7"];
const COLOR_DANGER = "#ef4444";
const COLOR_SPINE = "#334155";
const COLOR_BG = "#dbeafe";

type Level = {
  y: number;
  gapStart: number;
  gapLength: number;
  isDanger: boolean;
  color: string;
};

function makeLevel(index: number, y: number): Level {
  const difficulty = Math.min(index / 25, 1);
  const gapLength = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
  const gapStart = Math.random() * Math.PI * 2;
  const dangerChance = index < 3 ? 0 : 0.15 + difficulty * 0.35;
  const isDanger = Math.random() < dangerChance;
  const color = SAFE_COLORS[Math.floor(Math.random() * SAFE_COLORS.length)];
  return { y, gapStart, gapLength, isDanger, color };
}

function generateLevels(startIndex: number, count: number): Level[] {
  const levels: Level[] = [];
  for (let i = 0; i < count; i++) {
    const idx = startIndex + i;
    levels.push(makeLevel(idx, -idx * LEVEL_HEIGHT));
  }
  return levels;
}

function PlatformMesh({ level }: { level: Level }) {
  // Solid arc covering everything EXCEPT the gap, starting right after it.
  const thetaStart = level.gapStart + level.gapLength;
  const thetaLength = Math.PI * 2 - level.gapLength;
  const color = level.isDanger ? COLOR_DANGER : level.color;
  return (
    <mesh position={[0, level.y, 0]}>
      <cylinderGeometry
        args={[PLATFORM_RADIUS, PLATFORM_RADIUS, PLATFORM_THICKNESS, 48, 1, false, thetaStart, thetaLength]}
      />
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  );
}

function CenterSpine({ topY, bottomY }: { topY: number; bottomY: number }) {
  const height = topY - bottomY;
  return (
    <mesh position={[0, bottomY + height / 2, 0]}>
      <cylinderGeometry args={[COLUMN_RADIUS, COLUMN_RADIUS, height, 16]} />
      <meshStandardMaterial color={COLOR_SPINE} />
    </mesh>
  );
}

function EddieSprite({ yRef, texture }: { yRef: React.MutableRefObject<number>; texture: THREE.Texture }) {
  const ref = useRef<THREE.Sprite>(null);
  useFrame(() => {
    if (ref.current) {
      ref.current.position.set(
        Math.cos(EDDIE_WORLD_ANGLE) * EDDIE_RADIUS,
        yRef.current,
        Math.sin(EDDIE_WORLD_ANGLE) * EDDIE_RADIUS
      );
    }
  });
  return (
    <sprite ref={ref} scale={[1.7, 1.7, 1.7]}>
      <spriteMaterial map={texture} transparent />
    </sprite>
  );
}

function normalizeAngle(a: number) {
  return ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

// Is `angle` inside the arc [start, start+length] (all mod 2*PI, wrapping-safe)?
function angleInArc(angle: number, start: number, length: number) {
  const a = normalizeAngle(angle - start);
  return a <= length;
}

function GameScene({
  rotationRef,
  texture,
  onGameOver,
  onScoreChange,
}: {
  rotationRef: React.MutableRefObject<number>;
  texture: THREE.Texture;
  onGameOver: (score: number) => void;
  onScoreChange: (score: number) => void;
}) {
  const [levels, setLevels] = useState<Level[]>(() => generateLevels(0, GENERATE_AHEAD));
  const nextIndexRef = useRef(GENERATE_AHEAD);
  const levelsRef = useRef(levels);
  levelsRef.current = levels;

  const towerGroupRef = useRef<THREE.Group>(null);
  const eddieYRef = useRef(EDDIE_START_Y);
  const velocityRef = useRef(0);
  const scoreRef = useRef(0);
  const lastLevelCrossedRef = useRef(-1);
  const overRef = useRef(false);

  const { camera, scene } = useThree();

  useEffect(() => {
    scene.background = new THREE.Color(COLOR_BG);
    scene.fog = new THREE.Fog(COLOR_BG, 9, 24);
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  useFrame((_, delta) => {
    if (overRef.current) return;
    const d = Math.min(delta, 0.033);

    velocityRef.current -= GRAVITY * d;
    eddieYRef.current += velocityRef.current * d;

    if (towerGroupRef.current) {
      towerGroupRef.current.rotation.y = rotationRef.current;
    }

    const lowestY = levelsRef.current[levelsRef.current.length - 1]?.y ?? 0;
    if (eddieYRef.current < lowestY + GENERATE_BUFFER * LEVEL_HEIGHT) {
      const more = generateLevels(nextIndexRef.current, GENERATE_AHEAD);
      nextIndexRef.current += GENERATE_AHEAD;
      setLevels((prev) => [...prev, ...more]);
    }

    const currentLevelIndex = Math.floor((0 - eddieYRef.current) / LEVEL_HEIGHT);
    if (currentLevelIndex > lastLevelCrossedRef.current) {
      // Process every level index between the last one we handled and the
      // current one, in order — at high fall speed a single frame can cross
      // more than one level, and skipping them silently is exactly what
      // made it feel like "falls straight through" for no reason.
      for (let li = lastLevelCrossedRef.current + 1; li <= currentLevelIndex; li++) {
        const level = levelsRef.current[li];
        if (!level) break;

        // CylinderGeometry's own theta convention is x=r*sin(theta), z=r*cos(theta)
        // (different from RingGeometry's x=r*cos, y=r*sin). Derived and
        // numerically verified: the local theta that ends up under Eddie
        // after the group's rotation.y is (PI/2 - EDDIE_WORLD_ANGLE) - rotation.
        const matchAngle = normalizeAngle(Math.PI / 2 - EDDIE_WORLD_ANGLE - rotationRef.current);
        const inGap = angleInArc(matchAngle, level.gapStart, level.gapLength);

        lastLevelCrossedRef.current = li;

        if (!inGap) {
          if (level.isDanger) {
            overRef.current = true;
            onGameOver(scoreRef.current);
            return;
          }
          velocityRef.current = BOUNCE_VELOCITY;
        }
        scoreRef.current += 1;
        onScoreChange(scoreRef.current);
      }
    }

    const eddieWorldX = Math.cos(EDDIE_WORLD_ANGLE) * EDDIE_RADIUS;
    const eddieWorldZ = Math.sin(EDDIE_WORLD_ANGLE) * EDDIE_RADIUS;
    camera.position.set(eddieWorldX * 1.2, eddieYRef.current + 6, eddieWorldZ * 1.2 + 10);
    camera.lookAt(0, eddieYRef.current - 3.5, 0);
  });

  const topY = levels[0]?.y ?? 0;
  const bottomY = levels[levels.length - 1]?.y ?? 0;

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 10, 6]} intensity={0.9} />
      <group ref={towerGroupRef}>
        <CenterSpine topY={topY + LEVEL_HEIGHT} bottomY={bottomY - LEVEL_HEIGHT} />
        {levels.map((level, li) => (
          <PlatformMesh key={li} level={level} />
        ))}
      </group>
      <EddieSprite yRef={eddieYRef} texture={texture} />
    </>
  );
}

function EddieTexture({ children }: { children: (t: THREE.Texture) => React.ReactNode }) {
  const texture = useLoader(THREE.TextureLoader, "/pixlgame-media/eddie-sprite.png");
  return <>{children(texture)}</>;
}

export default function HelixTower({
  onGameOver,
}: {
  onGameOver: (score: number) => void;
}) {
  const [score, setScore] = useState(0);
  const rotationRef = useRef(0);
  const dragState = useRef<{ startX: number; startRotation: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragState.current = { startX: e.clientX, startRotation: rotationRef.current };
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    rotationRef.current = dragState.current.startRotation + dx * 0.012;
  }, []);
  const onPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "a") rotationRef.current -= 0.15;
      if (e.key === "ArrowRight" || e.key === "d") rotationRef.current += 0.15;
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ fontSize: 14, color: "#fff", fontWeight: 700 }}>Etage: {score}</div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          width: 320,
          height: 460,
          borderRadius: 16,
          overflow: "hidden",
          background: "#dbeafe",
          touchAction: "none",
          cursor: "grab",
        }}
      >
        <Canvas camera={{ fov: 50 }}>
          <Suspense fallback={null}>
            <EddieTexture>
              {(texture) => (
                <GameScene
                  rotationRef={rotationRef}
                  texture={texture}
                  onGameOver={onGameOver}
                  onScoreChange={setScore}
                />
              )}
            </EddieTexture>
          </Suspense>
        </Canvas>
      </div>
      <p style={{ color: "#b7bade", fontSize: 12, textAlign: "center", maxWidth: 260 }}>
        Zum Drehen des Turms ziehen (Maus/Finger) oder Pfeiltasten. Rot = Gefahr, bunt =
        sicher, Lücke = durchfallen.
      </p>
    </div>
  );
}
