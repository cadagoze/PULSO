import type { IllustrationSpec, Prop } from "@/lib/illustration";

/** Cinta de correr: banda bajo los pies, columna al frente con consola y baranda (relativo a la cadera). */
const treadmill: Prop[] = [
  { kind: "block", at: { dx: 2, dy: 56 }, width: 74, height: 4, tone: "pad" },
  { kind: "block", at: { dx: 2, dy: 59 }, width: 70, toGround: true, tone: "metal" },
  { kind: "line", from: { dx: 36, dy: 56 }, to: { dx: 31, dy: -6 }, tone: "metal", width: 3 },
  { kind: "block", at: { dx: 30, dy: -8 }, width: 13, height: 4, angle: 18, tone: "metal" },
  { kind: "line", from: { dx: 32, dy: 2 }, to: { dx: 14, dy: 4 }, tone: "metal", width: 2.4 },
];

/** Elíptica (relativo a la cadera): poste con consola al frente, riel en el suelo, pedales y manillas móviles. */
const elliptical: Prop[] = [
  { kind: "line", from: { dx: 33, dy: -16 }, tone: "metal", width: 3, toGround: true },
  { kind: "block", at: { dx: 32, dy: -18 }, width: 11, height: 4, angle: 18, tone: "metal" },
  { kind: "line", from: { dx: -38, dy: 64 }, to: { dx: 35, dy: 64 }, tone: "metal", width: 3 },
  { kind: "line", from: { dx: -36, dy: 64 }, tone: "metal", width: 3, toGround: true },
  { kind: "line", from: { at: "ankleFar", dy: 3 }, to: { dx: -30, dy: 62 }, tone: "metal", width: 2.2 },
  { kind: "line", from: { at: "ankle", dy: 3 }, to: { dx: -30, dy: 62 }, tone: "metal", width: 2.6 },
  { kind: "block", at: { at: "ankle", dx: 3, dy: 3.5 }, width: 14, height: 3, tone: "pad" },
  { kind: "line", from: { at: "handFar" }, to: { dx: 33, dy: 22 }, tone: "metal", width: 2.2 },
  { kind: "line", from: { at: "hand" }, to: { dx: 33, dy: 22 }, tone: "metal", width: 2.6 },
  { kind: "circle", at: { dx: 33, dy: 22 }, r: 2.4, tone: "metal" },
];

/** Correas de suspensión ancladas arriba al frente (fijas respecto de la punta del pie). */
const suspension: Prop[] = [
  { kind: "line", from: { at: "toe", dx: 92, dy: -98 }, to: { at: "hand" }, tone: "cable", width: 1.8 },
  { kind: "circle", at: { at: "toe", dx: 92, dy: -98 }, r: 2.2, tone: "metal" },
  { kind: "block", at: { at: "hand", dy: 0.5 }, width: 6, height: 2.6, tone: "pad" },
];

const wheel: Prop[] = [
  { kind: "mat" },
  { kind: "circle", at: { at: "hand", dy: 3 }, r: 5.5, tone: "metal" },
  { kind: "circle", at: { at: "hand", dy: 3 }, r: 1.8, tone: "prop" },
];


/** Pelota de pilates bajo la zona lumbar, en los talones o bajo los antebrazos. */
const ball = (at: { at?: "hip" | "ankle" | "elbow"; dx: number; dy: number }, r = 12): Prop => ({ kind: "circle", at, r, tone: "pad" });

/** Tobilleras con peso en ambos tobillos. */
const ankleWeights: Prop[] = [
  { kind: "circle", at: { at: "ankleFar", dy: -2 }, r: 3.4, tone: "pad" },
  { kind: "circle", at: { at: "ankle", dy: -2 }, r: 3.4, tone: "pad" },
];

/** Saco colgado al frente (fijo respecto de la punta del pie adelantado), con su cadena. */
const punchingBag: Prop[] = [
  { kind: "line", from: { at: "toe", dx: 30, dy: -96 }, to: { at: "toe", dx: 30, dy: -110 }, tone: "metal", width: 1.8 },
  { kind: "block", at: { at: "toe", dx: 30, dy: -70 }, width: 20, height: 52, tone: "pad" },
];

/** Pared detrás (fija respecto de la punta del pie). */
const wall: Prop[] = [{ kind: "line", from: { at: "toe", dx: -44, dy: -104 }, tone: "metal", width: 3, toGround: true }];

