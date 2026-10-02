import type { IllustrationSpec, Prop } from "@/lib/illustration";

// Mesa: tablero sobre la cabeza hacia los pies, con la pata del extremo más allá de los talones (el borde queda en las manos).
const table: Prop[] = [
  { kind: "block", at: { at: "hand", dx: -37, dy: -3.5 }, width: 78, height: 4, tone: "pad" },
  { kind: "line", from: { at: "hand", dx: -73, dy: -1.5 }, tone: "metal", width: 2.6, toGround: true },
];

// Poste al frente con la banda anclada a la altura del abdomen.
const waistAnchor: Prop[] = [
  { kind: "line", from: { dx: 58, dy: -60 }, tone: "metal", width: 3, toGround: true },
  { kind: "line", from: { dx: 56.5, dy: -16 }, to: { at: "handFar" }, tone: "band" },
  { kind: "line", from: { dx: 56.5, dy: -16 }, to: { at: "hand" }, tone: "band" },
  { kind: "circle", at: { dx: 56.5, dy: -16 }, r: 1.8, tone: "metal" },
];

// Barra de dominadas y silla bajo los pies (la silla queda en el mismo lugar en ambas viñetas).
const barAndChair: Prop[] = [{ kind: "bar" }, { kind: "bench", at: { at: "ankle", dx: -6, dy: 3.5 }, width: 24 }];

// Máquina de jalón: columna con viga y polea arriba, asiento, apoyo de muslos y cable hasta la barra.
const latPulldown: Prop[] = [
  { kind: "line", from: { dx: 46, dy: -80 }, tone: "metal", width: 3.5, toGround: true },
  { kind: "line", from: { dx: 46, dy: -80 }, to: { dx: 5, dy: -80 }, tone: "metal", width: 3 },
  { kind: "block", at: { dx: -1, dy: 8.5 }, width: 24, height: 5, tone: "pad" },
  { kind: "block", at: { dx: -1, dy: 11 }, width: 10, toGround: true },
  { kind: "circle", at: { at: "knee", dx: -5, dy: -9 }, r: 4.5, tone: "pad" },
  { kind: "line", from: { dx: 5, dy: -77.5 }, to: { at: "hand" }, tone: "cable" },
  { kind: "circle", at: { dx: 5, dy: -77.5 }, r: 2.6, tone: "metal" },
  { kind: "circle", at: { at: "hand" }, r: 2.4, tone: "metal" },
];

// Puerta al costado (de fondo en la vista lateral) con la banda anclada en su borde a la altura del pecho.
const sideDoorAnchor: Prop[] = [
  { kind: "block", at: { dx: -2, dy: -58 }, width: 20, toGround: true },
  { kind: "line", from: { dx: 8, dy: -22 }, to: { at: "handFar" }, tone: "band" },
  { kind: "line", from: { dx: 8, dy: -22 }, to: { at: "hand" }, tone: "band" },
  { kind: "circle", at: { dx: 8, dy: -22 }, r: 1.8, tone: "metal" },
];

// Puerta al frente (de canto) con la banda anclada arriba.
const highDoorAnchor: Prop[] = [
  { kind: "line", from: { dx: 34, dy: -90 }, tone: "prop", width: 4, toGround: true },
  { kind: "line", from: { dx: 31.5, dy: -85.5 }, to: { at: "handFar" }, tone: "band" },
  { kind: "line", from: { dx: 31.5, dy: -85.5 }, to: { at: "hand" }, tone: "band" },
  { kind: "circle", at: { dx: 31.5, dy: -85.5 }, r: 1.8, tone: "metal" },
];

// Remo en polea: banco, plataforma inclinada para los pies, columna con polea y cable hasta el agarre.
const seatedRow: Prop[] = [
  { kind: "line", from: { dx: 66, dy: -42 }, tone: "metal", width: 3.5, toGround: true },
  { kind: "block", at: { dx: 4, dy: 8.5 }, width: 30, height: 5, tone: "pad" },
  { kind: "block", at: { dx: 4, dy: 11 }, width: 12, toGround: true },
  { kind: "block", at: { at: "ankle", dx: 4.9, dy: -3.9 }, width: 16, height: 3, angle: 75, tone: "metal" },
  { kind: "line", from: { at: "ankle", dx: 3, dy: 4 }, tone: "metal", width: 2.6, toGround: true },
  { kind: "line", from: { dx: 63.5, dy: -14 }, to: { at: "hand" }, tone: "cable" },
  { kind: "circle", at: { dx: 63.5, dy: -14 }, r: 2.6, tone: "metal" },
  { kind: "circle", at: { at: "hand" }, r: 2.2, tone: "metal" },
];

