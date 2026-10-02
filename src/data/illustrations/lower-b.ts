import type { IllustrationSpec, Pose, Prop } from "@/lib/illustration";

// Zancada hacia atrás (final compartido por 40 y 45): rodilla delantera sobre el tobillo, rodilla trasera cerca del suelo.
const lungeLegs: Pick<Pose, "leg" | "legFar"> = {
  leg: { upper: 85, lower: -3 },
  legFar: { upper: -12, lower: -100, foot: 31 },
};

// Rodillo de máquina junto al tobillo, unido por una palanca al eje de la rodilla.
const roller = (dx: number, dy: number): Prop[] => [
  { kind: "line", from: { at: "knee" }, to: { at: "ankle", dx, dy }, tone: "metal", width: 2.4 },
  { kind: "circle", at: { at: "ankle", dx, dy }, r: 4.2, tone: "pad" },
];

// Máquina de extensión: asiento bajo los muslos, columna y respaldo reclinado.
const legExtensionMachine: Prop[] = [
  { kind: "block", at: { dx: 5, dy: 7.5 }, width: 32, height: 6, tone: "pad" },
  { kind: "block", at: { dx: 3, dy: 10.5 }, width: 12, toGround: true },
  { kind: "block", at: { dx: -11.6, dy: -14 }, width: 30, height: 5, angle: 98, tone: "pad" },
];

// Máquina de curl tumbado: almohadilla bajo tronco y muslos (rodillas fuera), columna y agarres.
const legCurlMachine: Prop[] = [
  { kind: "block", at: { dx: 6, dy: 8.5 }, width: 56, height: 5, tone: "pad" },
  { kind: "block", at: { dx: 4, dy: 11 }, width: 12, toGround: true },
  { kind: "circle", at: { at: "hand" }, r: 2.2, tone: "metal" },
];

