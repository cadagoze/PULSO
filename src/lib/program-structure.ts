import type { ExerciseRole } from "@/lib/prescription";
import type { ExerciseLevel, MovementPattern, MuscleGroup, TrainingLocation } from "@/types";

/**
 * Estructura del programa: cuántos tipos de sesión hay, qué trabaja cada una y cada cuánto se repite. No
 * elige ejercicios (eso es la selección) ni series (la prescripción): sólo reparte los patrones de
 * movimiento y los músculos entre los días disponibles. Las reglas y su respaldo están en
 * docs/evidencia-entrenamiento.md.
 */

export type TrainingSplit = "full-body" | "upper-lower" | "full-upper-lower" | "ppl-upper-lower" | "push-pull-legs";
export type PlanGoal = "strength" | "muscle" | "weight" | "energy" | "habits";

/**
 * Un hueco de la sesión. La `key` es el movimiento (rodilla, empuje horizontal…) y es la misma en todos los
 * días que lo trabajan: con ella el plan decide si repite el mismo ejercicio (quien empieza, o fuerza) o
 * alterna una variante.
 */
export interface PlanSlot {
  key: string;
  /** Patrones aceptables, el preferido primero: si no tienes equipo para el primero, sirve el siguiente. */
  patterns: MovementPattern[];
  /** Aislamientos: el hueco lo cubre un ejercicio cuyo músculo principal sea uno de estos. */
  muscles?: MuscleGroup[];
  role: ExerciseRole;
  /** 1 = imprescindible; con poco tiempo, lo de número mayor sale primero. */
  priority: number;
  /** Sólo entra con tiempo de sobra o si faltan series de su músculo en la semana. */
  optional?: boolean;
}

export interface DayTemplate {
  id: string;
  name: string;
  /** Qué trabaja, en pocas palabras («Rodilla, empuje, tirón y bisagra»). */
  focus: string;
  slots: PlanSlot[];
}

export interface Structure {
  split: TrainingSplit;
  label: string;
  /** Sesiones de fuerza por semana que propone (pueden ser menos que los días disponibles). */
  sessions: number;
  days: DayTemplate[];
  /** Orden en que se van haciendo los días, semana tras semana (A, B, A · B, A, B). */
  cycle: string[];
  /** Por qué esta estructura, en una línea. */
  reason: string;
  /** Una alternativa razonable (nunca una lista). */
  alternative?: { split: TrainingSplit; label: string; reason: string };
}

export interface StructureInput {
  /** Días de entreno disponibles por semana (1–6). */
  days: number;
  level: ExerciseLevel;
  goal: PlanGoal;
  minutes: number;
  location: TrainingLocation;
  /** Días fijos elegidos (0 = lunes … 6 = domingo), si los hay. */
  weekdays?: readonly number[];
  /** Cuántos ejercicios de fuerza permite tu equipo: con poca variedad no tiene sentido dividir en muchas sesiones. */
  variety?: number;
}

/** Con menos ejercicios que esto (casa sin equipo) la variedad no alcanza para más de tres sesiones distintas. */
export const LIMITED_VARIETY = 30;
/** Para dividir en Push / Pull / Legs hace falta bastante variedad (gimnasio o casa muy equipada). */
export const RICH_VARIETY = 45;

const slot = (key: string, patterns: MovementPattern[], role: ExerciseRole, priority: number, extra: Partial<PlanSlot> = {}): PlanSlot => ({ key, patterns, role, priority, ...extra });

