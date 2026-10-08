import type { IllustrationSpec, Limb, Pose, Prop } from "@/lib/illustration";

/**
 * Pausas activas: movimientos junto al escritorio, sentado en una silla o de pie, sin equipo.
 * Sentado: cadera en el origen, muslos horizontales sobre el asiento y pies en el suelo.
 */

/** Silla (asiento, patas y respaldo), desplazada respecto de la cadera cuando la figura está de pie. */
function chairAt(x = 0, y = 0): Prop[] {
  return [
    { kind: "block", at: { dx: 4 + x, dy: 6 + y }, width: 22, height: 3, tone: "prop" },
    { kind: "line", from: { dx: -5 + x, dy: 7.5 + y }, tone: "metal", width: 2, toGround: true },
    { kind: "line", from: { dx: 13 + x, dy: 7.5 + y }, tone: "metal", width: 2, toGround: true },
    { kind: "block", at: { dx: -8.5 + x, dy: -8 + y }, width: 20, height: 3, angle: 90, tone: "prop" },
  ];
}
const chair = chairAt();
const seatedLegs: Limb = { upper: 90, lower: 0, foot: 90 };
const handsOnThighs: Limb = { upper: 22, lower: 78 };
const seated = (pose: Partial<Pose>): Pose => ({ torso: 180, arm: handsOnThighs, leg: seatedLegs, ...pose, props: [...chair, ...(pose.props ?? [])] });
const standing: Limb = { upper: 0, lower: 0 };
const relaxed: Limb = { upper: 6, lower: 8 };

