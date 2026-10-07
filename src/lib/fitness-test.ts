import { fitnessTestById, fitnessTests, type Cuts, type FitnessTestDef, type FitnessTestId } from "@/data/fitness-test";

/**
 * Test físico: nivel y puntaje de cada prueba según la edad y cómo te identificas, el puntaje PULSO
 * (0–100), la comparación con el test anterior y cuándo toca repetirlo.
 */

export type FitnessSex = "female" | "male" | "unspecified";
export type PushupVariant = "standard" | "knees";

export interface FitnessTestEntry {
  id: string;
  date: string;
  completedAt: string;
  /** Edad e identidad del día del test: fijan su referencia aunque después cambien. */
  age: number;
  sex: FitnessSex;
  results: Partial<Record<FitnessTestId, number>>;
  pushupVariant?: PushupVariant;
}

export const RETEST_DAYS = 28;
export const levelLabels = ["Por mejorar", "Regular", "Bien", "Muy bien", "Excelente"] as const;

const average = (a: Cuts, b: Cuts): Cuts => {
  const mid = (index: 0 | 1 | 2 | 3) => Math.round((a[index] + b[index]) / 2);
  return [mid(0), mid(1), mid(2), mid(3)];
};

/** Referencia de una prueba. Las flexiones con rodillas sólo tienen referencia femenina. */
export function cutsFor(test: FitnessTestDef, age: number, sex: FitnessSex, variant: PushupVariant = "standard"): Cuts | null {
  const row = test.norms.find((item) => age <= item.maxAge) ?? test.norms[test.norms.length - 1];
  if (test.id === "pushups") {
    if (variant === "knees") return sex === "male" ? null : row.female;
    return sex === "unspecified" ? average(row.male, row.female) : row[sex];
  }
  return sex === "unspecified" ? average(row.male, row.female) : row[sex];
}

/** Nivel de 1 (por mejorar) a 5 (excelente). */
export function levelFor(value: number, cuts: Cuts, lowerIsBetter: boolean) {
  return 1 + cuts.filter((cut) => (lowerIsBetter ? value <= cut : value >= cut)).length;
}

/**
 * Puntaje continuo de 0 a 100: cada corte vale 20, 40, 60 y 80; por encima del último se llega a 100
 * un tramo más allá. Así el puntaje sube aunque no cambies de nivel.
 */
export function pointsFor(value: number, cuts: Cuts, lowerIsBetter: boolean) {
  const sign = lowerIsBetter ? -1 : 1;
  const c = cuts.map((cut) => cut * sign);
  const v = value * sign;
  const floor = lowerIsBetter ? c[0] - (c[1] - c[0]) * 3 : 0;
  const anchors = [floor, ...c, c[3] + (c[3] - c[2])];
  if (v <= anchors[0]) return 0;
  for (let index = 1; index < anchors.length; index += 1) {
    if (v < anchors[index]) return Math.round(20 * (index - 1) + (20 * (v - anchors[index - 1])) / (anchors[index] - anchors[index - 1]));
  }
  return 100;
}

export interface TestResult {
  test: FitnessTestDef;
  value: number;
  /** null si la prueba no tiene referencia (flexiones con rodillas en hombres). */
  level: number | null;
  points: number | null;
}

export function testResults(entry: FitnessTestEntry): TestResult[] {
  return fitnessTests.flatMap((test) => {
    const value = entry.results[test.id];
    if (value === undefined) return [];
    const cuts = cutsFor(test, entry.age, entry.sex, entry.pushupVariant);
    return [{ test, value, level: cuts ? levelFor(value, cuts, test.lowerIsBetter) : null, points: cuts ? pointsFor(value, cuts, test.lowerIsBetter) : null }];
  });
}

/** Puntaje PULSO: promedio de las pruebas con referencia (null si ninguna la tiene). */
export function fitnessScore(results: TestResult[], only?: Set<FitnessTestId>) {
  const points = results.filter((item) => item.points !== null && (!only || only.has(item.test.id))).map((item) => item.points as number);
  return points.length ? Math.round(points.reduce((sum, value) => sum + value, 0) / points.length) : null;
}