const kneeSlot = (role: ExerciseRole, priority: number): PlanSlot => slot("knee", ["squat", "lunge"], role, priority);
const lungeSlot = (role: ExerciseRole, priority: number): PlanSlot => slot("unilateral", ["lunge", "squat"], role, priority);
/** La bisagra principal prefiere lo que trabaja isquiotibiales (peso muerto rumano); el empuje de cadera va como accesorio de glúteos. */
const hingeSlot = (role: ExerciseRole, priority: number): PlanSlot => slot("hinge", ["hinge"], role, priority, { muscles: ["hamstrings"] });
const gluteSlot = (priority: number): PlanSlot => slot("glute-bridge", ["hinge"], "accessory", priority, { muscles: ["glutes"], optional: true });
const pushH = (role: ExerciseRole, priority: number): PlanSlot => slot("push-h", ["horizontal-push", "vertical-push"], role, priority);
const pushV = (role: ExerciseRole, priority: number): PlanSlot => slot("push-v", ["vertical-push", "horizontal-push"], role, priority);
const pullH = (role: ExerciseRole, priority: number): PlanSlot => slot("pull-h", ["horizontal-pull", "vertical-pull"], role, priority);
const pullV = (role: ExerciseRole, priority: number): PlanSlot => slot("pull-v", ["vertical-pull", "horizontal-pull"], role, priority);
const coreSlot = (priority: number): PlanSlot => slot("core", ["core"], "core", priority);
const isolation = (key: string, muscles: MuscleGroup[], priority: number, optional = true): PlanSlot => slot(key, ["isolation"], "accessory", priority, { muscles, optional });

const day = (id: string, name: string, focus: string, slots: PlanSlot[]): DayTemplate => ({ id, name, focus, slots });

const FB_A = day("A", "Full Body A", "Rodilla, empuje, tirón y bisagra", [kneeSlot("main", 1), pushH("main", 2), pullH("compound", 3), hingeSlot("compound", 4), coreSlot(6), isolation("arms", ["biceps", "triceps"], 8), isolation("calves", ["calves"], 9)]);
const FB_B = day("B", "Full Body B", "Bisagra, tirón, empuje y una pierna", [hingeSlot("main", 1), pullV("main", 2), pushV("compound", 3), lungeSlot("compound", 4), coreSlot(6), isolation("delts", ["shoulders"], 8), gluteSlot(9)]);
const FB_C = day("C", "Full Body C", "Rodilla, tirón, empuje y bisagra", [kneeSlot("main", 1), pullH("main", 2), pushH("compound", 3), hingeSlot("compound", 4), coreSlot(6), isolation("arms", ["triceps", "biceps"], 8), isolation("calves", ["calves"], 9)]);

const UPPER_A = day("UA", "Torso A", "Empuje y tirón horizontales", [pushH("main", 1), pullH("main", 2), pushV("compound", 3), pullV("compound", 4), isolation("delts", ["shoulders"], 6), isolation("biceps", ["biceps"], 7), isolation("triceps", ["triceps"], 7)]);
const UPPER_B = day("UB", "Torso B", "Empuje y tirón verticales", [pushV("main", 1), pullV("main", 2), pushH("compound", 3), pullH("compound", 4), isolation("delts", ["shoulders"], 6), isolation("triceps", ["triceps"], 7), isolation("biceps", ["biceps"], 7)]);
const LOWER_A = day("LA", "Pierna A", "Rodilla y bisagra", [kneeSlot("main", 1), hingeSlot("compound", 2), lungeSlot("compound", 3), isolation("hamstrings", ["hamstrings"], 5), gluteSlot(6), coreSlot(7), isolation("calves", ["calves"], 8)]);
const LOWER_B = day("LB", "Pierna B", "Bisagra y rodilla", [hingeSlot("main", 1), kneeSlot("compound", 2), lungeSlot("compound", 3), isolation("quads", ["quads", "glutes"], 5), coreSlot(6), isolation("calves", ["calves"], 7)]);

