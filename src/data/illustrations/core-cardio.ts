import type { IllustrationSpec, Prop } from "@/lib/illustration";

/**
 * Cuerda de saltar en vista frontal: arco entre las manos aproximado con segmentos.
 * `hand` es la mano cercana respecto de la cadera; `reach` < 0 pasa sobre la cabeza y > 0 bajo los pies.
 */
function rope(hand: { x: number; y: number }, reach: number, segments = 16): Prop[] {
  const points = Array.from({ length: segments + 1 }, (_, index) => {
    const t = (Math.PI * index) / segments;
    const x = hand.x * Math.cos(t) * (1 + 0.3 * Math.sin(t));
    const y = hand.y + reach * Math.sin(t);
    return { dx: Math.round(x * 10) / 10, dy: Math.round(y * 10) / 10 };
  });
  return points.slice(1).map((to, index): Prop => ({ kind: "line", from: points[index], to, tone: "cable", width: 1.6 }));
}

/** Remo ergómetro fijo respecto de la punta del pie en el reposapiés (el asiento se desliza con la cadera). */
const rower: Prop[] = [
  { kind: "line", from: { at: "toe", dx: -71.6, dy: 11.25 }, to: { at: "toe", dx: 35.4, dy: 11.25 }, tone: "metal", width: 3 },
  { kind: "line", from: { at: "toe", dx: -69.6, dy: 11.25 }, tone: "metal", width: 2.6, toGround: true },
  { kind: "line", from: { at: "toe", dx: 35.4, dy: -12.25 }, tone: "metal", width: 3.5, toGround: true },
  { kind: "line", from: { at: "toe", dx: -1.7, dy: 7 }, to: { at: "toe", dx: -1.7, dy: 11.25 }, tone: "metal", width: 2.4 },
  { kind: "block", at: { at: "toe", dx: -1.72, dy: 5.92 }, width: 14, height: 3, angle: 38, tone: "pad" },
  { kind: "block", at: { dx: 0, dy: 8 }, width: 14, height: 4, tone: "pad" },
  { kind: "line", from: { at: "hand" }, to: { at: "toe", dx: 35.4, dy: -12.25 }, tone: "cable" },
  { kind: "circle", at: { at: "toe", dx: 35.4, dy: -12.25 }, r: 9.5, tone: "metal" },
  { kind: "circle", at: { at: "toe", dx: 35.4, dy: -12.25 }, r: 2.6, tone: "prop" },
  { kind: "circle", at: { at: "hand" }, r: 2, tone: "metal" },
];

/** Bici estática fija respecto de la cadera (sillín bajo la cadera, eje de pedales en 12,41.5). */
const bike = (pedal: { dx: number; dy: number }): Prop[] => [
  { kind: "block", at: { dx: 14, dy: 59.5 }, width: 60, height: 3, tone: "metal" },
  { kind: "line", from: { dx: -1, dy: 9 }, to: { dx: 12, dy: 41.5 }, tone: "metal", width: 3 },
  { kind: "line", from: { dx: 12, dy: 41.5 }, to: { dx: -5, dy: 58 }, tone: "metal", width: 3 },
  { kind: "line", from: { dx: 12, dy: 41.5 }, to: { dx: 37, dy: 58 }, tone: "metal", width: 3 },
  { kind: "line", from: { dx: 37, dy: 58 }, to: { dx: 40, dy: -13 }, tone: "metal", width: 3 },
  { kind: "line", from: { dx: 37, dy: -14 }, to: { dx: 45, dy: -18 }, tone: "pad", width: 3.5 },
  { kind: "block", at: { dx: -1, dy: 8 }, width: 13, height: 4, tone: "pad" },
  { kind: "line", from: { dx: 12, dy: 41.5 }, to: pedal, tone: "metal", width: 2.4 },
  { kind: "circle", at: { dx: 31, dy: 45.5 }, r: 10.5, tone: "metal" },
  { kind: "circle", at: { dx: 31, dy: 45.5 }, r: 2.8, tone: "prop" },
  { kind: "circle", at: { dx: 12, dy: 41.5 }, r: 2.2, tone: "metal" },
];

