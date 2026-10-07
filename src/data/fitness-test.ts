/**
 * Test físico de PULSO: cuatro pruebas para repetir cada 4 semanas, con referencias por edad.
 * Son orientativas, no una evaluación médica:
 * - Flexiones: normas de la CSEP (Canadá); hombres con flexiones normales, mujeres con rodillas apoyadas.
 * - Sentadillas en 1 minuto: tablas de referencia habituales de esa prueba.
 * - Plancha: escala propia de PULSO (no existe una norma estándar).
 * - Escalón: test de 3 minutos de la YMCA (cajón de 30 cm, 96 golpes por minuto) y pulso del minuto siguiente.
 */

export type FitnessTestId = "pushups" | "squats" | "plank" | "step";

/** Mínimo para Regular, Bien, Muy bien y Excelente; en el escalón (menos es mejor), el máximo. */
export type Cuts = readonly [number, number, number, number];
export interface NormRow { maxAge: number; male: Cuts; female: Cuts }

export interface FitnessTestDef {
  id: FitnessTestId;
  title: string;
  /** Qué se anota al terminar. */
  measure: string;
  unit: string;
  exerciseId: number;
  lowerIsBetter: boolean;
  steps: string[];
  /** Qué trabajar si es tu prueba más baja. */
  focus: { area: string; label: string; href: string };
  source: string;
  norms: NormRow[];
}

/** Ritmo del escalón: 24 subidas por minuto, un golpe por pie. */
export const STEP_BPM = 96;
export const STEP_SECONDS = 180;
export const SQUAT_SECONDS = 60;
export const PULSE_SECONDS = 60;
/** Descanso sugerido entre pruebas. */
export const REST_SECONDS = 120;

export const fitnessTests: FitnessTestDef[] = [
  {
    id: "pushups",
    title: "Flexiones",
    measure: "Flexiones seguidas",
    unit: "rep",
    exerciseId: 31,
    lowerIsBetter: false,
    steps: [
      "Manos bajo los hombros y el cuerpo recto, desde los talones o desde las rodillas.",
      "Baja hasta que el pecho quede a un puño del suelo y vuelve a subir.",
      "Haz todas las que puedas sin parar. Termina cuando pierdas la técnica.",
    ],
    focus: { area: "Fuerza de tren superior", label: "Rutina de pecho", href: "/entrenar?zona=pecho" },
    source: "Normas CSEP por edad",
    norms: [
      { maxAge: 19, male: [18, 23, 29, 39], female: [12, 18, 25, 33] },
      { maxAge: 29, male: [17, 22, 29, 36], female: [10, 15, 21, 30] },
      { maxAge: 39, male: [12, 17, 22, 30], female: [8, 13, 20, 27] },
      { maxAge: 49, male: [10, 13, 17, 25], female: [5, 11, 15, 24] },
      { maxAge: 59, male: [7, 10, 13, 21], female: [2, 7, 11, 21] },
      { maxAge: Infinity, male: [5, 8, 11, 18], female: [2, 5, 12, 17] },
    ],
  },
  {
    id: "squats",
    title: "Sentadillas en 1 minuto",
    measure: "Sentadillas en 60 s",
    unit: "rep",
    exerciseId: 30,
    lowerIsBetter: false,
    steps: [
      "Pies al ancho de los hombros y brazos al frente.",
      "Baja hasta que los muslos queden paralelos al suelo y sube completo.",
      "Cuenta cada sentadilla bien hecha durante 1 minuto.",
    ],
    focus: { area: "Fuerza de piernas", label: "Rutina de piernas", href: "/entrenar?zona=piernas" },
    source: "Referencias de la prueba de 1 minuto",
    norms: [
      { maxAge: 25, male: [31, 35, 44, 50], female: [25, 29, 37, 44] },
      { maxAge: 35, male: [29, 31, 40, 46], female: [21, 25, 33, 40] },
      { maxAge: 45, male: [23, 27, 35, 42], female: [15, 19, 27, 34] },
      { maxAge: 55, male: [18, 22, 29, 36], female: [10, 14, 22, 28] },
      { maxAge: 65, male: [13, 17, 28, 32], female: [7, 10, 18, 25] },
      { maxAge: Infinity, male: [11, 15, 24, 29], female: [5, 11, 17, 24] },
    ],
  },
  {
    id: "plank",
    title: "Plancha",
    measure: "Segundos en plancha",
    unit: "s",
    exerciseId: 34,
    lowerIsBetter: false,
    steps: [
      "Antebrazos bajo los hombros, cuerpo recto y abdomen firme.",
      "Aguanta todo lo que puedas sin que la cadera se hunda ni suba.",
      "Toca «Me detuve» cuando pierdas la posición.",
    ],
    focus: { area: "Fuerza del centro", label: "Rutina de abdomen", href: "/entrenar?zona=abdomen" },
    source: "Escala PULSO por edad",
    norms: [
      { maxAge: 39, male: [20, 40, 70, 120], female: [20, 40, 70, 120] },
      { maxAge: 59, male: [15, 30, 55, 90], female: [15, 30, 55, 90] },
      { maxAge: Infinity, male: [10, 20, 40, 70], female: [10, 20, 40, 70] },
    ],
  },
  {
    id: "step",
    title: "Escalón 3 minutos",
    measure: "Pulso del minuto siguiente",
    unit: "lpm",
    exerciseId: 16,
    lowerIsBetter: true,
    steps: [
      "Usa un escalón o cajón firme, idealmente de 30 cm. Siempre el mismo.",
      "Sube y baja al ritmo: arriba, arriba, abajo, abajo. Son 3 minutos sin parar.",
      "Al terminar, siéntate y cuenta tus latidos 1 minuto en el cuello o la muñeca.",
    ],
    focus: { area: "Resistencia cardiovascular", label: "Intervalos", href: "/entrenar/intervalos" },
    source: "Test de escalón YMCA por edad",
    norms: [
      { maxAge: 25, male: [107, 100, 84, 76], female: [120, 110, 93, 81] },
      { maxAge: 35, male: [110, 102, 85, 76], female: [119, 110, 92, 80] },
      { maxAge: 45, male: [113, 105, 88, 76], female: [118, 111, 96, 84] },
      { maxAge: 55, male: [119, 111, 93, 82], female: [124, 118, 101, 91] },
      { maxAge: 65, male: [117, 109, 94, 77], female: [127, 117, 103, 92] },
      { maxAge: Infinity, male: [118, 110, 92, 81], female: [126, 121, 101, 92] },
    ],
  },
];

export const fitnessTestById = new Map(fitnessTests.map((test) => [test.id, test]));