// Columna con polea a la altura de la cara y cable hasta la cuerda.
const faceHighPulley: Prop[] = [
  { kind: "line", from: { dx: 60, dy: -62 }, tone: "metal", width: 3.5, toGround: true },
  { kind: "line", from: { dx: 57.5, dy: -43 }, to: { at: "hand" }, tone: "cable" },
  { kind: "circle", at: { dx: 57.5, dy: -43 }, r: 2.6, tone: "metal" },
];

/** Tracciones: remos, jalones, dominadas, curl y antirrotación. */
export const pullIllustrations: Partial<Record<number, IllustrationSpec>> = {
  // Remo invertido en mesa: bajo la mesa con los brazos extendidos al borde → pecho al borde, cuerpo recto sobre los talones.
  6: {
    start: { torso: 97, arm: { upper: -146, lower: -146 }, leg: { upper: -83, lower: -83, foot: -158 }, props: table },
    end: {
      torso: 117, arm: { upper: -34.6, lower: -176.7 }, leg: { upper: -63, lower: -63, foot: -138 }, props: table,
      arrows: [{ at: { at: "hip", dx: 8, dy: 12 }, angle: 165, length: 10 }],
    },
  },
  // Remo con banda: de pie frente al anclaje, brazos al frente → codos atrás, manos al abdomen.
  13: {
    start: { torso: 180, arm: { upper: 64, lower: 64 }, leg: { upper: 6, lower: -4 }, props: waistAnchor },
    end: {
      torso: 180, arm: { upper: -41, lower: 82 }, leg: { upper: 6, lower: -4 }, props: waistAnchor,
      arrows: [{ at: { at: "elbow", dx: 2, dy: -9 }, angle: -90, length: 9 }],
    },
  },
  // Remo con mancuerna: rodilla y mano lejanas en el banco; el brazo cercano lleva el codo atrás.
  14: {
    start: {
      torso: 105, arm: { upper: 0, lower: 0 }, armFar: { upper: 0, lower: 0 }, leg: { upper: -8, lower: -8 }, legFar: { upper: 0, lower: -90, foot: -90 },
      props: [{ kind: "bench", at: { dx: -30, dy: 27.5 }, width: 68 }, { kind: "dumbbell", hands: "near" }],
    },
    end: {
      torso: 105, arm: { upper: -105, lower: 0 }, armFar: { upper: 0, lower: 0 }, leg: { upper: -8, lower: -8 }, legFar: { upper: 0, lower: -90, foot: -90 },
      props: [{ kind: "bench", at: { dx: -30, dy: 27.5 }, width: 68 }, { kind: "dumbbell", hands: "near" }],
      arrows: [{ at: { at: "elbow", dx: 0, dy: -8 }, angle: 180, length: 9 }],
    },
  },
  // Dominada asistida: pies en una silla, colgado con brazos extendidos y rodillas flexionadas → mentón a la barra empujando con las piernas.
  15: {
    start: { torso: 178, arm: { upper: 176, lower: 176 }, leg: { upper: 94.2, lower: -42.6 }, lift: 23, props: barAndChair },
    end: {
      torso: 184, arm: { upper: 44.4, lower: -175.2 }, leg: { upper: 30.4, lower: 3 }, lift: 23, props: barAndChair,
      arrows: [{ at: { at: "hip", dx: -12, dy: 4 }, angle: 180, length: 10 }],
    },
  },
  // Jalón al pecho: sentado con los muslos bajo el apoyo y los brazos arriba → barra al pecho alto, codos abajo.
  23: {
    start: { torso: 180, arm: { upper: 172, lower: 172 }, leg: { upper: 90, lower: 0 }, props: latPulldown },
    end: {
      torso: 190, head: 182, arm: { upper: 3.1, lower: 144.3 }, leg: { upper: 90, lower: 0 }, props: latPulldown,
      arrows: [{ at: { at: "elbow", dx: -7, dy: -14 }, angle: 0, length: 10 }],
    },
  },
  // Curl de bíceps: de pie, brazos extendidos con mancuernas → antebrazos arriba, codos pegados al cuerpo.
  48: {
    start: { torso: 180, arm: { upper: 0, lower: 2 }, leg: { upper: 3, lower: -2 }, props: [{ kind: "dumbbell" }] },
    end: {
      torso: 180, arm: { upper: 4, lower: 150 }, leg: { upper: 3, lower: -2 }, props: [{ kind: "dumbbell" }],
      arrows: [{ at: { at: "hand", dx: 9, dy: 9 }, angle: 180, length: 9 }],
    },
  },
  // Press Pallof: de lado a la puerta con la banda anclada, manos en el esternón → brazos extendidos al frente sin girar el tronco.
  55: {
    start: { torso: 180, arm: { upper: -8.1, lower: 121.3 }, leg: { upper: 3, lower: -2 }, props: sideDoorAnchor },
    end: {
      torso: 180, arm: { upper: 75, lower: 75 }, leg: { upper: 3, lower: -2 }, props: sideDoorAnchor,
      arrows: [{ at: { at: "hand", dx: -10, dy: 8 }, angle: 90, length: 10 }],
    },
  },
  // Jalón con banda: de rodillas frente al anclaje alto, brazos arriba → codos a las costillas, manos a los hombros.
  56: {
    start: { torso: 180, arm: { upper: 150, lower: 150 }, leg: { upper: 0, lower: -88, foot: -84 }, props: highDoorAnchor },
    end: {
      torso: 184, arm: { upper: 0, lower: 152 }, leg: { upper: 0, lower: -88, foot: -84 }, props: highDoorAnchor,
      arrows: [{ at: { at: "elbow", dx: -7, dy: -12 }, angle: 0, length: 10 }],
    },
  },
  // Dominada: colgado con brazos extendidos → mentón sobre la barra (la barra queda a la misma altura).
  57: {
    start: { torso: 178, arm: { upper: 178, lower: 178 }, leg: { upper: 10, lower: -20, foot: 70 }, lift: 6, props: [{ kind: "bar" }] },
    end: { torso: 184, arm: { upper: 34.6, lower: 173.5 }, leg: { upper: 10, lower: -20, foot: 70 }, lift: 39, props: [{ kind: "bar" }], arrows: [{ at: { at: "hip", dx: -12, dy: 6 }, angle: 180, length: 10 }] },
  },
  // Elevación de rodillas colgado: colgado quieto → rodillas a la altura de la cadera, pelvis levemente enrollada.
  58: {
    start: { torso: 180, arm: { upper: 180, lower: 180 }, leg: { upper: 2, lower: -2, foot: 40 }, lift: 5, props: [{ kind: "bar" }] },
    end: {
      torso: 188, arm: { upper: 180, lower: 180 }, leg: { upper: 100, lower: 5, foot: 40 }, lift: 36, props: [{ kind: "bar" }],
      arrows: [{ at: { at: "knee", dx: 12, dy: 13 }, angle: 180, length: 10 }],
    },
  },
  // Remo con barra: tronco inclinado unos 45° y barra colgando → barra al ombligo con los codos atrás.
  62: {
    start: { torso: 135, head: 145, arm: { upper: -7, lower: -7 }, leg: { upper: 25, lower: -5 }, props: [{ kind: "barbell" }] },
    end: {
      torso: 135, head: 145, arm: { upper: -76.3, lower: 29.2 }, leg: { upper: 25, lower: -5 }, props: [{ kind: "barbell" }],
      arrows: [{ at: { at: "elbow", dx: -6, dy: -4 }, angle: 180, length: 9 }],
    },
  },
  // Remo sentado en polea: pies en la plataforma y brazos extendidos → agarre al abdomen, espalda erguida.
  67: {
    start: { torso: 176, arm: { upper: 64, lower: 64 }, leg: { upper: 97, lower: 80, foot: 165 }, lift: 14, props: seatedRow },
    end: {
      torso: 180, arm: { upper: -41, lower: 82 }, leg: { upper: 97, lower: 80, foot: 165 }, lift: 14, props: seatedRow,
      arrows: [{ at: { at: "elbow", dx: 2, dy: -9 }, angle: -90, length: 9 }],
    },
  },
  // Face pull en polea: polea a la altura de la cara y brazos al frente → cuerda a la frente con los codos altos.
  69: {
    start: { torso: 180, arm: { upper: 108, lower: 108 }, leg: { upper: 9, lower: 0 }, legFar: { upper: -9, lower: -9 }, props: faceHighPulley },
    end: {
      torso: 180, arm: { upper: -124, lower: 100 }, leg: { upper: 9, lower: 0 }, legFar: { upper: -9, lower: -9 }, props: faceHighPulley,
      arrows: [{ at: { at: "hand", dx: 22, dy: 6 }, angle: -90, length: 10 }],
    },
  },
};
