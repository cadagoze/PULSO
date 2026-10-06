import type { Equipment, TrainingEquipment, TrainingLocation } from "@/types";

/**
 * Catálogo de equipamiento para Casa y Gimnasio. Cada equipo aporta capacidades (`provides`) que
 * habilitan ejercicios: p. ej. los bidones o una mochila con peso sirven como mancuernas livianas.
 * `base` marca los que se muestran siempre; el resto se agrega desde «Más equipamiento».
 */

export type EquipmentCategory = "pesas" | "accesorios" | "cardio" | "maquinas";

export interface EquipmentItem {
  id: TrainingEquipment;
  label: string;
  detail: string;
  category: EquipmentCategory;
  places: TrainingLocation[];
  provides: Equipment[];
  /** Visible sin abrir el catálogo, por lugar. */
  base: TrainingLocation[];
  /** No cambia la rutina (p. ej. la colchoneta): sólo completa tu lista. */
  comfort?: boolean;
}

export const equipmentCategoryLabels: Record<EquipmentCategory, string> = {
  pesas: "Pesas",
  accesorios: "Accesorios",
  cardio: "Cardio",
  maquinas: "Máquinas",
};

const both: TrainingLocation[] = ["home", "gym"];

export const equipmentCatalog: EquipmentItem[] = [
  // Pesas (orden y lista base según lo que más se compra para la casa: Mercado Libre, Amazon y CyberDay, 2025)
  { id: "dumbbells", label: "Mancuernas", detail: "Fijas o ajustables", category: "pesas", places: both, provides: ["dumbbells"], base: both },
  { id: "dumbbell-set", label: "Set de mancuernas con barra unible", detail: "Kit de 20–30 kg que se arma como barra", category: "pesas", places: ["home"], provides: ["dumbbells", "barbell"], base: [] },
  { id: "load-bag", label: "Bidones o mochila con peso", detail: "Sirven como mancuernas livianas", category: "pesas", places: ["home"], provides: ["dumbbells"], base: ["home"] },
  { id: "kettlebell", label: "Kettlebell", detail: "Pesa rusa", category: "pesas", places: both, provides: ["kettlebell"], base: ["home"] },
  { id: "ankle-weights", label: "Tobilleras con peso", detail: "De 1 a 3 kg por pierna", category: "pesas", places: both, provides: ["ankle-weights"], base: [] },
  { id: "barbell", label: "Barra y discos", detail: "Con rack o soportes", category: "pesas", places: both, provides: ["barbell"], base: ["gym"] },
  { id: "medicine-ball", label: "Balón medicinal", detail: "Para lanzamientos", category: "pesas", places: both, provides: ["medicine-ball"], base: [] },
  // Accesorios
  { id: "bands", label: "Bandas elásticas", detail: "Largas, de tela o látex", category: "accesorios", places: both, provides: ["bands"], base: ["home"] },
  { id: "mini-band", label: "Minibandas", detail: "Ligas cortas para piernas", category: "accesorios", places: both, provides: ["mini-band"], base: [] },
  { id: "ab-wheel", label: "Rueda abdominal", detail: "Para el core", category: "accesorios", places: both, provides: ["ab-wheel"], base: ["home"] },
  { id: "jump-rope", label: "Cuerda para saltar", detail: "Para cardio en poco espacio", category: "accesorios", places: both, provides: ["jump-rope"], base: ["home"] },
  { id: "pullup-bar", label: "Barra de dominadas", detail: "De puerta o torre multifuncional", category: "accesorios", places: both, provides: ["pullup-bar"], base: ["home"] },
  { id: "mat", label: "Colchoneta", detail: "Mat de yoga o ejercicio", category: "accesorios", places: ["home"], provides: [], base: [], comfort: true },
  { id: "fitball", label: "Pelota de pilates", detail: "Fitball de 55 a 75 cm", category: "accesorios", places: both, provides: ["fitball"], base: [] },
  { id: "bench", label: "Banco", detail: "Plano o inclinable", category: "accesorios", places: both, provides: ["bench"], base: ["gym"] },
  { id: "box", label: "Cajón, step o escalón", detail: "Firme, de 15 a 50 cm", category: "accesorios", places: both, provides: ["box"], base: [] },
  { id: "suspension", label: "TRX o suspensión", detail: "Correas ancladas en alto", category: "accesorios", places: both, provides: ["suspension"], base: [] },
  { id: "punching-bag", label: "Saco de boxeo", detail: "Con guantes o vendas", category: "accesorios", places: both, provides: ["punching-bag"], base: [] },
  { id: "foam-roller", label: "Rodillo de espuma", detail: "Para soltar y movilizar", category: "accesorios", places: both, provides: ["foam-roller"], base: [] },
  // Cardio
  { id: "bike", label: "Bicicleta estática o spinning", detail: "Magnética o de volante", category: "cardio", places: both, provides: ["bike"], base: ["gym"] },
  { id: "treadmill", label: "Trotadora o walking pad", detail: "Cinta para caminar o trotar", category: "cardio", places: both, provides: ["treadmill"], base: ["gym"] },
  { id: "elliptical", label: "Elíptica", detail: "Sin impacto", category: "cardio", places: both, provides: ["elliptical"], base: [] },
  { id: "rower", label: "Remo", detail: "Remo ergómetro", category: "cardio", places: both, provides: ["rower"], base: [] },
  // Máquinas
  { id: "multigym", label: "Multigimnasio", detail: "Estación con poleas y press", category: "maquinas", places: ["home"], provides: ["cable", "press-machines", "leg-machines"], base: [] },
  { id: "leg-press", label: "Prensa de piernas", detail: "Máquina de piernas", category: "maquinas", places: ["gym"], provides: ["leg-press"], base: ["gym"] },
  { id: "leg-machines", label: "Extensión y curl de piernas", detail: "Cuádriceps e isquiotibiales", category: "maquinas", places: ["gym"], provides: ["leg-machines"], base: [] },
  { id: "press-machines", label: "Máquinas de pecho y hombros", detail: "Press guiado", category: "maquinas", places: ["gym"], provides: ["press-machines"], base: ["gym"] },
  { id: "cable", label: "Poleas", detail: "Jalón, remo y cruce", category: "maquinas", places: ["gym"], provides: ["cable"], base: ["gym"] },
];

export const equipmentById = new Map(equipmentCatalog.map((item) => [item.id, item]));

export function equipmentFor(place: TrainingLocation) {
  return equipmentCatalog.filter((item) => item.places.includes(place));
}

/** Gimnasio completo: todo lo que suele haber en uno (valor por defecto). */
export const fullGym: TrainingEquipment[] = equipmentFor("gym").map((item) => item.id);

/** Lista base para la evaluación inicial y el inicio de Casa (lo que más se compra para el hogar). */
export const homeBase = equipmentCatalog.filter((item) => item.base.includes("home"));

/** Capacidades que aportan los equipos marcados. */
export function capabilitiesOf(items: TrainingEquipment[]): Set<Equipment> {
  const result = new Set<Equipment>();
  for (const id of items) for (const capability of equipmentById.get(id)?.provides ?? []) result.add(capability);
  return result;
}

export function equipmentLabel(id: TrainingEquipment) {
  return equipmentById.get(id)?.label ?? id;
}
