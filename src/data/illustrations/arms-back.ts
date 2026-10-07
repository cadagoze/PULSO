import type { IllustrationSpec, Prop } from "@/lib/illustration";

// Banda bajo los pies hasta las manos.
const bandUnderFeet: Prop[] = [{ kind: "line", from: { at: "toe", dx: -5, dy: 0.5 }, to: { at: "hand" }, tone: "band" }];

// Polea baja al frente: columna, polea cerca del suelo y cable hasta el agarre.
const lowPulley: Prop[] = [
  { kind: "line", from: { dx: 38, dy: -18 }, tone: "metal", width: 3.5, toGround: true },
  { kind: "line", from: { dx: 35.5, dy: 44 }, to: { at: "hand" }, tone: "cable" },
  { kind: "circle", at: { dx: 35.5, dy: 44 }, r: 2.6, tone: "metal" },
  { kind: "circle", at: { at: "hand" }, r: 2.2, tone: "metal" },
];

// Puerta al frente (de canto) con la banda anclada arriba.
const highDoor: Prop[] = [
  { kind: "line", from: { dx: 34, dy: -90 }, tone: "prop", width: 4, toGround: true },
  { kind: "line", from: { dx: 31.5, dy: -85.5 }, to: { at: "hand" }, tone: "band" },
  { kind: "circle", at: { dx: 31.5, dy: -85.5 }, r: 1.8, tone: "metal" },
];

// Puerta al frente con la banda anclada a la altura de la cara.
const faceDoor: Prop[] = [
  { kind: "line", from: { dx: 60, dy: -66 }, tone: "prop", width: 4, toGround: true },
  { kind: "line", from: { dx: 57.5, dy: -43 }, to: { at: "hand" }, tone: "band" },
  { kind: "circle", at: { dx: 57.5, dy: -43 }, r: 1.8, tone: "metal" },
];

// Puerta cerrada al frente con la toalla pasada por la manilla.
const towelDoor: Prop[] = [
  { kind: "line", from: { dx: 40, dy: -74 }, tone: "prop", width: 4, toGround: true },
  { kind: "line", from: { dx: 37.5, dy: -30 }, to: { at: "hand" }, tone: "pad", width: 2.4 },
  { kind: "circle", at: { dx: 37.5, dy: -30 }, r: 1.8, tone: "metal" },
];

// Banco para curl concentrado (sentado) y patada de tríceps (rodilla y mano apoyadas).
const seat: Prop[] = [{ kind: "bench", at: { dx: -16, dy: 6 }, width: 30 }, { kind: "dumbbell", hands: "near" }];
const kneelBench: Prop[] = [{ kind: "bench", at: { dx: -30, dy: 27.5 }, width: 68 }, { kind: "dumbbell", hands: "near" }];
const flatBench: Prop[] = [{ kind: "bench", at: { dx: -10, dy: 6 }, width: 56 }, { kind: "dumbbell", hands: "near" }];

