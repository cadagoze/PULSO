import type { IllustrationSpec, Prop } from "@/lib/illustration";

// Prensa 45°: respaldo reclinado, asiento, base, riel a 45° con poste y placa de discos del carro.
const legPress: Prop[] = [
  { kind: "line", from: { dx: 7.07, dy: 7.07 }, to: { dx: 56.56, dy: -42.43 }, tone: "metal" },
  { kind: "line", from: { dx: 56.56, dy: -42.43 }, tone: "metal", toGround: true },
  { kind: "block", at: { dx: 4, dy: 11 }, width: 12, toGround: true },
  { kind: "block", at: { dx: -20.97, dy: -4.93 }, width: 46, height: 5, angle: -35, tone: "pad" },
  { kind: "block", at: { dx: 5, dy: 8.5 }, width: 16, height: 5, angle: 12, tone: "pad" },
  { kind: "line", from: { at: "ankle", dx: 8.46, dy: -10.16 }, to: { at: "ankle", dx: 16.38, dy: -2.24 }, tone: "metal" },
  { kind: "block", at: { at: "ankle", dx: 1.84, dy: -6.64 }, width: 24, height: 5, angle: -62, tone: "metal" },
  { kind: "circle", at: { at: "ankle", dx: 8.46, dy: -10.16 }, r: 6, tone: "metal" },
];