export const equipmentIllustrations: Partial<Record<number, IllustrationSpec>> = {
  // Caminata inclinada en cinta: zancada con la pierna cercana adelante → pierna cercana atrás (brazos alternos).
  86: {
    start: {
      torso: 174, head: 176, arm: { upper: 28, lower: 70 }, armFar: { upper: -28, lower: -4 },
      leg: { upper: 22, lower: 4, foot: 104 }, legFar: { upper: -14, lower: -26, foot: 62 }, lift: 5, props: treadmill,
    },
    end: {
      torso: 174, head: 176, arm: { upper: -28, lower: -4 }, armFar: { upper: 28, lower: 70 },
      leg: { upper: -14, lower: -26, foot: 62 }, legFar: { upper: 22, lower: 4, foot: 104 }, lift: 5, props: treadmill,
      arrows: [{ at: { dx: -12, dy: 66 }, angle: -90, length: 10 }],
    },
  },
  // Elíptica: pierna cercana adelante y arriba, brazo cercano atrás → al revés (movimiento elíptico continuo).
  87: {
    start: {
      torso: 172, head: 174, arm: { upper: -8, lower: 60 }, armFar: { upper: 36, lower: 80 },
      leg: { upper: 34, lower: -2, foot: 96 }, legFar: { upper: -6, lower: -8, foot: 86 }, lift: 14, props: elliptical,
    },
    end: {
      torso: 172, head: 174, arm: { upper: 36, lower: 80 }, armFar: { upper: -8, lower: 60 },
      leg: { upper: -6, lower: -8, foot: 86 }, legFar: { upper: 34, lower: -2, foot: 96 }, lift: 14, props: elliptical,
      arrows: [{ at: { at: "knee", dx: 6, dy: -8 }, angle: 90, length: 9 }],
    },
  },
  // Remo en suspensión: cuerpo inclinado hacia atrás con los brazos extendidos → codos atrás y pecho a las manos.
  88: {
    start: { torso: 135, head: 138, arm: { upper: 150, lower: 150 }, leg: { upper: -45, lower: -45, foot: -135 }, props: suspension },
    end: {
      torso: 135, head: 142, arm: { upper: -30, lower: 168 }, leg: { upper: -45, lower: -45, foot: -135 }, props: suspension,
      arrows: [{ at: { at: "shoulder", dx: 6, dy: -12 }, angle: 145, length: 10 }],
    },
  },
  // Rueda abdominal: de rodillas con la rueda bajo los hombros → tronco y brazos extendidos al frente.
  89: {
    start: { torso: 132, head: 150, arm: { upper: 8, lower: 8 }, leg: { upper: 18, lower: -90, foot: -170 }, props: wheel },
    end: {
      torso: 103, head: 108, arm: { upper: 72, lower: 72 }, leg: { upper: -54, lower: -90, foot: -170 }, props: wheel,
      arrows: [{ at: { at: "hand", dx: 4, dy: -10 }, angle: 90, length: 10 }],
    },
  },
  // Lanzamiento de balón medicinal: de pie con el balón sobre la cabeza → cadera atrás y balón contra el suelo.
  90: {
    start: {
      torso: 180, head: 176, arm: { upper: 168, lower: 176 }, leg: { upper: 4, lower: -2 },
      props: [{ kind: "circle", at: { at: "hand", dx: 1, dy: -5 }, r: 6.5, tone: "prop" }],
    },
    end: {
      torso: 118, head: 132, arm: { upper: 12, lower: 14 }, leg: { upper: 62, lower: -18 },
      props: [{ kind: "circle", at: { at: "hand", dx: 1, dy: 5 }, r: 6.5, tone: "prop" }],
      arrows: [{ at: { at: "hand", dx: 10, dy: -14 }, angle: 0, length: 10 }],
    },
  },
  // Caminata lateral con minibanda (vista frontal): semisentadilla con la banda en los tobillos → paso al costado.
  91: {
    view: "front",
    start: {
      torso: 180, arm: { upper: 14, lower: -24 }, leg: { upper: 14, lower: 4, foot: 60 },
      props: [{ kind: "line", from: { at: "ankle", dy: -4 }, to: { at: "ankleFar", dy: -4 }, tone: "band", width: 2.4 }],
    },
    end: {
      torso: 180, arm: { upper: 14, lower: -24 }, leg: { upper: 30, lower: 22, foot: 70 }, legFar: { upper: 14, lower: 4, foot: 60 },
      props: [{ kind: "line", from: { at: "ankle", dy: -4 }, to: { at: "ankleFar", dy: -4 }, tone: "band", width: 2.4 }],
      arrows: [{ at: { at: "knee", dx: 8, dy: -4 }, angle: 90, length: 10 }],
    },
  },
  // Rodillo en espalda alta: boca arriba con el rodillo bajo las escápulas y la cadera arriba → rodar hacia la mitad de la espalda.
  92: {
    start: {
      torso: -78, head: -92, arm: { upper: 160, lower: 70 }, leg: { upper: 128, lower: 8 },
      props: [{ kind: "mat" }, { kind: "circle", at: { at: "shoulder", dx: 3, dy: 9 }, r: 7, tone: "pad" }],
    },
    end: {
      torso: -84, head: -96, arm: { upper: 160, lower: 70 }, leg: { upper: 118, lower: 14 },
      props: [{ kind: "mat" }, { kind: "circle", at: { at: "shoulder", dx: 12, dy: 8 }, r: 7, tone: "pad" }],
      arrows: [{ at: { at: "shoulder", dx: 6, dy: -10 }, angle: -90, length: 9 }],
    },
  },

  // Encogimiento en pelota: espalda apoyada en la pelota y brazos al frente → pecho arriba hacia las rodillas.
  93: {
    start: { torso: -78, head: -76, arm: { upper: 128, lower: 128 }, leg: { upper: 70, lower: 0 }, props: [ball({ dx: -10, dy: 18 }, 14)] },
    end: {
      torso: -122, head: -132, arm: { upper: 112, lower: 112 }, leg: { upper: 70, lower: 0 }, props: [ball({ dx: -10, dy: 18 }, 14)],
      arrows: [{ at: { at: "shoulder", dx: 2, dy: -10 }, angle: 150, length: 9 }],
    },
  },
  // Curl femoral con pelota: cadera arriba y piernas estiradas sobre la pelota → rodillas al pecho recogiendo la pelota.
  94: {
    start: {
      torso: -60, head: -82, arm: { upper: 90, lower: 90 }, leg: { upper: 94, lower: 92, foot: 175 },
      props: [{ kind: "mat" }, ball({ at: "ankle", dx: 3, dy: 10 }, 10)],
    },
    end: {
      torso: -42, head: -78, arm: { upper: 90, lower: 90 }, leg: { upper: 135, lower: 25, foot: 150 },
      props: [{ kind: "mat" }, ball({ at: "ankle", dx: 3, dy: 10 }, 10)],
      arrows: [{ at: { at: "ankle", dx: -4, dy: -14 }, angle: -90, length: 9 }],
    },
  },
  // Sentadilla en pared con pelota: de pie con la pelota en la zona lumbar → muslos paralelos rodando la pelota.
  95: {
    start: { torso: 176, arm: { upper: 8, lower: 8 }, leg: { upper: 18, lower: 18 }, props: [...wall, ball({ dx: -9, dy: -12 }, 8)] },
    end: {
      torso: 176, arm: { upper: 82, lower: 86 }, leg: { upper: 80, lower: -22 }, props: [...wall, ball({ dx: -9, dy: -12 }, 8)],
      arrows: [{ at: { at: "hip", dx: -4, dy: -10 }, angle: 0, length: 10 }],
    },
  },
  // Plancha en pelota: antebrazos en la pelota y cuerpo recto → antebrazos un poco más adelante.
  96: {
    start: { torso: 111.5, head: 115, arm: { upper: 0, lower: 90 }, leg: { upper: -68.5, lower: -68.5, foot: 15 }, props: [ball({ at: "elbow", dx: 2, dy: 11 }, 12)] },
    end: {
      torso: 106, head: 110, arm: { upper: 28, lower: 100 }, leg: { upper: -74, lower: -74, foot: 15 }, props: [ball({ at: "elbow", dx: 2, dy: 11 }, 12)],
      arrows: [{ at: { at: "elbow", dx: 10, dy: -6 }, angle: 90, length: 9 }],
    },
  },
  // Patada de glúteo con tobilleras: cuatro apoyos → talón hacia el techo con la rodilla doblada.
  97: {
    start: { torso: 103.5, arm: { upper: 0, lower: 0 }, leg: { upper: 0, lower: -88, foot: -85 }, props: [{ kind: "mat" }, ...ankleWeights] },
    end: {
      torso: 103.5, arm: { upper: 0, lower: 0 }, leg: { upper: -108, lower: 172, foot: -100 }, legFar: { upper: 0, lower: -88, foot: -85 },
      props: [{ kind: "mat" }, ...ankleWeights],
      arrows: [{ at: { at: "knee", dx: -4, dy: -10 }, angle: 180, length: 9 }],
    },
  },
  // Abducción de pie con tobilleras (vista frontal): de pie → pierna al costado sin inclinar el tronco.
  98: {
    view: "front",
    start: { torso: 180, arm: { upper: 12, lower: 8 }, leg: { upper: 3, lower: 3, foot: 60 }, props: ankleWeights },
    end: {
      torso: 180, arm: { upper: 12, lower: 8 }, leg: { upper: 36, lower: 36, foot: 70 }, legFar: { upper: 3, lower: 3, foot: 60 }, props: ankleWeights,
      arrows: [{ at: { at: "knee", dx: 8, dy: -4 }, angle: 120, length: 10 }],
    },
  },
  // Golpes al saco: en guardia con las manos a la cara → golpe recto con el brazo adelantado.
  99: {
    start: {
      torso: 175, head: 178, arm: { upper: 20, lower: 165 }, armFar: { upper: 34, lower: 160 },
      leg: { upper: 12, lower: 6, foot: 100 }, legFar: { upper: -14, lower: -8, foot: 80 }, props: punchingBag,
    },
    end: {
      torso: 168, head: 172, arm: { upper: 90, lower: 90 }, armFar: { upper: 34, lower: 160 },
      leg: { upper: 12, lower: 6, foot: 100 }, legFar: { upper: -14, lower: -8, foot: 80 }, props: punchingBag,
      arrows: [{ at: { at: "elbow", dx: 0, dy: -9 }, angle: 90, length: 10 }],
    },
  },
};
