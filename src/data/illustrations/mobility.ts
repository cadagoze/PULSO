import type { IllustrationSpec } from "@/lib/illustration";

/** Movilidad, estiramientos y respiración. */
export const mobilityIllustrations: Partial<Record<number, IllustrationSpec>> = {
  // Movilidad de cadera 90/90 (vista frontal): piernas dobladas hacia un lado → cambio al otro lado.
  78: {
    view: "front",
    start: {
      torso: 180, arm: { upper: 5, lower: 56 }, armFar: { upper: 4, lower: 107 },
      leg: { upper: 83.5, lower: -115, foot: -150 }, legFar: { upper: 120, lower: -47.2, foot: -90 },
    },
    end: {
      torso: 180, arm: { upper: 4, lower: 107 }, armFar: { upper: 5, lower: 56 },
      leg: { upper: 120, lower: -47.2, foot: -90 }, legFar: { upper: 83.5, lower: -115, foot: -150 },
      arrows: [{ at: { at: "kneeFar", dx: 8, dy: -16 }, angle: -45, length: 9 }],
    },
  },
  // Gato-camello: espalda redondeada mirando el ombligo → espalda arqueada mirando al frente.
  79: {
    start: {
      torso: 103.5, head: 25, arm: { upper: 0, lower: 0 }, leg: { upper: 0, lower: -87.7, foot: -82.8 },
      props: [{ kind: "mat" }], arrows: [{ at: { dx: 14, dy: -14 }, angle: 180, length: 9 }],
    },
    end: {
      torso: 103.5, head: 140, arm: { upper: 0, lower: 0 }, leg: { upper: 0, lower: -87.7, foot: -82.8 },
      props: [{ kind: "mat" }], arrows: [{ at: { dx: 14, dy: -24 }, angle: 0, length: 9 }],
    },
  },
  // Rotación torácica: en cuatro apoyos con la mano en la nuca, codo hacia el suelo → codo hacia el techo.
  80: {
    start: {
      torso: 103.5, head: 60, arm: { upper: 11.1, lower: 163 }, armFar: { upper: 0, lower: 0 }, leg: { upper: 0, lower: -87.7, foot: -82.8 },
      props: [{ kind: "mat" }],
    },
    end: {
      torso: 103.5, head: 120, arm: { upper: 180, lower: 25.7 }, armFar: { upper: 0, lower: 0 }, leg: { upper: 0, lower: -87.7, foot: -82.8 },
      props: [{ kind: "mat" }], arrows: [{ at: { at: "elbow", dx: -9, dy: 4 }, angle: 180, length: 9 }],
    },
  },
  // Estiramiento de flexores de cadera: rodilla atrás sobre un cojín, tronco alto → cadera adelante y brazo arriba.
  81: {
    start: {
      torso: 180, arm: { upper: -34.8, lower: 48.7 }, leg: { upper: -10, lower: -78.5, foot: -82.8 }, legFar: { upper: 74.7, lower: 4.4 },
      props: [{ kind: "block", at: { at: "knee", dy: 4.5 }, width: 13, toGround: true, tone: "pad" }],
    },
    end: {
      torso: 180, arm: { upper: 166, lower: 170 }, armFar: { upper: -34.8, lower: 48.7 }, leg: { upper: -30, lower: -78.5, foot: -82.8 }, legFar: { upper: 79.5, lower: -16.4 },
      props: [{ kind: "block", at: { at: "knee", dy: 4.5 }, width: 13, toGround: true, tone: "pad" }],
      arrows: [{ at: { dx: -17, dy: -3 }, angle: 90, length: 9 }],
    },
  },
  // Círculos de hombros: brazos relajados a los costados → brazo arriba tras recorrer un círculo amplio por delante.
  82: {
    start: { torso: 180, arm: { upper: 8, lower: 14 }, leg: { upper: 0, lower: 0 } },
    end: {
      torso: 180, arm: { upper: 176, lower: 178 }, leg: { upper: 0, lower: 0 },
      props: [
        { kind: "circle", at: { at: "shoulder", dx: 13.7, dy: 37.6 }, r: 0.9, tone: "cable" },
        { kind: "circle", at: { at: "shoulder", dx: 22.9, dy: 32.8 }, r: 0.9, tone: "cable" },
        { kind: "circle", at: { at: "shoulder", dx: 30.6, dy: 25.7 }, r: 0.9, tone: "cable" },
        { kind: "circle", at: { at: "shoulder", dx: 36.3, dy: 16.9 }, r: 0.9, tone: "cable" },
        { kind: "circle", at: { at: "shoulder", dx: 39.4, dy: 6.9 }, r: 0.9, tone: "cable" },
        { kind: "circle", at: { at: "shoulder", dx: 39.8, dy: -3.5 }, r: 0.9, tone: "cable" },
        { kind: "circle", at: { at: "shoulder", dx: 37.6, dy: -13.7 }, r: 0.9, tone: "cable" },
        { kind: "circle", at: { at: "shoulder", dx: 32.8, dy: -22.9 }, r: 0.9, tone: "cable" },
        { kind: "circle", at: { at: "shoulder", dx: 25.7, dy: -30.6 }, r: 0.9, tone: "cable" },
        { kind: "circle", at: { at: "shoulder", dx: 16.9, dy: -36.3 }, r: 0.9, tone: "cable" },
      ],
      arrows: [{ at: { at: "shoulder", dx: 13.7, dy: -37.6 }, angle: -110, length: 8 }],
    },
  },
  // Sentadilla profunda asistida: de pie sujeto a un marco → cuclillas con talones apoyados, sin soltar el apoyo.
  83: {
    start: {
      torso: 178, arm: { upper: 45.4, lower: 102.4 }, leg: { upper: 0, lower: 0 },
      props: [{ kind: "line", from: { at: "hand", dx: 1.2, dy: -35.5 }, tone: "metal", width: 3.4, toGround: true }],
    },
    end: {
      torso: 168, arm: { upper: 72, lower: 72 }, leg: { upper: 115, lower: -35 },
      props: [{ kind: "line", from: { at: "hand", dx: 1.2, dy: -79.5 }, tone: "metal", width: 3.4, toGround: true }],
      arrows: [{ at: { dx: -10, dy: -14 }, angle: 0, length: 9 }],
    },
  },
  // Estiramiento de isquiotibiales de pie: talón adelante con la punta arriba → cadera atrás con la espalda larga.
  84: {
    start: { torso: 180, arm: { upper: -34.8, lower: 48.7 }, leg: { upper: 20, lower: 20, foot: 160 }, legFar: { upper: 14.1, lower: -17 } },
    end: {
      torso: 125, arm: { upper: -47.9, lower: 30.6 }, leg: { upper: 38, lower: 38, foot: 178 }, legFar: { upper: 48.4, lower: -15.1 },
      arrows: [{ at: { dx: -12, dy: -2 }, angle: -90, length: 9 }],
    },
  },
  // Respiración 90/90: boca arriba con las pantorrillas en una silla y la mano en el abdomen; inhala (sube) → exhala (baja).
  85: {
    start: {
      torso: 90, head: 97, arm: { upper: -166.9, lower: -49.5 }, leg: { upper: 180, lower: -90, foot: 175 },
      props: [{ kind: "block", at: { at: "knee", dx: -12, dy: 3.5 }, width: 26, toGround: true }],
      arrows: [{ at: { dx: 8.5, dy: -10 }, angle: 180, length: 8 }],
    },
    end: {
      torso: 90, head: 97, arm: { upper: -166.9, lower: -49.5 }, leg: { upper: 180, lower: -90, foot: 175 },
      props: [{ kind: "block", at: { at: "knee", dx: -12, dy: 3.5 }, width: 26, toGround: true }],
      arrows: [{ at: { dx: 8.5, dy: -19 }, angle: 0, length: 8 }],
    },
  },
};
