"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

const SEGMENTS = 8;
const SEGMENT_ANGLE = (Math.PI * 2) / SEGMENTS;
const LEVEL_HEIGHT = 1.6;
const INNER_RADIUS = 1;
const OUTER_RADIUS = 3;
const EDDIE_RADIUS = (INNER_RADIUS + OUTER_RADIUS) / 2;
const EDDIE_WORLD_ANGLE = Math.PI / 2; // Eddie sits toward +Z, facing the camera
const GAP_ANGLE = 0.06;
const GRAVITY = 16;
const BOUNCE_VELOCITY = 9;
const EDDIE_START_Y = 4;
const GENERATE_AHEAD = 25;
const GENERATE_BUFFER = 10;

const COLOR_SAFE = "#3a4a8a";
const COLOR_DANGER = "#e63946";
const COLOR_SPINE = "#171928";

type SegmentType = "gap" | "safe" | "danger";
type Level = { y: number; segments: SegmentType[] };

function makeLevel(index: number, y: number): Level {
  const segments: SegmentType[] = new Array(SEGMENTS).fill("safe");
  const difficulty = Math.min(index / 30, 1);

  const gapCount = 1 + Math.round(Math.random() * (1 - difficulty * 0.5));
  const dangerCount = index < 3 ? 0 : Math.max(1, Math.round(difficulty * (1 + Math.random() * 2)));

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
  const color = type === "danger" ? COLOR_DANGER : COLOR_SAFE;
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry
        args={[
          INNER_RADIUS,
          OUTER_RADIUS,
          16,
          1,
          startAngle + GAP_ANGLE / 2,
          SEGMENT_ANGLE - GAP_ANGLE,
        ]}
      />
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  );
}

function CenterSpine({ topY, bottomY }: { topY: number; bottomY: number }) {
  const height = topY - bottomY;
  return (
    <mesh position={[0, bottomY + height / 2, 0]}>
      <cylinderGeometry args={[0.22, 0.22, height, 12]} />
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
    scene.fog = new THREE.Fog("#0b0c14", 8, 22);
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
      const level = levelsRef.current[currentLevelIndex];
      if (level) {
        const localAngle =
          (((EDDIE_WORLD_ANGLE - rotationRef.current) % (Math.PI * 2)) + Math.PI * 2) %
          (Math.PI * 2);
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

    const eddieWorldX = Math.cos(EDDIE_WORLD_ANGLE) * EDDIE_RADIUS;
    const eddieWorldZ = Math.sin(EDDIE_WORLD_ANGLE) * EDDIE_RADIUS;
    camera.position.set(eddieWorldX * 1.4, eddieYRef.current + 2.2, eddieWorldZ * 1.4 + 5.5);
    camera.lookAt(0, eddieYRef.current - 1.2, 0);
  });

  const topY = levels[0]?.y ?? 0;
  const bottomY = levels[levels.length - 1]?.y ?? 0;

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 10, 6]} intensity={0.9} />
      <group ref={towerGroupRef}>
        <CenterSpine topY={topY + LEVEL_HEIGHT} bottomY={bottomY - LEVEL_HEIGHT} />
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
          background: "#0b0c14",
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
        Zum Drehen des Turms ziehen (Maus/Finger) oder Pfeiltasten. Rot = Gefahr, blau =
        sicher, Lücke = durchfallen.
      </p>
    </div>
  );
}