export const breakIllustrations: Record<string, IllustrationSpec> = {
  // Inclinación de cuello (de frente): oreja hacia un hombro → hacia el otro, hombros quietos.
  "neck-tilt": {
    view: "front",
    start: { torso: 180, head: 140, arm: relaxed, leg: { upper: 3, lower: 0 }, arrows: [{ at: { at: "head", dx: 10, dy: -4 }, angle: 40, length: 7 }] },
    end: { torso: 180, head: 220, arm: relaxed, leg: { upper: 3, lower: 0 }, arrows: [{ at: { at: "head", dx: -10, dy: -4 }, angle: -40, length: 7 }] },
  },
  // Retracción de mentón (sentado): cabeza adelantada → mentón atrás, cuello largo.
  "chin-tuck": {
    start: seated({ head: 152 }),
    end: seated({ head: 182, arrows: [{ at: { at: "head", dx: 11, dy: 1 }, angle: -90, length: 7 }] }),
  },
  // Junta las escápulas (de pie): brazos al frente → codos atrás pegados al cuerpo.
  "scapula-squeeze": {
    start: { torso: 180, arm: { upper: 90, lower: 90 }, leg: standing },
    end: { torso: 180, arm: { upper: -38, lower: 60 }, leg: standing, arrows: [{ at: { at: "elbow", dx: -5, dy: -2 }, angle: -90, length: 8 }] },
  },
  // Apertura de pecho (de pie): brazos relajados → manos atrás y pecho arriba.
  "chest-opener": {
    start: { torso: 180, arm: relaxed, leg: standing },
    end: { torso: 183, head: 192, arm: { upper: -38, lower: -48 }, leg: standing, arrows: [{ at: { dx: 11, dy: -24 }, angle: 150, length: 8 }] },
  },
  // Inclinación lateral (de frente): brazos arriba → tronco hacia un lado, cadera quieta.
  "side-bend": {
    view: "front",
    start: { torso: 180, arm: { upper: 172, lower: 176 }, armFar: { upper: 172, lower: 176 }, leg: { upper: 4, lower: 0 } },
    end: {
      torso: 163, head: 160, arm: { upper: 146, lower: 140 }, armFar: { upper: -152, lower: -146 }, leg: { upper: 4, lower: 0 },
      arrows: [{ at: { at: "hand", dx: 4, dy: 4 }, angle: 125, length: 8 }],
    },
  },
  // Gato-camello sentado: espalda redonda mirando abajo → pecho arriba mirando al frente.
  "seated-cat-cow": {
    start: seated({ torso: 164, head: 118, arm: { upper: 18, lower: 52 } }),
    end: seated({ torso: 184, head: 198, arm: { upper: 30, lower: 46 } }),
  },
  // Muñecas (de pie): brazo al frente → la otra mano lleva los dedos hacia atrás.
  wrists: {
    start: { torso: 180, arm: { upper: 90, lower: 90 }, armFar: { upper: 10, lower: 12 }, leg: standing },
    end: {
      torso: 180, arm: { upper: 90, lower: 90 }, armFar: { upper: 64, lower: 108 }, leg: standing,
      arrows: [{ at: { at: "hand", dx: 3, dy: -6 }, angle: -90, length: 6 }],
    },
  },
  // Siéntate y párate: sentado con el tronco adelante → de pie sin usar las manos (la silla queda atrás).
  "chair-squat": {
    start: seated({ torso: 158, head: 168, arm: { upper: 78, lower: 84 } }),
    end: { torso: 180, arm: { upper: 86, lower: 90 }, leg: standing, props: chairAt(-26, 26), arrows: [{ at: { dx: -10, dy: -10 }, angle: 180, length: 9 }] },
  },
  // Elevación de talones (de pie): pies planos → en puntas.
  "calf-raise": {
    start: { torso: 180, arm: relaxed, leg: { upper: 0, lower: 0, foot: 90 } },
    end: { torso: 180, arm: relaxed, leg: { upper: 0, lower: 0, foot: 148 }, arrows: [{ at: { at: "ankle", dx: -6, dy: -4 }, angle: 180, length: 8 }] },
  },
  // Cuádriceps de pie: de pie → talón al glúteo tomando el tobillo.
  "standing-quad": {
    start: { torso: 180, arm: { upper: 24, lower: 34 }, armFar: relaxed, leg: standing },
    end: { torso: 180, arm: { upper: 30, lower: 40 }, armFar: { upper: -24, lower: -26 }, leg: standing, legFar: { upper: -18, lower: -165, foot: -95 } },
  },
  // Flexor de cadera de pie: paso largo → cadera adelante y brazo arriba.
  "standing-hip-flexor": {
    start: { torso: 180, arm: relaxed, leg: { upper: 20, lower: -5, foot: 90 }, legFar: { upper: -20, lower: -35, foot: 62 } },
    end: {
      torso: 180, arm: { upper: 168, lower: 174 }, armFar: relaxed, leg: { upper: 40, lower: -10, foot: 90 }, legFar: { upper: -35, lower: -45, foot: 55 },
      arrows: [{ at: { dx: -12, dy: -2 }, angle: 90, length: 8 }],
    },
  },
  // Isquiotibiales sentado: pierna estirada con el talón en el suelo → tronco adelante con la espalda larga.
  "seated-hamstring": {
    start: seated({ leg: { upper: 58, lower: 58, foot: 170 }, legFar: seatedLegs, arm: { upper: 30, lower: 56 } }),
    end: seated({
      torso: 146, head: 150, leg: { upper: 58, lower: 58, foot: 170 }, legFar: seatedLegs, arm: { upper: 62, lower: 66 },
      arrows: [{ at: { at: "shoulder", dx: -4, dy: -7 }, angle: 130, length: 8 }],
    }),
  },
  // Mirar lejos (20-20-20): vista en la pantalla → mirada a lo lejos.
  "eyes-far": {
    start: seated({ head: 150 }),
    end: seated({ head: 180, arrows: [{ at: { at: "head", dx: 10, dy: 0 }, angle: 90, length: 16 }] }),
  },
  // Respiración profunda sentado: mano en el abdomen; inhala (sube) → exhala (baja).
  breathing: {
    start: seated({ arm: { upper: -10, lower: 75 }, armFar: handsOnThighs, arrows: [{ at: { dx: 11, dy: -16 }, angle: 180, length: 7 }] }),
    end: seated({ arm: { upper: -10, lower: 75 }, armFar: handsOnThighs, arrows: [{ at: { dx: 11, dy: -25 }, angle: 0, length: 7 }] }),
  },
};