const PUSH = day("PU", "Push A", "Pecho, hombros y tríceps", [pushH("main", 1), pushV("compound", 2), isolation("chest", ["chest"], 4), isolation("delts", ["shoulders"], 5), isolation("triceps", ["triceps"], 6)]);
const PULL = day("PL", "Pull A", "Espalda y bíceps", [pullV("main", 1), pullH("main", 2), isolation("rear", ["shoulders", "back"], 4), isolation("biceps", ["biceps"], 5), coreSlot(7)]);
const LEGS = day("LG", "Legs A", "Rodilla, bisagra y pantorrillas", [kneeSlot("main", 1), hingeSlot("main", 2), lungeSlot("compound", 3), isolation("hamstrings", ["hamstrings", "glutes"], 5), isolation("calves", ["calves"], 6), coreSlot(7)]);
const PUSH_B = day("PU2", "Push B", "Hombros, pecho y tríceps", [pushV("main", 1), pushH("compound", 2), isolation("delts", ["shoulders"], 4), isolation("triceps", ["triceps"], 5), isolation("chest", ["chest"], 6)]);
const PULL_B = day("PL2", "Pull B", "Espalda y bíceps", [pullH("main", 1), pullV("main", 2), isolation("rear", ["shoulders", "back"], 4), isolation("biceps", ["biceps"], 5), coreSlot(7)]);
const LEGS_B = day("LG2", "Legs B", "Bisagra, rodilla y pantorrillas", [hingeSlot("main", 1), kneeSlot("main", 2), lungeSlot("compound", 3), isolation("quads", ["quads", "glutes"], 5), isolation("calves", ["calves"], 6), coreSlot(7)]);

export const splitLabels: Record<TrainingSplit, string> = {
  "full-body": "Full Body",
  "upper-lower": "Torso / Pierna",
  "full-upper-lower": "Torso / Pierna + Full Body",
  "ppl-upper-lower": "Push / Pull / Legs + Torso / Pierna",
  "push-pull-legs": "Push / Pull / Legs",
};

/** Los días de cada estructura y el orden en que se repiten. */
function build(split: TrainingSplit, days: number): Pick<Structure, "days" | "cycle"> {
  switch (split) {
    case "full-body":
      if (days <= 1) return { days: [FB_A], cycle: ["A"] };
      if (days <= 3) return { days: [FB_A, FB_B], cycle: ["A", "B"] };
      return { days: [FB_A, FB_B, FB_C], cycle: ["A", "B", "C"] };
    case "upper-lower":
      return { days: [UPPER_A, LOWER_A, UPPER_B, LOWER_B], cycle: ["UA", "LA", "UB", "LB"] };
    case "full-upper-lower":
      return { days: [UPPER_A, LOWER_A, FB_C, UPPER_B, LOWER_B], cycle: ["UA", "LA", "C", "UB", "LB"] };
    case "ppl-upper-lower":
      return { days: [PUSH, PULL, LEGS, UPPER_B, LOWER_B], cycle: ["PU", "PL", "LG", "UB", "LB"] };
    case "push-pull-legs":
      return days >= 6
        ? { days: [PUSH, PULL, LEGS, PUSH_B, PULL_B, LEGS_B], cycle: ["PU", "PL", "LG", "PU2", "PL2", "LG2"] }
        : { days: [PUSH, PULL, LEGS], cycle: ["PU", "PL", "LG"] };
  }
}

