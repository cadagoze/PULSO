import type { IllustrationSpec, Prop } from "@/lib/illustration";

// Equipamiento compartido entre inicio y final (posiciones relativas a la cadera o a una articulación).
const flatBench: Prop = { kind: "bench", at: { dx: -10, dy: 6 }, width: 56 };
const declineBox: Prop = { kind: "block", at: { at: "toe", dx: -5, dy: 2.25 }, width: 20, toGround: true };
const chair: Prop[] = [
  { kind: "bench", at: { at: "hand", dx: -21, dy: 2.75 }, width: 22 },
  { kind: "line", from: { at: "hand", dx: -19.5, dy: 3 }, to: { at: "hand", dx: -22, dy: -22 }, tone: "pad", width: 3.2 },
];
const machineSeat: Prop[] = [
  { kind: "block", at: { dx: 4, dy: 7.2 }, width: 26, height: 5, tone: "pad" },
  { kind: "block", at: { dx: 4, dy: 9.7 }, width: 7, toGround: true, tone: "metal" },
];
// Press de pecho: respaldo algo reclinado, columna detrás y manilla en la mano.
const chestPressMachine: Prop[] = [
  ...machineSeat,
  { kind: "block", at: { dx: -10.2, dy: -14.5 }, width: 36, height: 5, angle: 96, tone: "pad" },
  { kind: "line", from: { dx: -17, dy: -42 }, tone: "metal", width: 3.5, toGround: true },
  { kind: "circle", at: { at: "hand" }, r: 2.6, tone: "metal" },
];
// Press de hombros: respaldo alto y palanca desde un pivote fijo detrás (misma longitud abajo y arriba).
const shoulderPressMachine: Prop[] = [
  ...machineSeat,
  { kind: "block", at: { dx: -9.6, dy: -18.5 }, width: 44, height: 5, angle: 93, tone: "pad" },
  { kind: "line", from: { dx: -26.2, dy: -45.7 }, tone: "metal", width: 3.5, toGround: true },
  { kind: "line", from: { dx: -26.2, dy: -45.7 }, to: { at: "hand" }, tone: "metal", width: 2.6 },
  { kind: "circle", at: { at: "hand" }, r: 2.6, tone: "metal" },
];
const cableColumn: Prop[] = [
  { kind: "line", from: { dx: 36, dy: -66 }, tone: "metal", width: 4, toGround: true },
  { kind: "line", from: { dx: 36, dy: -63 }, to: { dx: 27, dy: -61 }, tone: "metal", width: 2.6 },
  { kind: "circle", at: { dx: 27, dy: -61 }, r: 3, tone: "metal" },
  { kind: "line", from: { dx: 24.4, dy: -61 }, to: { at: "hand" }, tone: "cable" },
];
const band: Prop = { kind: "line", from: { at: "handFar" }, to: { at: "hand" }, tone: "band", width: 2.4 };

