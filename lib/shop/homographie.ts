// Perspektivische Abbildung (Homographie) für das Namensschild-Foto: Text in Schild-Koordinaten (mm)
// wird per CSS matrix3d auf die Platte im Foto gelegt.
export type Punkt = [number, number];

/** 3x3-Matrix (zeilenweise, h33 = 1), die die vier Punkte src auf dst abbildet. */
export function homographie(src: Punkt[], dst: Punkt[]): number[] {
  if (src.length !== 4 || dst.length !== 4) throw new Error("vier Punktpaare nötig");
  // 8 Gleichungen, 8 Unbekannte (h11..h32)
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-12) throw new Error("Punkte entartet");
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
    }
  }
  const h = A.map((row, i) => row[8] / row[i]);
  return [...h, 1];
}

export function abbilden(H: number[], [x, y]: Punkt): Punkt {
  const w = H[6] * x + H[7] * y + H[8];
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
}

/** CSS-matrix3d (spaltenweise) für H, zusätzlich um den Faktor s skaliert (Foto 1100 px -> Anzeigegröße). */
export function matrix3d(H: number[], s: number): string {
  const [a, b, c, d, e, f, g, h, i] = H;
  const m = [a * s, d * s, 0, g, b * s, e * s, 0, h, 0, 0, 1, 0, c * s, f * s, 0, i];
  return `matrix3d(${m.map((v) => +v.toFixed(8)).join(",")})`;
}
