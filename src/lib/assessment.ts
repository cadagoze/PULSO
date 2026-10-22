import type { TrainingEquipment, TrainingLocation } from "@/types";

/**
 * Evaluación inicial: cinco decisiones (objetivo, lugar, equipamiento, tiempo y qué considerar) que
 * arman el perfil con la misma forma de siempre, para que el generador, Perfil y las versiones
 * anteriores de la app sigan leyéndolo igual. Edad, estatura, peso y sexo se piden después, sólo si
 * hacen falta (calorías en Comidas, fotos en Ajustes).
 */

/** "weight" y las respuestas libres sólo existen en evaluaciones anteriores. */
export type Goal = "strength" | "energy" | "muscle" | "habits" | "weight";
export type Activity = "sedentary" | "walking" | "some" | "regular";
export type Limitation = "none" | "knees" | "back" | "shoulders";
export type Barrier = "time" | "consistency" | "food" | "discomfort";
export type StepKey = "goals" | "activities" | "times" | "limitations" | "barriers";

export interface AssessmentProfile {
  createdAt: string;
  /** Nombre con el que PULSO te saluda (opcional). */
  name?: string;
  /** Cómo te identificas (evaluaciones anteriores o Ajustes): elige las fotos. */
  sex?: "female" | "male" | "unspecified";
  location?: TrainingLocation;
  equipment?: TrainingEquipment[];
  goals: Goal[];
  activities: Activity[];
  times: number[];
  limitations: Limitation[];
  barriers: Barrier[];
  customAnswers: Record<StepKey, string>;
  recommendation: {
    goalLabel: string;
    focus: string;
    sessionsPerWeek: number;
    sessionMinutes: number;
    firstHabit: string;
    dailyMessage: string;
    caution?: string;
  };
}

export type Place = "home" | "gym" | "both";
export type Consideration = "beginner" | "knees" | "back" | "shoulders" | "none";
export type AssessmentStep = "goal" | "place" | "equipment" | "time" | "consider";

export interface AssessmentAnswers {
  goal: Exclude<Goal, "weight"> | null;
  place: Place | null;
  /** Lo que hay en casa (en el gimnasio se asume equipamiento completo). */
  equipment: TrainingEquipment[];
  days: number;
  minutes: number;
  considerations: Consideration[];
}

export const emptyAnswers: AssessmentAnswers = { goal: null, place: null, equipment: [], days: 3, minutes: 45, considerations: [] };

export const goalOptions: Array<{ value: Exclude<Goal, "weight">; label: string; detail: string }> = [
  { value: "strength", label: "Ganar fuerza", detail: "Más fuerte en lo que haces cada día" },
  { value: "energy", label: "Estar en forma", detail: "Más energía, resistencia y movilidad" },
  { value: "muscle", label: "Ganar músculo", detail: "Más masa muscular, con buena técnica" },
  { value: "habits", label: "Moverme más", detail: "Una rutina simple que puedas sostener" },
];

export const placeOptions: Array<{ value: Place; label: string; detail: string }> = [
  { value: "home", label: "Casa", detail: "Con tu peso o lo que tengas a mano" },
  { value: "gym", label: "Gimnasio", detail: "Máquinas, poleas y pesos libres" },
  { value: "both", label: "Ambos", detail: "Algunos días en casa, otros en el gimnasio" },
];

export const dayOptions = [2, 3, 4, 5] as const;
export const minuteOptions = [30, 45, 60] as const;

export const considerationOptions: Array<{ value: Consideration; label: string; detail: string }> = [
  { value: "beginner", label: "Estoy empezando", detail: "Ejercicios simples y cargas suaves" },
  { value: "knees", label: "Molestias en las rodillas", detail: "Evitamos lo que las exija" },
  { value: "back", label: "Molestias en la espalda", detail: "Movimientos controlados y estables" },
  { value: "shoulders", label: "Molestias en los hombros", detail: "Sin sobrecarga por encima de la cabeza" },
  { value: "none", label: "Nada en particular", detail: "Me muevo con comodidad" },
];

/** Pasos en orden; el de equipamiento se salta si sólo entrenas en el gimnasio. */
export function assessmentSteps(place: Place | null): AssessmentStep[] {
  return place === "gym" ? ["goal", "place", "time", "consider"] : ["goal", "place", "equipment", "time", "consider"];
}

/** Lo mínimo para avanzar en cada paso. */
export function canContinue(step: AssessmentStep, answers: AssessmentAnswers) {
  if (step === "goal") return answers.goal !== null;
  if (step === "place") return answers.place !== null;
  if (step === "consider") return answers.considerations.length > 0;
  return true;
}