/** Empujes: flexiones, presses, fondos, aperturas y tríceps. */
export const pushIllustrations: Partial<Record<number, IllustrationSpec>> = {
  // Flexión: cuerpo recto, manos bajo los hombros → pecho cerca del suelo, codos atrás.
  31: {
    start: { torso: 108, arm: { upper: -8, lower: -8 }, leg: { upper: -72, lower: -72, foot: 15 } },
    end: { torso: 93, head: 95, arm: { upper: -93, lower: 33 }, leg: { upper: -87, lower: -87, foot: 15 }, arrows: [{ at: { at: "shoulder", dx: 0, dy: -12 }, angle: 0, length: 9 }] },
  },
  // Flexión declinada: pies sobre un cajón y manos en el suelo → pecho hacia el suelo, cadera alineada.
  32: {
    start: { torso: 83, arm: { upper: -14, lower: -14 }, leg: { upper: -97, lower: -97, foot: -10 }, props: [declineBox] },
    end: {
      torso: 70, head: 78, arm: { upper: -81, lower: 43 }, leg: { upper: -110, lower: -110, foot: -23 },
      props: [declineBox],
      arrows: [{ at: { at: "shoulder", dx: 0, dy: -12 }, angle: 0, length: 9 }],
    },
  },
  // Flexión pica: V invertida con la cadera alta → codos atrás y la cabeza baja por delante de las manos.
  42: {
    start: { torso: 45, arm: { upper: 29, lower: 29 }, leg: { upper: -22, lower: -22, foot: 55 } },
    end: { torso: 45, head: 55, arm: { upper: -60, lower: 43 }, leg: { upper: -47, lower: -47, foot: 31 }, arrows: [{ at: { at: "head", dx: 10, dy: -10 }, angle: 0, length: 9 }] },
  },
  // Fondos en silla: manos en el borde del asiento y brazos extendidos → cadera abajo, codos hacia atrás.
  43: {
    start: { torso: 190, arm: { upper: -6, lower: -6 }, leg: { upper: 74, lower: 26 }, props: chair },
    end: { torso: 184, arm: { upper: -63, lower: 30 }, leg: { upper: 103, lower: 23 }, props: chair, arrows: [{ at: { at: "hip", dx: 10, dy: -6 }, angle: 0, length: 9 }] },
  },
  // Press de pecho con mancuernas (en el suelo): brazos extendidos sobre el pecho → codos apoyados en el suelo.
  12: {
    start: { torso: 90, head: 98, arm: { upper: 180, lower: 180 }, leg: { upper: -134, lower: -35, foot: -90 }, props: [{ kind: "dumbbell" }] },
    end: { torso: 90, head: 98, arm: { upper: -81, lower: 180 }, leg: { upper: -134, lower: -35, foot: -90 }, props: [{ kind: "dumbbell" }], arrows: [{ at: { at: "hand", dx: 9, dy: -4 }, angle: 0, length: 9 }] },
  },
  // Press de banca: barra sobre el pecho con brazos extendidos → barra al esternón, codos bajo el banco.
  60: {
    start: { torso: 90, head: 90, arm: { upper: 180, lower: 180 }, leg: { upper: -70, lower: 0, foot: -90 }, props: [flatBench, { kind: "barbell" }] },
    end: {
      torso: 90, head: 90, arm: { upper: -56, lower: 180 }, leg: { upper: -70, lower: 0, foot: -90 },
      props: [flatBench, { kind: "barbell" }],
      arrows: [{ at: { at: "hand", dx: 16, dy: -10 }, angle: 0, length: 10 }],
    },
  },
  // Press de pecho en máquina: espalda en el respaldo y manillas a media altura del pecho → brazos extendidos al frente.
  21: {
    start: { torso: 186, arm: { upper: -40, lower: 90 }, leg: { upper: 86, lower: 0 }, props: chestPressMachine },
    end: { torso: 186, arm: { upper: 76, lower: 82 }, leg: { upper: 86, lower: 0 }, props: chestPressMachine, arrows: [{ at: { at: "hand", dx: -6, dy: -9 }, angle: 90, length: 9 }] },
  },
  // Aperturas con mancuernas: brazos abiertos en arco con codos suaves → mancuernas juntas sobre el pecho.
  // (La vista lateral no puede acortar los brazos que salen hacia los lados: la apertura se sugiere en V.)
  50: {
    start: {
      torso: 90, head: 92, arm: { upper: -115, lower: -135 }, armFar: { upper: 115, lower: 135 }, leg: { upper: -70, lower: 0, foot: -90 },
      props: [flatBench, { kind: "dumbbell" }],
    },
    end: {
      torso: 90, head: 92, arm: { upper: 176, lower: 186 }, armFar: { upper: 184, lower: 174 }, leg: { upper: -70, lower: 0, foot: -90 },
      props: [flatBench, { kind: "dumbbell" }],
      arrows: [{ at: { at: "elbow", dx: 10, dy: 0 }, angle: 180, length: 9 }],
    },
  },
  // Press de hombros con mancuernas (vista frontal): mancuernas a la altura de los hombros → brazos sobre la cabeza.
  46: {
    view: "front",
    start: { torso: 180, arm: { upper: 80, lower: 180 }, leg: { upper: 4, lower: 0 }, props: [{ kind: "dumbbell" }] },
    end: { torso: 180, arm: { upper: 172, lower: 184 }, leg: { upper: 4, lower: 0 }, props: [{ kind: "dumbbell" }], arrows: [{ at: { at: "elbow", dx: 7, dy: 4 }, angle: 180, length: 9 }] },
  },
  // Press militar con barra: de pie, barra sobre las clavículas → brazos extendidos con la barra sobre la cabeza.
  61: {
    start: { torso: 180, head: 184, arm: { upper: 0, lower: 152 }, leg: { upper: 0, lower: 0 }, props: [{ kind: "barbell" }] },
    end: { torso: 180, head: 180, arm: { upper: 178, lower: 180 }, leg: { upper: 0, lower: 0 }, props: [{ kind: "barbell" }], arrows: [{ at: { at: "elbow", dx: 10, dy: 2 }, angle: 180, length: 10 }] },
  },
  // Press de hombros en máquina: sentado con la espalda apoyada y manillas a la altura de los hombros → brazos arriba.
  68: {
    start: { torso: 183, arm: { upper: 12, lower: 176 }, leg: { upper: 86, lower: 0 }, props: shoulderPressMachine },
    end: { torso: 183, arm: { upper: 176, lower: 178 }, leg: { upper: 86, lower: 0 }, props: shoulderPressMachine, arrows: [{ at: { at: "elbow", dx: 8, dy: 2 }, angle: 180, length: 9 }] },
  },
  // Elevaciones laterales (vista frontal): brazos a los costados → a la altura de los hombros.
  47: {
    view: "front",
    start: { torso: 180, arm: { upper: 10, lower: 6 }, leg: { upper: 4, lower: 0 }, props: [{ kind: "dumbbell" }] },
    end: { torso: 180, arm: { upper: 88, lower: 96 }, leg: { upper: 4, lower: 0 }, props: [{ kind: "dumbbell" }], arrows: [{ at: { at: "elbow", dx: 2, dy: 10 }, angle: 150, length: 9 }] },
  },
  // Extensión de tríceps sobre la cabeza: mancuerna con ambas manos detrás de la cabeza → brazos extendidos arriba.
  49: {
    start: { torso: 180, head: 174, arm: { upper: 162, lower: -45 }, leg: { upper: 0, lower: 0 }, props: [{ kind: "dumbbell", hands: "near" }] },
    end: { torso: 180, arm: { upper: 172, lower: 176 }, leg: { upper: 0, lower: 0 }, props: [{ kind: "dumbbell", hands: "near" }], arrows: [{ at: { at: "hand", dx: 9, dy: 6 }, angle: 180, length: 9 }] },
  },
  // Extensión de tríceps en polea alta: codos pegados al costado y antebrazos horizontales → antebrazos abajo.
  70: {
    start: { torso: 170, head: 175, arm: { upper: -2, lower: 98 }, leg: { upper: 4, lower: -4 }, props: cableColumn },
    end: { torso: 170, head: 175, arm: { upper: -2, lower: -2 }, leg: { upper: 4, lower: -4 }, props: cableColumn, arrows: [{ at: { at: "hand", dx: 7, dy: -12 }, angle: 0, length: 9 }] },
  },
  // Aperturas con banda (vista frontal): banda frente al pecho → brazos abiertos a la altura de los hombros.
  // (De frente no se pueden dibujar los brazos estirados hacia el observador: el inicio sujeta la banda junto al pecho.)
  54: {
    view: "front",
    start: { torso: 180, arm: { upper: 24, lower: -136 }, leg: { upper: 4, lower: 0 }, props: [band] },
    end: { torso: 180, arm: { upper: 84, lower: 87 }, leg: { upper: 4, lower: 0 }, props: [band], arrows: [{ at: { at: "elbow", dx: 2, dy: 8 }, angle: 90, length: 9 }] },
  },
};