export function scoreLevel(score: number) {
  return Math.min(5, Math.floor(score / 20) + 1);
}

/** Si dos valores de una prueba se pueden comparar (las flexiones, sólo con la misma variante). */
function comparable(id: FitnessTestId, current: FitnessTestEntry, previous: FitnessTestEntry) {
  if (current.results[id] === undefined || previous.results[id] === undefined) return false;
  return id !== "pushups" || (current.pushupVariant ?? "standard") === (previous.pushupVariant ?? "standard");
}

export interface TestComparison {
  /** Cambio en lo medido (repeticiones, segundos o latidos). */
  deltas: Partial<Record<FitnessTestId, number>>;
  /** Cambio del puntaje sobre las pruebas que ambos tests tienen en común. */
  scoreDelta: number | null;
}

export function compareTests(current: FitnessTestEntry, previous: FitnessTestEntry): TestComparison {
  const deltas: Partial<Record<FitnessTestId, number>> = {};
  const shared = new Set<FitnessTestId>();
  for (const test of fitnessTests) {
    if (!comparable(test.id, current, previous)) continue;
    deltas[test.id] = (current.results[test.id] as number) - (previous.results[test.id] as number);
    shared.add(test.id);
  }
  const now = fitnessScore(testResults(current), shared);
  const before = fitnessScore(testResults(previous), shared);
  return { deltas, scoreDelta: now !== null && before !== null ? now - before : null };
}

/** Si un cambio es una mejora (en el escalón, bajar el pulso es mejorar). */
export function isImprovement(id: FitnessTestId, delta: number) {
  return fitnessTestById.get(id)?.lowerIsBetter ? delta < 0 : delta > 0;
}

/** La prueba más baja (bajo «Excelente»): lo que más conviene trabajar estas 4 semanas. */
export function focusFor(results: TestResult[]) {
  const candidates = results.filter((item) => item.points !== null && (item.points as number) < 80);
  return candidates.sort((a, b) => (a.points as number) - (b.points as number))[0] ?? null;
}

const dayMs = 86_400_000;
const toTime = (date: string) => new Date(`${date}T12:00:00Z`).getTime();
export const addDays = (date: string, days: number) => new Date(toTime(date) + days * dayMs).toISOString().slice(0, 10);

export function sortTests(entries: FitnessTestEntry[]) {
  return [...entries].sort((a, b) => `${a.date}|${a.completedAt}`.localeCompare(`${b.date}|${b.completedAt}`));
}

/** Último test, el anterior y cuándo toca el próximo (cada 4 semanas). Sin tests, toca ya. */
export function testStatus(entries: FitnessTestEntry[], today: string) {
  const sorted = sortTests(entries);
  const last = sorted.at(-1) ?? null;
  const previous = sorted.at(-2) ?? null;
  if (!last) return { last, previous, due: true, daysLeft: 0, nextDate: today };
  const nextDate = addDays(last.date, RETEST_DAYS);
  const daysLeft = Math.max(0, Math.round((toTime(nextDate) - toTime(today)) / dayMs));
  return { last, previous, due: daysLeft === 0, daysLeft, nextDate };
}

/** «+4 rep», «−9 lpm», «+15 s». */
export function deltaLabel(id: FitnessTestId, delta: number) {
  const unit = fitnessTestById.get(id)?.unit ?? "";
  return `${delta > 0 ? "+" : delta < 0 ? "−" : "±"}${Math.abs(delta)} ${unit}`;
}

/** Lo medido con su unidad: «24 rep», «1:05 min», «45 s», «92 lpm». */
export function valueLabel(id: FitnessTestId, value: number) {
  if (id === "plank" && value >= 60) return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")} min`;
  return `${value} ${fitnessTestById.get(id)?.unit ?? ""}`;
}
