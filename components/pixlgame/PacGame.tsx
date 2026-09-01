"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  COLS,
  ROWS,
  isWall,
  findStart,
  initialDots,
  totalDots,
  nextStepToward,
} from "@/lib/pixlgame-maze";

const TICK_MS = 180;
const DOT_POINTS = 10;
const LEVEL_CLEAR_BONUS = 50;

type Dir = [number, number];
const DIRS: Record<string, Dir> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};

export default function PacGame({
  onGameOver,
}: {
  onGameOver: (score: number) => void;
}) {
  const [player, setPlayer] = useState<[number, number]>(() => findStart("P"));
  const [enemy, setEnemy] = useState<[number, number]>(() => findStart("E"));
  const [dots, setDots] = useState<boolean[][]>(() => initialDots());
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [remaining, setRemaining] = useState(totalDots());

  const dirRef = useRef<Dir>([0, 0]);
  const nextDirRef = useRef<Dir>([0, 0]);
  const playerRef = useRef(player);
  const enemyRef = useRef(enemy);
  const dotsRef = useRef(dots);
  const levelRef = useRef(level);
  const scoreRef = useRef(score);
  const remainingRef = useRef(remaining);
  const overRef = useRef(false);
  const tickCountRef = useRef(0);

  useEffect(() => {
    playerRef.current = player;
  }, [player]);
  useEffect(() => {
    enemyRef.current = enemy;
  }, [enemy]);
  useEffect(() => {
    dotsRef.current = dots;
  }, [dots]);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    remainingRef.current = remaining;
  }, [remaining]);

  const setDirection = useCallback((d: Dir) => {
    nextDirRef.current = d;
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const d = DIRS[e.key];
      if (d) {
        e.preventDefault();
        setDirection(d);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setDirection]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (overRef.current) return;
      tickCountRef.current += 1;

      const [px, py] = playerRef.current;
      const [ndx, ndy] = nextDirRef.current;
      let dir = dirRef.current;
      if (!isWall(px + ndx, py + ndy)) {
        dir = [ndx, ndy];
        dirRef.current = dir;
      }
      let newPx = px;
      let newPy = py;
      if (!isWall(px + dir[0], py + dir[1])) {
        newPx = px + dir[0];
        newPy = py + dir[1];
      }

      let scoreDelta = 0;
      let remainingDelta = 0;
      const dotsSnapshot = dotsRef.current;
      if (dotsSnapshot[newPy]?.[newPx]) {
        const copy = dotsSnapshot.map((row) => row.slice());
        copy[newPy][newPx] = false;
        dotsRef.current = copy;
        setDots(copy);
        scoreDelta += DOT_POINTS;
        remainingDelta -= 1;
      }

      if (newPx !== px || newPy !== py) {
        setPlayer([newPx, newPy]);
        playerRef.current = [newPx, newPy];
      }

      const enemyMoveEvery = Math.max(1, 3 - Math.floor((levelRef.current - 1) / 2));
      if (tickCountRef.current % enemyMoveEvery === 0) {
        const [ex, ey] = enemyRef.current;
        const [sdx, sdy] = nextStepToward([ex, ey], playerRef.current);
        const newEx = ex + sdx;
        const newEy = ey + sdy;
        setEnemy([newEx, newEy]);
        enemyRef.current = [newEx, newEy];
      }

      const [fpx, fpy] = playerRef.current;
      const [fex, fey] = enemyRef.current;
      if (fpx === fex && fpy === fey) {
        overRef.current = true;
        onGameOver(scoreRef.current + scoreDelta);
        return;
      }

      if (scoreDelta !== 0) {
        setScore((s) => {
          const next = s + scoreDelta;
          scoreRef.current = next;
          return next;
        });
      }
      if (remainingDelta !== 0) {
        setRemaining((r) => {
          const next = r + remainingDelta;
          remainingRef.current = next;
          if (next <= 0) {
            const bonus = LEVEL_CLEAR_BONUS * levelRef.current;
            setScore((s) => {
              const withBonus = s + bonus;
              scoreRef.current = withBonus;
              return withBonus;
            });
            const freshDots = initialDots();
            dotsRef.current = freshDots;
            setDots(freshDots);
            setLevel((l) => {
              const nl = l + 1;
              levelRef.current = nl;
              return nl;
            });
            const startP = findStart("P");
            const startE = findStart("E");
            playerRef.current = startP;
            enemyRef.current = startE;
            setPlayer(startP);
            setEnemy(startE);
            dirRef.current = [0, 0];
            nextDirRef.current = [0, 0];
            return totalDots();
          }
          return next;
        });
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [onGameOver]);

  const cellSize = 24;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", gap: 16, fontSize: 14, color: "#fff", fontWeight: 700 }}>
        <span>Punkte: {score}</span>
        <span>Runde: {level}</span>
      </div>

      <div
        style={{
          position: "relative",
          width: COLS * cellSize,
          height: ROWS * cellSize,
          background: "#0b0c14",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {Array.from({ length: ROWS }).map((_, y) =>
          Array.from({ length: COLS }).map((_, x) => {
            const wall = isWall(x, y);
            return (
              <div
                key={`${x}-${y}`}
                style={{
                  position: "absolute",
                  left: x * cellSize,
                  top: y * cellSize,
                  width: cellSize,
                  height: cellSize,
                  background: wall ? "#171928" : "transparent",
                }}
              >
                {!wall && dots[y]?.[x] && (
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "#8fe6f7",
                      position: "absolute",
                      left: cellSize / 2 - 2.5,
                      top: cellSize / 2 - 2.5,
                    }}
                  />
                )}
              </div>
            );
          })
        )}

        <div
          style={{
            position: "absolute",
            left: player[0] * cellSize + 2,
            top: player[1] * cellSize + 2,
            width: cellSize - 4,
            height: cellSize - 4,
            borderRadius: "50%",
            background: "#f2542d",
            transition: `left ${TICK_MS}ms linear, top ${TICK_MS}ms linear`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
          }}
        >
          🐾
        </div>

        <div
          style={{
            position: "absolute",
            left: enemy[0] * cellSize + 2,
            top: enemy[1] * cellSize + 2,
            width: cellSize - 4,
            height: cellSize - 4,
            borderRadius: "50%",
            background: "#5b2a9e",
            transition: `left ${TICK_MS}ms linear, top ${TICK_MS}ms linear`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
          }}
        >
          😠
        </div>
      </div>

      <DPad onDirection={setDirection} />
    </div>
  );
}

function DPad({ onDirection }: { onDirection: (d: Dir) => void }) {
  const btn: React.CSSProperties = {
    width: 52,
    height: 52,
    borderRadius: 12,
    border: "none",
    background: "#171928",
    color: "#fff",
    fontSize: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 52px)", gap: 6 }}>
      <div />
      <button style={btn} onClick={() => onDirection([0, -1])} aria-label="Hoch">
        ↑
      </button>
      <div />
      <button style={btn} onClick={() => onDirection([-1, 0])} aria-label="Links">
        ←
      </button>
      <div />
      <button style={btn} onClick={() => onDirection([1, 0])} aria-label="Rechts">
        →
      </button>
      <div />
      <button style={btn} onClick={() => onDirection([0, 1])} aria-label="Runter">
        ↓
      </button>
      <div />
    </div>
  );
}