/** Zancadas, pantorrillas, acarreos y máquinas de pierna. */
export const lowerBIllustrations: Partial<Record<number, IllustrationSpec>> = {
  // Zancada hacia atrás: de pie con manos en la cadera → paso atrás, ambas rodillas a 90° y la de atrás cerca del suelo.
  40: {
    start: { torso: 180, arm: { upper: -35, lower: 44 }, leg: { upper: 0, lower: 0 } },
    end: {
      torso: 176, head: 178, arm: { upper: -40, lower: 40 }, ...lungeLegs,
      arrows: [{ at: { at: "hip", dx: -14, dy: -8 }, angle: 0, length: 10 }],
    },
  },
  // Sentadilla búlgara: empeine trasero sobre el banco → baja en vertical sobre la pierna delantera.
  41: {
    start: {
      torso: 176, head: 178, arm: { upper: -40, lower: 40 },
      leg: { upper: 18, lower: 2 }, legFar: { upper: -35.9, lower: -68.7, foot: -90 },
      props: [{ kind: "bench", at: { at: "toeFar", dx: -8, dy: 2.25 }, width: 20 }],
    },
    end: {
      torso: 168, head: 172, arm: { upper: -49, lower: 31 },
      leg: { upper: 82, lower: -8 }, legFar: { upper: -14, lower: -131, foot: -90 },
      props: [{ kind: "bench", at: { at: "toeFar", dx: -8, dy: 2.25 }, width: 20 }],
      arrows: [{ at: { at: "hip", dx: -14, dy: -8 }, angle: 0, length: 10 }],
    },
  },
  // Zancada con mancuernas: de pie con una mancuerna a cada lado → paso atrás y baja con el tronco alto.
  45: {
    start: { torso: 180, arm: { upper: 2, lower: 0 }, leg: { upper: 0, lower: 0 }, props: [{ kind: "dumbbell" }] },
    end: {
      torso: 176, head: 178, arm: { upper: -2, lower: -2 }, ...lungeLegs,
      props: [{ kind: "dumbbell" }],
      arrows: [{ at: { at: "hip", dx: -14, dy: -8 }, angle: 0, length: 10 }],
    },
  },
  // Subida al banco: pie completo sobre un banco bajo → de pie arriba con la pierna extendida.
  16: {
    start: {
      torso: 164, head: 170, arm: { upper: 8, lower: 14 },
      leg: { upper: 76, lower: -8 }, legFar: { upper: -13, lower: -17 },
      props: [{ kind: "bench", at: { at: "ankle", dx: -10, dy: 2.5 }, width: 28 }],
    },
    end: {
      torso: 180, arm: { upper: 2, lower: 6 }, leg: { upper: 0, lower: 0 }, lift: 11.7,
      props: [{ kind: "bench", at: { at: "ankle", dx: -10, dy: 2.5 }, width: 28 }],
      arrows: [{ at: { at: "hip", dx: -10, dy: 2 }, angle: 180, length: 10 }],
    },
  },
  // Elevación de talones: de pie, una mano en la pared y pies planos → en puntas de pie con los talones arriba.
  39: {
    start: {
      torso: 180, arm: { upper: 34, lower: 110 }, armFar: { upper: 0, lower: 0 }, leg: { upper: 0, lower: 0 },
      props: [{ kind: "block", at: { at: "hand", dx: 5.75, dy: -36.5 }, width: 6, toGround: true }],
    },
    end: {
      torso: 180, arm: { upper: 30, lower: 93 }, armFar: { upper: 0, lower: 0 }, leg: { upper: 0, lower: 0, foot: 45 },
      props: [{ kind: "block", at: { at: "hand", dx: 5.75, dy: -36.5 }, width: 6, toGround: true }],
      arrows: [{ at: { at: "ankle", dx: -7, dy: -2 }, angle: 180, length: 9 }],
    },
  },
  // Paseo del granjero: paso con una pierna delante → paso con la otra; tronco erguido y mancuernas pesadas a los lados.
  53: {
    start: {
      torso: 180, arm: { upper: 0, lower: 0 },
      leg: { upper: 18, lower: 8 }, legFar: { upper: -16.7, lower: -26.7, foot: 62 },
      props: [{ kind: "dumbbell" }],
    },
    end: {
      torso: 180, arm: { upper: 0, lower: 0 },
      leg: { upper: -16.7, lower: -26.7, foot: 72.6 }, legFar: { upper: 14, lower: 4 },
      props: [{ kind: "dumbbell" }],
      arrows: [{ at: { at: "hip", dx: 12, dy: -20 }, angle: 90, length: 10 }],
    },
  },
  // Extensión de cuádriceps: sentado en la máquina con rodillas a 90° → piernas extendidas; rodillo sobre los tobillos.
  65: {
    start: {
      torso: -172, head: 178, arm: { upper: 10, lower: 25 }, leg: { upper: 90, lower: -2, foot: 90 }, lift: 4,
      props: [...legExtensionMachine, ...roller(7.9, -3.7)],
    },
    end: {
      torso: -172, head: 178, arm: { upper: 10, lower: 25 }, leg: { upper: 90, lower: 86, foot: 178 }, lift: 22,
      props: [...legExtensionMachine, ...roller(-3.45, -8.06)],
      arrows: [{ at: { at: "ankle", dx: -4, dy: -15 }, angle: 180, length: 9 }],
    },
  },
  // Curl femoral en máquina (tumbado): piernas extendidas → talones hacia los glúteos sin despegar la cadera; rodillo tras los tobillos.
  66: {
    start: {
      torso: 90, head: 90, arm: { upper: -5, lower: 95 }, leg: { upper: -86, lower: -90, foot: 0 }, lift: 16.85,
      props: [...legCurlMachine, ...roller(4, -7.8)],
    },
    end: {
      torso: 90, head: 90, arm: { upper: -5, lower: 95 }, leg: { upper: -86, lower: 160, foot: -110 }, lift: 16.85,
      props: [...legCurlMachine, ...roller(5.96, 6.43)],
      arrows: [{ at: { at: "ankle", dx: 3, dy: -8 }, angle: 75, length: 9 }],
    },
  },
};