/** Core y cardio. Los ejercicios estáticos muestran preparación → posición mantenida. */
export const coreCardioIllustrations: Partial<Record<number, IllustrationSpec>> = {
  // Plancha en banco: manos en el banco con los pies cerca → pies atrás, cuerpo recto de cabeza a talones.
  24: {
    start: {
      torso: 113.5, arm: { upper: 0, lower: 0 }, leg: { upper: -12, lower: -12, foot: 90 },
      props: [{ kind: "bench", at: { at: "hand", dx: -8, dy: 2.75 }, width: 40 }],
    },
    end: {
      torso: 133, arm: { upper: 0, lower: 0 }, leg: { upper: -47, lower: -47, foot: 40 },
      props: [{ kind: "bench", at: { at: "hand", dx: -8, dy: 2.75 }, width: 40 }],
    },
  },
  // Plancha frontal: apoyo en rodillas y antebrazos → cuerpo recto sobre antebrazos y puntas de pie.
  34: {
    start: { torso: 108, arm: { upper: 0, lower: 90 }, leg: { upper: -72, lower: -90, foot: -90 }, props: [{ kind: "mat" }] },
    end: { torso: 96, arm: { upper: 0, lower: 90 }, leg: { upper: -84, lower: -84, foot: 15 }, props: [{ kind: "mat" }] },
  },
  // Plancha lateral (vista frontal): de lado sobre el antebrazo con la cadera abajo → cadera arriba en línea recta y brazo al techo.
  35: {
    view: "front",
    start: {
      torso: 129, arm: { upper: 0, lower: 90 }, armFar: { upper: 60.5, lower: 41.3 },
      leg: { upper: -90, lower: -90, foot: -90 }, legFar: { upper: 90, lower: 90, foot: 90 },
      props: [{ kind: "mat" }],
    },
    end: {
      torso: 102, arm: { upper: 0, lower: 90 }, armFar: { upper: 180, lower: 180 },
      leg: { upper: -78, lower: -78, foot: 0 }, legFar: { upper: 78, lower: 78, foot: 0 },
      props: [{ kind: "mat" }],
      arrows: [{ at: { dx: 4, dy: 20 }, angle: 180, length: 9 }],
    },
  },
  // Bicho muerto: boca arriba, brazos al techo y rodillas a 90° → pierna y brazo contrarios se extienden hacia el suelo.
  36: {
    start: { torso: -90, head: -92, arm: { upper: 180, lower: 180 }, leg: { upper: 180, lower: 90, foot: 180 }, props: [{ kind: "mat" }] },
    end: {
      torso: -90, head: -92, arm: { upper: 180, lower: 180 }, armFar: { upper: -100, lower: -100 },
      leg: { upper: 95, lower: 95, foot: 160 }, legFar: { upper: 180, lower: 90, foot: 180 },
      props: [{ kind: "mat" }],
      arrows: [{ at: { at: "knee", dy: -9 }, angle: 90, length: 9 }],
    },
  },
  // Cuadrupedia alterna: cuatro apoyos con la espalda neutra → brazo y pierna contrarios extendidos en línea.
  37: {
    start: { torso: 103.5, arm: { upper: 0, lower: 0 }, leg: { upper: 0, lower: -88, foot: -85 }, props: [{ kind: "mat" }] },
    end: {
      torso: 103.5, arm: { upper: 0, lower: 0 }, armFar: { upper: 95, lower: 95 },
      leg: { upper: -90, lower: -90, foot: -10 }, legFar: { upper: 0, lower: -88, foot: -85 },
      props: [{ kind: "mat" }],
    },
  },
  // Superman: boca abajo con brazos al frente → pecho, brazos y piernas se elevan apenas, mirada al suelo.
  38: {
    start: { torso: 90, head: 94, arm: { upper: 83, lower: 83 }, leg: { upper: -88, lower: -88, foot: -80 }, props: [{ kind: "mat" }] },
    end: {
      torso: 102, arm: { upper: 113, lower: 113 }, leg: { upper: -103, lower: -103, foot: -75 }, props: [{ kind: "mat" }],
      arrows: [{ at: { at: "ankle", dy: -7 }, angle: 180, length: 9 }],
    },
  },
  // Jumping jacks de bajo impacto (vista frontal): brazos abajo y pies juntos → brazos arriba y un pie abierto al costado.
  72: {
    view: "front",
    start: { torso: 180, arm: { upper: 8, lower: 4 }, leg: { upper: 0, lower: 0 } },
    end: {
      torso: 180, arm: { upper: 148, lower: 160 }, leg: { upper: 16, lower: 16, foot: 54 }, legFar: { upper: 0, lower: 0 },
      arrows: [{ at: { at: "elbow", dx: 6, dy: 4 }, angle: 160, length: 9 }],
    },
  },
  // Burpee adaptado: en cuclillas con las manos en el suelo → pies atrás hasta la plancha alta.
  73: {
    start: { torso: 122, head: 140, arm: { upper: 26.8, lower: 26.8 }, leg: { upper: 100, lower: -42 } },
    end: {
      torso: 108, arm: { upper: 0, lower: 0 }, leg: { upper: -72, lower: -72, foot: 15 },
      arrows: [{ at: { at: "knee", dy: -9 }, angle: -90, length: 10 }],
    },
  },
  // Escaladores: plancha alta → una rodilla al pecho, la otra pierna estirada atrás.
  74: {
    start: { torso: 108, arm: { upper: 0, lower: 0 }, leg: { upper: -72, lower: -72, foot: 15 } },
    end: {
      torso: 106, arm: { upper: 0, lower: 0 }, leg: { upper: 80, lower: -62, foot: -20 }, legFar: { upper: -68.7, lower: -68.7, foot: 15 },
      arrows: [{ at: { dx: 8, dy: 22 }, angle: 90, length: 10 }],
    },
  },
  // Saltar la cuerda (vista frontal): cuerda sobre la cabeza → cuerda bajo los pies con el cuerpo apenas en el aire.
  75: {
    view: "front",
    start: { torso: 180, arm: { upper: 14, lower: 50 }, leg: { upper: 0, lower: 0 }, props: rope({ x: 25.9, y: -2.6 }, -61) },
    end: { torso: 180, arm: { upper: 14, lower: 50 }, leg: { upper: 0, lower: 0 }, lift: 1.5, props: rope({ x: 25.9, y: -2.6 }, 60.5) },
  },
  // Remo ergómetro: agarre con rodillas flexionadas y brazos al frente → piernas extendidas y manilla al abdomen.
  76: {
    start: { torso: 160, head: 166, arm: { upper: 78, lower: 78 }, leg: { upper: 143.9, lower: -0.1, foot: 112 }, lift: 8, props: rower },
    end: {
      torso: -165, head: -172, arm: { upper: -11.4, lower: 105.4 }, leg: { upper: 87.7, lower: 77.7, foot: 128 }, lift: 8, props: rower,
      arrows: [{ at: { at: "hand", dx: 10, dy: -9 }, angle: -90, length: 9 }],
    },
  },
  // Bici estática: pierna cercana extendida con el pedal abajo → pierna cercana flexionada arriba (pedaleo alterno).
  77: {
    start: {
      torso: 160, head: 168, arm: { upper: 43.5, lower: 89.7 }, leg: { upper: 19.2, lower: -7.4, foot: 72 }, legFar: { upper: 62.1, lower: -49.5, foot: 52 },
      props: bike({ dx: 12, dy: 51.5 }),
    },
    end: {
      torso: 160, head: 168, arm: { upper: 43.5, lower: 89.7 }, leg: { upper: 68.5, lower: -45.1, foot: 52 }, legFar: { upper: 10.1, lower: -3.9, foot: 72 },
      props: bike({ dx: 12, dy: 31.5 }),
      arrows: [{ at: { at: "toe", dx: 2, dy: -6 }, angle: 60, length: 9 }],
    },
  },
};
