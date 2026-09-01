// '#' wall, '.' dot, ' ' empty path, 'P' player start, 'E' enemy start
export const MAZE_LAYOUT = [
  "###############",
  "#......#......#",
  "#.###.#.#.###.#",
  "#.#.....#...#.#",
  "#.#.###.###.#.#",
  "#...#.....#...#",
  "###.#.#E#.#.###",
  "#...#.....#...#",
  "#.#.###.###.#.#",
  "#.#.....#...#.#",
  "#.###.#.#.###.#",
  "#......P......#",
  "###############",
];

export const COLS = MAZE_LAYOUT[0].length;
export const ROWS = MAZE_LAYOUT.length;

export function isWall(x: number, y: number): boolean {
  if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return true;
  return MAZE_LAYOUT[y][x] === "#";
}

export function findStart(char: "P" | "E"): [number, number] {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (MAZE_LAYOUT[y][x] === char) return [x, y];
    }
  }
  throw new Error(`start ${char} not found`);
}

export function initialDots(): boolean[][] {
  const dots: boolean[][] = [];
  for (let y = 0; y < ROWS; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < COLS; x++) {
      row.push(MAZE_LAYOUT[y][x] === "." || MAZE_LAYOUT[y][x] === "P");
    }
    dots.push(row);
  }
  return dots;
}

export function totalDots(): number {
  let n = 0;
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (MAZE_LAYOUT[y][x] === "." || MAZE_LAYOUT[y][x] === "P") n++;
  return n;
}

// BFS shortest path: returns the next step (dx, dy) for `from` to move toward `to`.
export function nextStepToward(
  from: [number, number],
  to: [number, number]
): [number, number] {
  const [fx, fy] = from;
  const [tx, ty] = to;
  if (fx === tx && fy === ty) return [0, 0];

  const key = (x: number, y: number) => `${x},${y}`;
  const visited = new Set<string>([key(fx, fy)]);
  const prev = new Map<string, [number, number]>();
  const queue: [number, number][] = [[fx, fy]];
  let head = 0;

  while (head < queue.length) {
    const [x, y] = queue[head++];
    if (x === tx && y === ty) break;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as [number, number][]) {
      const nx = x + dx;
      const ny = y + dy;
      if (isWall(nx, ny)) continue;
      const k = key(nx, ny);
      if (visited.has(k)) continue;
      visited.add(k);
      prev.set(k, [x, y]);
      queue.push([nx, ny]);
    }
  }

  if (!visited.has(key(tx, ty))) return [0, 0];

  let cur: [number, number] = [tx, ty];
  while (true) {
    const p = prev.get(key(cur[0], cur[1]));
    if (!p) break;
    if (p[0] === fx && p[1] === fy) {
      return [cur[0] - fx, cur[1] - fy];
    }
    cur = p;
  }
  return [0, 0];
}
