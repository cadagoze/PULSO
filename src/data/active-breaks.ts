import { exerciseIllustrations } from "@/data/illustrations";
import { breakIllustrations } from "@/data/illustrations/breaks";
import type { IllustrationSpec } from "@/lib/illustration";
import type { MuscleGroup } from "@/types";

/**
 * Pausas activas: rutinas de 3 a 5 minutos para quien trabaja sentado, junto al escritorio y sin equipo.
 * Cada movimiento dura unos segundos (por lado, si se hace a cada lado).
 */

export interface BreakMove {
  id: string;
  name: string;
  /** Una o dos claves cortas, para leer de un vistazo. */
  cues: string[];
  /** Se hace a cada lado: el tiempo se reparte y la voz avisa el cambio. */
  perSide?: boolean;
  primary: MuscleGroup[];
  illustration: IllustrationSpec;
}

export interface BreakRoutine {
  id: string;
  name: string;
  detail: string;
  items: Array<{ move: string; seconds: number }>;
}

const spec = (id: string) => breakIllustrations[id];
const fromLibrary = (exerciseId: number) => exerciseIllustrations[exerciseId] as IllustrationSpec;

export const breakMoves: BreakMove[] = [
  { id: "neck-tilt", name: "Inclinación de cuello", cues: ["Oreja hacia el hombro, sin subirlo.", "Respira y suelta."], perSide: true, primary: ["traps"], illustration: spec("neck-tilt") },
  { id: "chin-tuck", name: "Mentón atrás", cues: ["Lleva el mentón hacia atrás, como haciendo papada.", "Cuello largo, mirada al frente."], primary: ["traps"], illustration: spec("chin-tuck") },
  { id: "shoulder-rolls", name: "Círculos de hombros", cues: ["Círculos amplios hacia atrás.", "Lentos y sin dolor."], primary: ["shoulders"], illustration: fromLibrary(82) },
  { id: "scapula-squeeze", name: "Junta las escápulas", cues: ["Codos atrás, pecho arriba.", "Aprieta 2 segundos y suelta."], primary: ["back"], illustration: spec("scapula-squeeze") },
  { id: "chest-opener", name: "Apertura de pecho", cues: ["Manos atrás y hombros abajo.", "Abre el pecho y respira profundo."], primary: ["chest"], illustration: spec("chest-opener") },
  { id: "side-bend", name: "Inclinación lateral", cues: ["Brazos arriba, cadera quieta.", "Estira el costado al exhalar."], perSide: true, primary: ["obliques"], illustration: spec("side-bend") },
  { id: "seated-cat-cow", name: "Gato-camello sentado", cues: ["Redondea la espalda mirando abajo.", "Luego pecho arriba mirando al frente."], primary: ["lowerBack"], illustration: spec("seated-cat-cow") },
  { id: "wrists", name: "Muñecas y antebrazos", cues: ["Brazo al frente, palma arriba.", "Con la otra mano lleva los dedos hacia ti."], perSide: true, primary: ["forearms"], illustration: spec("wrists") },
  { id: "chair-squat", name: "Siéntate y párate", cues: ["Sin usar las manos.", "Baja lento hasta rozar la silla."], primary: ["quads", "glutes"], illustration: spec("chair-squat") },
  { id: "calf-raise", name: "Elevación de talones", cues: ["Sube a la punta de los pies.", "Baja lento. Activa la circulación."], primary: ["calves"], illustration: spec("calf-raise") },
  { id: "standing-quad", name: "Cuádriceps de pie", cues: ["Talón al glúteo, rodillas juntas.", "Apóyate en el escritorio si lo necesitas."], perSide: true, primary: ["quads"], illustration: spec("standing-quad") },
  { id: "standing-hip-flexor", name: "Cadera adelante", cues: ["Paso largo y aprieta el glúteo de atrás.", "Lleva la cadera adelante, tronco alto."], perSide: true, primary: ["glutes"], illustration: spec("standing-hip-flexor") },
  { id: "seated-hamstring", name: "Isquiotibiales sentado", cues: ["Pierna estirada, punta del pie arriba.", "Inclínate desde la cadera, espalda larga."], perSide: true, primary: ["hamstrings"], illustration: spec("seated-hamstring") },
  { id: "eyes-far", name: "Mira lejos", cues: ["Mira algo a 6 metros o más.", "Parpadea suave. Regla 20-20-20."], primary: [], illustration: spec("eyes-far") },
  { id: "breathing", name: "Respiración profunda", cues: ["Inhala 4 segundos inflando el abdomen.", "Exhala 6 segundos, lento."], primary: ["abs"], illustration: spec("breathing") },
];

export const breakMoveById = new Map(breakMoves.map((move) => [move.id, move]));

export const breakRoutines: BreakRoutine[] = [
  {
    id: "cuello",
    name: "Cuello y hombros",
    detail: "Suelta la tensión de la pantalla",
    items: [{ move: "neck-tilt", seconds: 40 }, { move: "chin-tuck", seconds: 30 }, { move: "shoulder-rolls", seconds: 30 }, { move: "scapula-squeeze", seconds: 30 }, { move: "chest-opener", seconds: 30 }],
  },
  {
    id: "piernas",
    name: "Piernas y circulación",
    detail: "Para cuando llevas horas sentado",
    items: [{ move: "chair-squat", seconds: 45 }, { move: "calf-raise", seconds: 40 }, { move: "standing-quad", seconds: 50 }, { move: "standing-hip-flexor", seconds: 50 }, { move: "seated-hamstring", seconds: 40 }],
  },
  {
    id: "espalda",
    name: "Espalda y postura",
    detail: "Endereza la espalda y respira",
    items: [{ move: "seated-cat-cow", seconds: 40 }, { move: "side-bend", seconds: 40 }, { move: "chest-opener", seconds: 30 }, { move: "scapula-squeeze", seconds: 30 }, { move: "breathing", seconds: 40 }],
  },
  {
    id: "ojos",
    name: "Ojos y manos",
    detail: "Descansa la vista y las muñecas",
    items: [{ move: "eyes-far", seconds: 20 }, { move: "wrists", seconds: 40 }, { move: "shoulder-rolls", seconds: 30 }, { move: "eyes-far", seconds: 20 }, { move: "breathing", seconds: 40 }],
  },
  {
    id: "completa",
    name: "Pausa completa",
    detail: "Un poco de todo, de pies a cabeza",
    items: [
      { move: "neck-tilt", seconds: 30 }, { move: "shoulder-rolls", seconds: 30 }, { move: "chest-opener", seconds: 30 }, { move: "side-bend", seconds: 30 },
      { move: "chair-squat", seconds: 40 }, { move: "calf-raise", seconds: 30 }, { move: "standing-quad", seconds: 40 }, { move: "eyes-far", seconds: 20 }, { move: "breathing", seconds: 30 },
    ],
  },
];

export const breakRoutineById = new Map(breakRoutines.map((routine) => [routine.id, routine]));
