import test from "node:test";
import assert from "node:assert/strict";
import { abbilden, homographie, matrix3d, type Punkt } from "@/lib/shop/homographie";

test("Homographie bildet die vier Eckpunkte exakt ab", () => {
  const src: Punkt[] = [[12, 0], [186, 0], [0, 48], [188, 48]];
  const dst: Punkt[] = [[174, 394.6], [915, 395], [141.5, 593], [909, 591]];
  const H = homographie(src, dst);
  src.forEach((p, i) => {
    const [x, y] = abbilden(H, p);
    assert.ok(Math.abs(x - dst[i][0]) < 1e-6 && Math.abs(y - dst[i][1]) < 1e-6, `Punkt ${i}`);
  });
});

test("Identitaet bleibt Identitaet, matrix3d skaliert nur x/y", () => {
  const q: Punkt[] = [[0, 0], [10, 0], [0, 10], [10, 10]];
  const H = homographie(q, q);
  const [x, y] = abbilden(H, [3, 7]);
  assert.ok(Math.abs(x - 3) < 1e-9 && Math.abs(y - 7) < 1e-9);
  assert.equal(matrix3d(H, 0.5).startsWith("matrix3d(0.5,0,0,0,0,0.5,0,0,0,0,1,0,0,0,0,1"), true);
});