export function structureFor(split: TrainingSplit, days: number, reason: string, alternative?: Structure["alternative"]): Structure {
  return { split, label: splitLabels[split], sessions: days, reason, alternative, ...build(split, days) };
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * Elige la estructura según tus días, tu nivel, tu objetivo, el tiempo y tu equipo. Una sola recomendación
 * (con, a lo sumo, una alternativa): la persona no tiene que configurar nada. Más días no son mejores:
 * con el mismo volumen semanal, repartirlo en más sesiones no suma (y la evidencia pide ≥2 sesiones por
 * semana con todos los grandes grupos), así que se proponen sólo los días que el nivel, el objetivo y el
 * equipo justifican y el resto queda como opcional (caminata, movilidad).
 */
export function recommendStructure({ days, level, goal, minutes, variety = 99 }: StructureInput): Structure {
  const available = Math.max(1, Math.min(6, Math.round(days)));
  const general = goal === "habits" || goal === "energy";
  const limited = variety < LIMITED_VARIETY;
  const rich = variety >= RICH_VARIETY;
  // Quien empieza, con objetivo de salud general o con poco equipo: tres sesiones de cuerpo completo bastan.
  const compact = level === 1 || general || limited;
  const sessions = compact ? Math.min(available, 3) : available;
  const extra = available - sessions;
  const trimmed = (reason: string) => (extra > 0 ? reason : null);

  if (sessions <= 1) {
    return structureFor("full-body", 1, "Con un solo día, Full Body trabaja todo el cuerpo en la misma sesión. Si puedes, dos días rinden bastante más.");
  }
  if (sessions === 2) {
    return structureFor("full-body", 2, "Con 2 días, Full Body A/B trabaja todo el cuerpo en cada sesión: así cada grupo muscular se entrena 2 veces por semana.");
  }
  if (sessions === 3) {
    const why = trimmed(limited
      ? `Tienes ${plural(available, "día", "días")}, pero con tu equipo Full Body funciona mejor: hay pocos ejercicios para dividir en más sesiones. Con mancuernas o bandas puedes sumar variedad.`
      : general
        ? `Tienes ${plural(available, "día", "días")}, pero para tu objetivo bastan 3 de Full Body: cubre todo el cuerpo y es fácil de sostener. Los demás, caminata o movilidad.`
        : `Tienes ${plural(available, "día", "días")}, pero al empezar 3 de Full Body bastan: trabajas cada músculo tres veces por semana y progresas rápido. Los demás, caminata o movilidad.`)
      ?? `Entrenas 3 días por semana. Full Body permite trabajar cada grupo varias veces sin hacer sesiones largas${general ? " y mantiene la rutina simple" : ""}.`;
    const alt = !compact && minutes >= 45 ? { split: "upper-lower" as const, label: splitLabels["upper-lower"], reason: "Alterna torso y pierna: más series por sesión en cada zona, con menos frecuencia." } : undefined;
    return structureFor("full-body", 3, why, alt);
  }
  if (sessions === 4) {
    return structureFor("upper-lower", 4, "Con 4 días, Torso / Pierna reparte el trabajo y cada músculo se entrena 2 veces por semana con sesiones más cortas.", { split: "full-body", label: "Full Body", reason: "Cuerpo completo en cada sesión: más simple, con menos series por sesión en cada zona." });
  }
  const hybrid = level >= 3 && rich && (goal === "muscle" || goal === "strength");
  if (sessions === 5) {
    return hybrid
      ? structureFor("ppl-upper-lower", 5, "Con 5 días y experiencia, Push / Pull / Legs más Torso / Pierna entrena cada músculo 2 veces por semana con sesiones enfocadas.", { split: "full-upper-lower", label: splitLabels["full-upper-lower"], reason: "Torso / Pierna más un día de Full Body: más simple de seguir." })
      : structureFor("full-upper-lower", 5, "Con 5 días, Torso / Pierna más un día de Full Body mantiene cada músculo entre 2 y 3 veces por semana sin sesiones largas.", rich && level >= 3 ? { split: "push-pull-legs", label: splitLabels["push-pull-legs"], reason: "Push / Pull / Legs con un día extra de torso o pierna." } : undefined);
  }
  // 6 días: sólo con experiencia (nivel avanzado), buen equipo y sesiones de duración suficiente; si no, cinco.
  if (level >= 3 && minutes >= 45 && rich && (goal === "muscle" || goal === "strength")) {
    return structureFor("push-pull-legs", 6, "Con 6 días y experiencia, Push / Pull / Legs dos veces por semana reparte el volumen en sesiones enfocadas.", { split: "full-upper-lower", label: splitLabels["full-upper-lower"], reason: "Cinco días: menos carga total y más recuperación." });
  }
  return structureFor("full-upper-lower", 5, `Tienes ${plural(available, "día", "días")}, pero 5 de pesas bastan para progresar y recuperarte bien. El sexto, caminata o movilidad.`);
}
