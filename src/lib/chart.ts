/** Geometría de los gráficos de línea propios (sin librería): curva suave, marcas del eje y etiquetas. */

export type Point = [number, number];

/**
 * Curva suave que no inventa picos ni valles entre registros (interpolación monótona de Fritsch–Carlson,
 * la misma idea que «monotone» en las librerías de gráficos).
 */
export function monotonePath(points: Point[]) {
  const n = points.length;
  if (n === 0) return "";
  const fmt = (value: number) => Math.round(value * 100) / 100;
  if (n === 1) return `M${fmt(points[0][0])},${fmt(points[0][1])}`;
  if (n === 2) return `M${fmt(points[0][0])},${fmt(points[0][1])}L${fmt(points[1][0])},${fmt(points[1][1])}`;
  const slopes = points.slice(0, -1).map(([x, y], index) => {
    const [nx, ny] = points[index + 1];
    return nx === x ? 0 : (ny - y) / (nx - x);
  });
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0];
    if (index === n - 1) return slopes[n - 2];
    const before = slopes[index - 1];
    const after = slopes[index];
    return before * after <= 0 ? 0 : (before + after) / 2;
  });
  for (let index = 0; index < n - 1; index += 1) {
    const slope = slopes[index];
    if (slope === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      continue;
    }
    const a = tangents[index] / slope;
    const b = tangents[index + 1] / slope;
    const sum = a * a + b * b;
    if (sum > 9) {
      const tau = 3 / Math.sqrt(sum);
      tangents[index] = tau * a * slope;
      tangents[index + 1] = tau * b * slope;
    }
  }
  let path = `M${fmt(points[0][0])},${fmt(points[0][1])}`;
  for (let index = 0; index < n - 1; index += 1) {
    const [x0, y0] = points[index];
    const [x1, y1] = points[index + 1];
    const third = (x1 - x0) / 3;
    path += `C${fmt(x0 + third)},${fmt(y0 + tangents[index] * third)} ${fmt(x1 - third)},${fmt(y1 - tangents[index + 1] * third)} ${fmt(x1)},${fmt(y1)}`;
  }
  return path;
}

/** Marcas enteras del eje Y, unas cuatro, entre los extremos del dominio. */
export function integerTicks([low, high]: [number, number], count = 4) {
  const step = Math.max(1, Math.ceil((high - low) / (count - 1)));
  const ticks: number[] = [];
  for (let value = Math.ceil(low); value <= high; value += step) ticks.push(value);
  return ticks;
}

/** Qué etiquetas del eje X mostrar sin que se monten: siempre la última y, hacia atrás, a intervalos parejos. */
export function labelIndexes(count: number, width: number, minGap = 64) {
  if (count <= 0) return [];
  const fit = Math.max(1, Math.floor(width / minGap));
  const step = Math.max(1, Math.ceil(count / fit));
  const indexes: number[] = [];
  for (let index = count - 1; index >= 0; index -= step) indexes.unshift(index);
  return indexes;
}
