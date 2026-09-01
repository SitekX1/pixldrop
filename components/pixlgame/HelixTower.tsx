"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

const SEGMENTS = 8;
const SEGMENT_ANGLE = (Math.PI * 2) / SEGMENTS;
const LEVEL_HEIGHT = 1.6;
const TOWER_RADIUS = 3;
const SEGMENT_THICKNESS = 0.35;
const GAP_ANGLE = 0.08;
const GRAVITY = 16;
const BOUNCE_VELOCITY = 9;
const EDDIE_START_Y = 4;
const GENERATE_AHEAD = 25;
const GENERATE_BUFFER = 10;

type SegmentType = "gap" | "safe" | "danger";
type Level = { y: number; segments: SegmentType[] };

function makeLevel(index: number, y: number): Level {
  const segments: SegmentType[] = new Array(SEGMENTS).fill("safe");
  const difficulty = Math.min(index / 40, 1);

  const gapCount = 1 + Math.round(Math.random() * (1 - difficulty * 0.5));
  const dangerCount = Math.floor(difficulty * (1 + Math.random() * 2));

  const indices = Array.from({ length: SEGMENTS }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  let cursor = 0;
  for (let i = 0; i < gapCount && cursor < indices.length; i++, cursor++) {
    segments[indices[cursor]] = "gap";
  }
  for (let i = 0; i < dangerCount && cursor < indices.length; i++, cursor++) {
    segments[indices[cursor]] = "danger";
  }

  return { y, segments };
}

function generateLevels(startIndex: number, count: number): Level[] {
  const levels: Level[] = [];
  for (let i = 0; i < count; i++) {
    const idx = startIndex + i;
    levels.push(makeLevel(idx, -idx * LEVEL_HEIGHT));
  }
  return levels;
}

function SegmentMesh({ y, startAngle, type }: { y: number; startAngle: number; type: SegmentType }) {
  const color = type === "danger" ? "#ff4d4f" : "#5b2a9e";
  return (
    <mesh position={[0, y, 0]}>
      <cylinderGeometry
        args={[
          TOWER_RADIUS,
          TOWER_RADIUS,
          SEGMENT_THICKNESS,
          8,
          1,
          false,
          startAngle + GAP_ANGLE / 2,
          SEGMENT_ANGLE - GAP_ANGLE,
        ]}
      />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function EddieSprite({ yRef, texture }: { yRef: React.MutableRefObject<number>; texture: THREE.Texture }) {
  const ref = useRef<THREE.Sprite>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.set(TOWER_RADIUS, yRef.current, 0);
  });
  return (
    <sprite ref={ref} scale={[1.8, 1.8, 1.8]}>
      <spriteMaterial map={texture} transparent />
    </sprite>
  );
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

  const { camera } = useThree();

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
      const level = levelsRef.current[currentLevelIndex];
      if (level) {
        const localAngle =
          (((-rotationRef.current) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const segIndex = Math.floor(localAngle / SEGMENT_ANGLE) % SEGMENTS;
        const type = level.segments[segIndex];

        lastLevelCrossedRef.current = currentLevelIndex;

        if (type === "danger") {
          overRef.current = true;
          onGameOver(scoreRef.current);
          return;
        }
        if (type === "safe") {
          velocityRef.current = BOUNCE_VELOCITY;
        }
        scoreRef.current += 1;
        onScoreChange(scoreRef.current);
      }
    }

    camera.position.set(0, eddieYRef.current + 3.5, 7.5);
    camera.lookAt(0, eddieYRef.current - 1, 0);
  });

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[5, 10, 5]} intensity={0.9} />
      <group ref={towerGroupRef}>
        {levels.map((level, li) =>
          level.segments.map((type, si) => {
            if (type === "gap") return null;
            return (
              <SegmentMesh key={`${li}-${si}`} y={level.y} startAngle={si * SEGMENT_ANGLE} type={type} />
            );
          })
        )}
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
    rotationRef.current = dragState.current.startRotation + dx * 0.01;
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
          background: "#0b0c14",
          touchAction: "none",
          cursor: "grab",
        }}
      >
        <Canvas camera={{ fov: 55 }}>
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
        Zum Drehen des Turms ziehen (Maus/Finger) oder Pfeiltasten. Rot = Gefahr, lila =
        sicher, Lücke = durchfallen.
      </p>
    </div>
  );
}