/** «Nada en particular» excluye a las demás; marcar otra la quita. */
export function toggleConsideration(current: Consideration[], value: Consideration): Consideration[] {
  if (current.includes(value)) return current.filter((item) => item !== value);
  if (value === "none") return ["none"];
  return [...current.filter((item) => item !== "none"), value];
}

const goalCopy: Record<Goal, { label: string; focus: string; message: string }> = {
  strength: { label: "Ganar fuerza", focus: "Fuerza que puedas sostener", message: "Movimientos básicos, cargas que suben de a poco y descansos que te dejan rendir." },
  energy: { label: "Estar en forma", focus: "Energía y condición física", message: "Fuerza y resistencia en sesiones dinámicas, con descansos cortos." },
  muscle: { label: "Ganar músculo", focus: "Músculo con buena técnica", message: "Más series por grupo muscular y progresión constante, sin llegar al límite cada vez." },
  habits: { label: "Moverme más", focus: "Constancia antes que perfección", message: "Sesiones simples que puedas repetir. Lo que cuenta es volver." },
  weight: { label: "Mejorar mi peso", focus: "Movimiento y alimentación simple", message: "Movimiento constante y decisiones simples en tus comidas." },
};

const areaNames: Record<Exclude<Limitation, "none">, string> = { knees: "tus rodillas", back: "tu espalda", shoulders: "tus hombros" };

/**
 * Perfil con la forma de siempre a partir de las cinco respuestas. Al repetir la evaluación se
 * conservan la fecha de inicio, el nombre y cómo te identificas.
 */
export function buildProfile(answers: AssessmentAnswers, previous?: AssessmentProfile | null, now = new Date()): AssessmentProfile {
  const goal = answers.goal ?? "habits";
  const copy = goalCopy[goal];
  const areas = answers.considerations.filter((item): item is Exclude<Limitation, "none"> => item === "knees" || item === "back" || item === "shoulders");
  // Nivel (lo usa el generador): principiante o con algo de experiencia. Los días que puedes entrenar no dicen cuánta experiencia tienes.
  const activities: Activity[] = answers.considerations.includes("beginner") ? ["walking"] : ["some"];
  const list = areas.map((area) => areaNames[area]);
  const caution = list.length
    ? `Cuidaremos ${list.length === 1 ? list[0] : `${list.slice(0, -1).join(", ")} y ${list.at(-1)}`}. Empieza suave y detente si aparece dolor agudo; si persiste, consulta a un profesional.`
    : undefined;
  return {
    createdAt: previous?.createdAt ?? now.toISOString(),
    ...(previous?.name ? { name: previous.name } : {}),
    ...(previous?.sex ? { sex: previous.sex } : {}),
    // «Ambos»: el gimnasio por defecto; Casa queda a un toque en Entrenar.
    location: answers.place === "home" ? "home" : "gym",
    equipment: answers.place === "gym" ? [] : answers.equipment,
    goals: [goal],
    activities,
    times: [answers.minutes],
    limitations: areas.length ? areas : ["none"],
    barriers: [],
    customAnswers: { goals: "", activities: "", times: "", limitations: "", barriers: "" },
    recommendation: {
      goalLabel: copy.label,
      focus: copy.focus,
      sessionsPerWeek: answers.days,
      sessionMinutes: answers.minutes,
      firstHabit: `Entrena ${answers.days} días esta semana, aunque alguno sea en versión corta.`,
      dailyMessage: copy.message,
      ...(caution ? { caution } : {}),
    },
  };
}

/** Respuestas para repetir la evaluación: lo que ya sabemos de tu plan, para cambiar sólo lo necesario. */
export function answersFromProfile(profile: AssessmentProfile, place: TrainingLocation, homeEquipment: TrainingEquipment[], weeklyGoal: number): AssessmentAnswers {
  const first = profile.goals[0];
  const goal = first === "weight" ? "energy" : first ?? null;
  const minutes = minuteOptions.reduce((best, option) => (Math.abs(option - profile.recommendation.sessionMinutes) < Math.abs(best - profile.recommendation.sessionMinutes) ? option : best), 45 as number);
  const beginner = !profile.activities.includes("some") && !profile.activities.includes("regular");
  const areas = profile.limitations.filter((item): item is Exclude<Limitation, "none"> => item !== "none");
  const considerations: Consideration[] = [...(beginner ? ["beginner" as const] : []), ...areas];
  return {
    goal,
    place,
    equipment: homeEquipment,
    days: Math.max(2, Math.min(5, weeklyGoal)),
    minutes,
    considerations: considerations.length ? considerations : ["none"],
  };
}