/** Sentadillas, bisagras de cadera y puentes. */
export const lowerAIllustrations: Partial<Record<number, IllustrationSpec>> = {
  // Sentadilla con peso corporal: de pie → muslos paralelos, brazos al frente para equilibrar.
  30: {
    start: { torso: 180, arm: { upper: 8, lower: 8 }, leg: { upper: 0, lower: 0 } },
    end: { torso: 135, head: 160, arm: { upper: 85, lower: 88 }, leg: { upper: 82, lower: -25 }, arrows: [{ at: { at: "hip", dx: -6, dy: -8 }, angle: 0, length: 10 }] },
  },
  // Sentadilla goblet: de pie con la mancuerna al pecho → muslos paralelos, tronco erguido y carga pegada.
  10: {
    start: { torso: 180, arm: { upper: 4, lower: 145 }, leg: { upper: 0, lower: 0 }, props: [{ kind: "dumbbell", hands: "near" }] },
    end: {
      torso: 148, head: 160, arm: { upper: -28, lower: 113 }, leg: { upper: 86, lower: -28 }, props: [{ kind: "dumbbell", hands: "near" }],
      arrows: [{ at: { at: "hip", dx: -6, dy: -8 }, angle: 0, length: 10 }],
    },
  },
  // Sentadilla sumo (vista frontal): postura amplia con la pesa colgando → rodillas hacia afuera, tronco erguido.
  44: {
    view: "front",
    start: { torso: 180, arm: { upper: 14.5, lower: -31.6 }, leg: { upper: 20, lower: 20 }, props: [{ kind: "kettlebell", at: "hip" }] },
    end: {
      torso: 180, arm: { upper: 14.5, lower: -31.6 }, leg: { upper: 70, lower: -16 }, props: [{ kind: "kettlebell", at: "hip" }],
      arrows: [{ at: { at: "hip", dx: 22, dy: -14 }, angle: 0, length: 9 }],
    },
  },
  // Sentadilla con barra: barra sobre la espalda alta → muslos paralelos con la barra sobre el medio del pie.
  59: {
    start: { torso: 172, head: 162, arm: { upper: -52, lower: 142 }, leg: { upper: 0, lower: 0 }, props: [{ kind: "barbell", at: "shoulder", dx: -5.6, dy: 0.2 }] },
    end: {
      torso: 135, head: 125, arm: { upper: -89, lower: 105 }, leg: { upper: 85, lower: -30 }, props: [{ kind: "barbell", at: "shoulder", dx: -4.6, dy: -3.2 }],
      arrows: [{ at: { at: "hip", dx: -6, dy: -8 }, angle: 0, length: 10 }],
    },
  },
  // Prensa de piernas: rodillas flexionadas con los pies en la plataforma → piernas extendidas sin bloquear.
  20: {
    start: { torso: -125, arm: { upper: 14.7, lower: 82 }, leg: { upper: 176.5, lower: 91.5, foot: -152 }, lift: 14, props: legPress },
    end: {
      torso: -125, arm: { upper: 14.7, lower: 82 }, leg: { upper: 139.9, lower: 129.9, foot: -152 }, lift: 14, props: legPress,
      arrows: [{ at: { at: "knee", dx: 14.6, dy: -3 }, angle: 135, length: 10 }],
    },
  },
  // Peso muerto rumano: de pie con mancuernas frente a los muslos → cadera atrás, espalda plana y rodillas suaves.
  11: {
    start: { torso: 180, arm: { upper: 14, lower: 14 }, leg: { upper: 5, lower: -4 }, props: [{ kind: "dumbbell" }] },
    end: {
      torso: 115, head: 125, arm: { upper: -8, lower: -8 }, leg: { upper: 32, lower: 4 }, props: [{ kind: "dumbbell" }],
      arrows: [{ at: { at: "hip", dx: -8, dy: -2 }, angle: -90, length: 9 }],
    },
  },
  // Peso muerto rumano con barra: barra pegada a los muslos → cadera atrás hasta las rodillas, espalda neutra.
  22: {
    start: { torso: 180, arm: { upper: 10, lower: 10 }, leg: { upper: 5, lower: -4 }, props: [{ kind: "barbell", dy: 3 }] },
    end: {
      torso: 115, head: 125, arm: { upper: -13.7, lower: -13.7 }, leg: { upper: 32, lower: 4 }, props: [{ kind: "barbell", dy: 3 }],
      arrows: [{ at: { at: "hip", dx: -8, dy: -2 }, angle: -90, length: 9 }],
    },
  },
  // Peso muerto convencional: barra en el suelo sobre el medio del pie → de pie, cadera extendida y barra en los muslos.
  63: {
    start: { torso: 121.6, head: 140, arm: { upper: -3.2, lower: -3.2 }, leg: { upper: 75, lower: -12 }, props: [{ kind: "barbell", dy: 3 }] },
    end: {
      torso: 180, arm: { upper: 9.9, lower: 9.9 }, leg: { upper: 0, lower: 0 }, props: [{ kind: "barbell", dy: 3 }],
      arrows: [{ at: { at: "hip", dx: -12, dy: 4 }, angle: 180, length: 10 }],
    },
  },
  // Hip thrust con mancuerna: espalda alta en el banco y cadera abajo → puente con rodillas, cadera y hombros alineados.
  51: {
    start: {
      torso: -135, head: -160, arm: { upper: 26.7, lower: 111.3 }, leg: { upper: 128.2, lower: 18.1 },
      props: [{ kind: "bench", at: { dx: -55.8, dy: -11.31 }, width: 36 }, { kind: "dumbbell", hands: "near" }],
    },
    end: {
      torso: -90, head: -120, arm: { upper: 88.9, lower: 130.1 }, leg: { upper: 90, lower: 0 },
      props: [{ kind: "bench", at: { dx: -58, dy: 6 }, width: 36 }, { kind: "dumbbell", hands: "near" }],
      arrows: [{ at: { at: "hip", dx: 3, dy: 18 }, angle: 180, length: 9 }],
    },
  },
  // Hip thrust con barra: barra sobre la cadera y cadera abajo → puente completo con el tronco horizontal.
  64: {
    start: {
      torso: -135, head: -160, arm: { upper: 22, lower: 110.9 }, leg: { upper: 128.2, lower: 18.1 },
      props: [{ kind: "bench", at: { dx: -55.8, dy: -11.31 }, width: 36 }, { kind: "barbell", at: "hip", dx: 0.7, dy: -11.3 }],
    },
    end: {
      torso: -90, head: -120, arm: { upper: 82.7, lower: 129.4 }, leg: { upper: 90, lower: 0 },
      props: [{ kind: "bench", at: { dx: -58, dy: 6 }, width: 36 }, { kind: "barbell", at: "hip", dy: -8.5 }],
      arrows: [{ at: { at: "hip", dx: 3, dy: 18 }, angle: 180, length: 9 }],
    },
  },
  // Swing con kettlebell: bisagra con la pesa entre las piernas → cadera extendida y pesa a la altura del pecho.
  52: {
    start: {
      torso: 125, head: 140, arm: { upper: -38, lower: -38 }, leg: { upper: 28, lower: 5 },
      props: [
        { kind: "line", from: { at: "hand" }, to: { at: "hand", dx: -2.46, dy: 3.15 }, tone: "metal", width: 2.4 },
        { kind: "circle", at: { at: "hand", dx: -5.85, dy: 7.49 }, r: 6, tone: "metal" },
      ],
    },
    end: {
      torso: 180, head: 168, arm: { upper: 86, lower: 86 }, leg: { upper: 0, lower: 0 }, props: [{ kind: "kettlebell" }],
      arrows: [{ at: { at: "hip", dx: -18, dy: 0 }, angle: 90, length: 9 }],
    },
  },
  // Puente de glúteos a una pierna: cadera en el suelo y una pierna extendida → cadera arriba, pelvis nivelada.
  33: {
    start: {
      torso: -90, head: -100, arm: { upper: 84.7, lower: 84.7 }, leg: { upper: 146, lower: 15.8 }, legFar: { upper: 146, lower: 146, foot: 190 },
      props: [{ kind: "mat" }],
    },
    end: {
      torso: -66.75, head: -100, arm: { upper: 84.7, lower: 84.7 }, leg: { upper: 113.25, lower: 0 }, legFar: { upper: 113.25, lower: 113.25, foot: 190 },
      props: [{ kind: "mat" }],
      arrows: [{ at: { at: "hip", dx: 0, dy: -9 }, angle: 180, length: 9 }],
    },
  },
};