/** Brazos, espalda y hombros: curls, tríceps, remos sin equipo, pull-over, elevaciones y face pull con banda. */
export const armsBackIllustrations: Partial<Record<number, IllustrationSpec>> = {
  // Curl martillo: de pie, brazos estirados con las palmas enfrentadas → antebrazos arriba con los codos quietos.
  100: {
    start: { torso: 180, arm: { upper: 0, lower: 2 }, leg: { upper: 3, lower: -2 }, props: [{ kind: "dumbbell" }] },
    end: { torso: 180, arm: { upper: 6, lower: 146 }, leg: { upper: 3, lower: -2 }, props: [{ kind: "dumbbell" }], arrows: [{ at: { at: "hand", dx: 9, dy: 9 }, angle: 180, length: 9 }] },
  },
  // Curl con banda: de pie sobre la banda → manos a los hombros, codos pegados.
  101: {
    start: { torso: 180, arm: { upper: 0, lower: 6 }, leg: { upper: 3, lower: -2 }, props: bandUnderFeet },
    end: { torso: 180, arm: { upper: 4, lower: 150 }, leg: { upper: 3, lower: -2 }, props: bandUnderFeet, arrows: [{ at: { at: "hand", dx: 9, dy: 9 }, angle: 180, length: 9 }] },
  },
  // Curl en polea: frente a la polea baja → agarre a los hombros.
  102: {
    start: { torso: 180, arm: { upper: 2, lower: 14 }, leg: { upper: 3, lower: -2 }, props: lowPulley },
    end: { torso: 180, arm: { upper: 6, lower: 148 }, leg: { upper: 3, lower: -2 }, props: lowPulley, arrows: [{ at: { at: "hand", dx: -8, dy: 9 }, angle: 180, length: 9 }] },
  },
  // Curl concentrado: sentado e inclinado, codo en el muslo con el brazo colgando → mancuerna al hombro.
  103: {
    start: { torso: 150, head: 160, arm: { upper: 10, lower: 10 }, leg: { upper: 90, lower: 0 }, legFar: { upper: 76, lower: -10 }, props: seat },
    end: { torso: 150, head: 160, arm: { upper: 10, lower: 150 }, leg: { upper: 90, lower: 0 }, legFar: { upper: 76, lower: -10 }, props: seat, arrows: [{ at: { at: "hand", dx: 9, dy: 8 }, angle: 180, length: 9 }] },
  },
  // Extensión de tríceps con banda: codos pegados con las manos arriba → brazos estirados abajo.
  104: {
    start: { torso: 172, head: 176, arm: { upper: -2, lower: 110 }, leg: { upper: 4, lower: -4 }, props: highDoor },
    end: { torso: 172, head: 176, arm: { upper: -2, lower: -2 }, leg: { upper: 4, lower: -4 }, props: highDoor, arrows: [{ at: { at: "hand", dx: 7, dy: -12 }, angle: 0, length: 9 }] },
  },
  // Patada de tríceps: rodilla y mano lejanas en el banco, codo atrás y alto → antebrazo estirado hacia atrás.
  105: {
    start: {
      torso: 105, arm: { upper: -98, lower: 0 }, armFar: { upper: 0, lower: 0 }, leg: { upper: -8, lower: -8 }, legFar: { upper: 0, lower: -90, foot: -90 }, props: kneelBench,
    },
    end: {
      torso: 105, arm: { upper: -98, lower: -98 }, armFar: { upper: 0, lower: 0 }, leg: { upper: -8, lower: -8 }, legFar: { upper: 0, lower: -90, foot: -90 }, props: kneelBench,
      arrows: [{ at: { at: "hand", dx: 4, dy: 8 }, angle: -90, length: 9 }],
    },
  },
  // Flexión diamante: plancha alta con las manos juntas bajo el pecho → pecho cerca de las manos, codos pegados.
  106: {
    start: { torso: 108, arm: { upper: -4, lower: -4 }, leg: { upper: -72, lower: -72, foot: 15 } },
    end: { torso: 94, head: 96, arm: { upper: -82, lower: 18 }, leg: { upper: -86, lower: -86, foot: 15 }, arrows: [{ at: { at: "shoulder", dx: 0, dy: -12 }, angle: 0, length: 9 }] },
  },
  // Remo en W boca abajo: acostado, brazos doblados junto al cuerpo → codos atrás y arriba, pecho apenas despegado.
  107: {
    start: { torso: 90, head: 94, arm: { upper: -92, lower: 76 }, leg: { upper: -88, lower: -88, foot: -80 }, props: [{ kind: "mat" }] },
    end: { torso: 95, head: 100, arm: { upper: -136, lower: 100 }, leg: { upper: -88, lower: -88, foot: -80 }, props: [{ kind: "mat" }], arrows: [{ at: { at: "elbow", dx: 0, dy: -8 }, angle: 180, length: 9 }] },
  },
  // Remo con toalla: inclinado atrás con los brazos estirados hacia la puerta → pecho a las manos, codos atrás.
  108: {
    start: { torso: 200, head: 196, arm: { upper: 104, lower: 104 }, leg: { upper: 22, lower: 22 }, legFar: { upper: 22, lower: 22 }, props: towelDoor },
    end: { torso: 190, head: 188, arm: { upper: -30, lower: 92 }, leg: { upper: 14, lower: 14 }, legFar: { upper: 14, lower: 14 }, props: towelDoor, arrows: [{ at: { at: "elbow", dx: 2, dy: -9 }, angle: -90, length: 9 }] },
  },
  // Pull-over: acostado en el banco con la mancuerna detrás de la cabeza → brazos verticales sobre el pecho.
  109: {
    start: { torso: 90, head: 90, arm: { upper: 104, lower: 108 }, leg: { upper: -70, lower: 0, foot: -90 }, props: flatBench },
    end: { torso: 90, head: 90, arm: { upper: 180, lower: 180 }, leg: { upper: -70, lower: 0, foot: -90 }, props: flatBench, arrows: [{ at: { at: "hand", dx: 6, dy: 10 }, angle: -90, length: 9 }] },
  },
  // Elevaciones frontales: brazos abajo con mancuernas → al frente a la altura de los hombros.
  110: {
    start: { torso: 180, arm: { upper: 4, lower: 6 }, leg: { upper: 3, lower: -2 }, props: [{ kind: "dumbbell" }] },
    end: { torso: 180, arm: { upper: 88, lower: 90 }, leg: { upper: 3, lower: -2 }, props: [{ kind: "dumbbell" }], arrows: [{ at: { at: "elbow", dx: 2, dy: 9 }, angle: 150, length: 9 }] },
  },
  // Face pull con banda: banda a la altura de la cara y brazos al frente → manos a la frente con los codos altos.
  111: {
    start: { torso: 180, arm: { upper: 108, lower: 108 }, leg: { upper: 9, lower: 0 }, legFar: { upper: -9, lower: -9 }, props: faceDoor },
    end: { torso: 180, arm: { upper: -124, lower: 100 }, leg: { upper: 9, lower: 0 }, legFar: { upper: -9, lower: -9 }, props: faceDoor, arrows: [{ at: { at: "hand", dx: 22, dy: 6 }, angle: -90, length: 10 }] },
  },
};
