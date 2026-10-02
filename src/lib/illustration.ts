import type { MuscleGroup } from "@/types";

/**
 * Ilustraciones de ejercicios: una figura estilizada definida por ángulos absolutos de cada segmento.
 *
 * Convención de ángulos (grados), con la figura mirando a la derecha en vista lateral:
 *   0° = hacia abajo · 90° = hacia adelante · 180° = hacia arriba · −90° = hacia atrás.
 * En vista frontal, 90° = hacia afuera (los miembros del otro lado se dibujan en espejo).
 * Cada ángulo indica la dirección del segmento desde la articulación proximal a la distal.
 */

export interface Limb {
  /** Brazo: hombro → codo. Pierna: cadera → rodilla. */
  upper: number;
  /** Brazo: codo → mano. Pierna: rodilla → tobillo. */
  lower: number;
  /** Sólo piernas: tobillo → punta del pie (por defecto 90°, pie plano hacia adelante). */
  foot?: number;
}

export type Anchor =
  | "hip" | "shoulder" | "head"
  | "elbow" | "hand" | "elbowFar" | "handFar"
  | "knee" | "ankle" | "toe" | "kneeFar" | "ankleFar" | "toeFar";

/** Punto relativo a una articulación (por defecto la cadera), en unidades del cuerpo. */
export interface PointRef {
  at?: Anchor;
  dx?: number;
  dy?: number;
}

export type Tone = "metal" | "prop" | "pad" | "band" | "cable";

export type Prop =
  /** Mancuernas en las manos (vistas de frente: un disco). */
  | { kind: "dumbbell"; hands?: "near" | "far" | "both" }
  /** Kettlebell colgando de la mano. */
  | { kind: "kettlebell"; at?: Anchor }
  /** Barra olímpica vista de punta: un disco grande en las manos (u otro punto). */
  | { kind: "barbell"; at?: Anchor; dx?: number; dy?: number }
  /** Banco: almohadilla desde `at` hacia adelante, con patas al suelo. */
  | { kind: "bench"; at: PointRef; width: number; angle?: number; legs?: boolean }
  /** Bloque rectangular (cajón, silla, asiento, respaldo, plataforma). `angle` en grados desde la horizontal. */
  | { kind: "block"; at: PointRef; width: number; height?: number; angle?: number; toGround?: boolean; tone?: Tone }
  /** Línea: banda, cable o estructura. `toGround` la prolonga verticalmente hasta el suelo desde `from`. */
  | { kind: "line"; from: PointRef; to?: PointRef; tone: Tone; width?: number; toGround?: boolean }
  | { kind: "circle"; at: PointRef; r: number; tone: Tone }
  /** Barra de dominadas vista de punta, con su soporte superior. */
  | { kind: "bar"; at?: Anchor }
  /** Colchoneta bajo el cuerpo. */
  | { kind: "mat" };

export interface Arrow {
  at: PointRef;
  /** Dirección de la flecha (misma convención de ángulos). */
  angle: number;
  length?: number;
}

export interface Pose {
  torso: number;
  head?: number;
  arm: Limb;
  armFar?: Limb;
  leg: Limb;
  legFar?: Limb;
  /** Altura del punto más bajo sobre el suelo (p. ej. colgado o sentado en una máquina). */
  lift?: number;
  props?: Prop[];
  arrows?: Arrow[];
}

export interface IllustrationSpec {
  view?: "side" | "front";
  start: Pose;
  end: Pose;
}

// ─── Proporciones (altura de pie ≈ 104 unidades) ───────────────────────────────

export const BODY = {
  torso: 31,
  neck: 5,
  headRadius: 7.5,
  upperArm: 18,
  forearm: 17,
  thigh: 26,
  shin: 25,
  foot: 10,
  shoulderHalf: 8.5,
  hipHalf: 5,
} as const;

const WIDTH = { torso: 12, torsoFront: 15, neck: 5, upperArm: 6.5, forearm: 5.5, thigh: 9, shin: 7, foot: 4.5 } as const;

export const PANEL = { width: 120, height: 130, ground: 123, padX: 6, padTop: 6, maxScale: 1.2 } as const;

/** Desplazamiento de los miembros lejanos (profundidad) en vista lateral. */
const FAR_OFFSET = { x: 2.5, y: -1.2 } as const;

export type BodyPart = "torso" | "neck" | "upperArm" | "forearm" | "thigh" | "shin" | "foot";

interface Point { x: number; y: number }

export interface SegmentShape { x1: number; y1: number; x2: number; y2: number; width: number; part: BodyPart; far: boolean }

export type PropShape =
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; width: number; tone: Tone; front: boolean }
  | { type: "rect"; cx: number; cy: number; w: number; h: number; angle: number; tone: Tone; front: boolean }
  | { type: "circle"; cx: number; cy: number; r: number; tone: Tone; front: boolean; hub?: boolean; far?: boolean };

export interface ArrowShape { x1: number; y1: number; x2: number; y2: number; head: string }

export interface PanelLayout {
  segments: SegmentShape[];
  head: { cx: number; cy: number; r: number };
  props: PropShape[];
  arrows: ArrowShape[];
  ground: number;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

function step(from: Point, angle: number, length: number): Point {
  return { x: from.x + Math.sin(rad(angle)) * length, y: from.y + Math.cos(rad(angle)) * length };
}

// ─── Cinemática ────────────────────────────────────────────────────────────────

interface Skeleton {
  joints: Record<Anchor, Point>;
  segments: SegmentShape[];
  head: { cx: number; cy: number; r: number };
}

function limbPoints(origin: Point, limb: Limb, kind: "arm" | "leg", mirror: boolean, footLength: number = BODY.foot) {
  const sign = mirror ? -1 : 1;
  const upperLength = kind === "arm" ? BODY.upperArm : BODY.thigh;
  const lowerLength = kind === "arm" ? BODY.forearm : BODY.shin;
  const middle = step(origin, limb.upper * sign, upperLength);
  const end = step(middle, limb.lower * sign, lowerLength);
  const tip = kind === "leg" ? step(end, (limb.foot ?? 90) * sign, footLength) : end;
  return { middle, end, tip };
}

function buildSkeleton(pose: Pose, view: "side" | "front"): Skeleton {
  const hip: Point = { x: 0, y: 0 };
  const shoulder = step(hip, pose.torso, BODY.torso);
  const headAngle = pose.head ?? pose.torso;
  const neckTop = step(shoulder, headAngle, BODY.neck);
  const headCenter = step(neckTop, headAngle, BODY.headRadius - 0.5);
  const segments: SegmentShape[] = [];
  const add = (a: Point, b: Point, part: BodyPart, far: boolean, width: number) => segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, width, part, far });

  const armFar = pose.armFar ?? pose.arm;
  const legFar = pose.legFar ?? pose.leg;

  if (view === "front") {
    // Vista frontal: lado "cercano" a la derecha del observador (abajo si el cuerpo está de lado); el lejano en espejo.
    // La línea de hombros y caderas es siempre perpendicular al tronco.
    const across = { x: -Math.cos(rad(pose.torso)), y: Math.sin(rad(pose.torso)) };
    const shoulderNear = { x: shoulder.x + across.x * BODY.shoulderHalf, y: shoulder.y + across.y * BODY.shoulderHalf };
    const shoulderFar = { x: shoulder.x - across.x * BODY.shoulderHalf, y: shoulder.y - across.y * BODY.shoulderHalf };
    const hipNear = { x: hip.x + across.x * BODY.hipHalf, y: hip.y + across.y * BODY.hipHalf };
    const hipFar = { x: hip.x - across.x * BODY.hipHalf, y: hip.y - across.y * BODY.hipHalf };
    const armN = limbPoints(shoulderNear, pose.arm, "arm", false);
    const armF = limbPoints(shoulderFar, armFar, "arm", true);
    // De frente, los pies se ven cortos y apuntando un poco hacia afuera.
    const legN = limbPoints(hipNear, pose.leg, "leg", false, BODY.foot * 0.55);
    const legF = limbPoints(hipFar, legFar, "leg", true, BODY.foot * 0.55);
    for (const [leg, origin] of [[legN, hipNear], [legF, hipFar]] as const) {
      add(origin, leg.middle, "thigh", false, WIDTH.thigh);
      add(leg.middle, leg.end, "shin", false, WIDTH.shin);
      add(leg.end, leg.tip, "foot", false, WIDTH.foot);
    }
    add(hip, shoulder, "torso", false, WIDTH.torsoFront);
    add(shoulderFar, shoulderNear, "torso", false, WIDTH.upperArm + 1);
    add(shoulder, neckTop, "neck", false, WIDTH.neck);
    for (const [arm, origin] of [[armN, shoulderNear], [armF, shoulderFar]] as const) {
      add(origin, arm.middle, "upperArm", false, WIDTH.upperArm);
      add(arm.middle, arm.end, "forearm", false, WIDTH.forearm);
    }
    return {
      joints: {
        hip, shoulder, head: headCenter,
        elbow: armN.middle, hand: armN.end, elbowFar: armF.middle, handFar: armF.end,
        knee: legN.middle, ankle: legN.end, toe: legN.tip, kneeFar: legF.middle, ankleFar: legF.end, toeFar: legF.tip,
      },
      segments,
      head: { cx: headCenter.x, cy: headCenter.y, r: BODY.headRadius },
    };
  }

  const armN = limbPoints(shoulder, pose.arm, "arm", false);
  const armF = limbPoints(shoulder, armFar, "arm", false);
  const legN = limbPoints(hip, pose.leg, "leg", false);
  const legF = limbPoints(hip, legFar, "leg", false);
  const o = FAR_OFFSET;
  const shift = (p: Point): Point => ({ x: p.x + o.x, y: p.y + o.y });

  // Orden de dibujo: lejanos detrás, luego tronco, pierna y brazo cercanos.
  add(shift(shoulder), shift(armF.middle), "upperArm", true, WIDTH.upperArm);
  add(shift(armF.middle), shift(armF.end), "forearm", true, WIDTH.forearm);
  add(shift(hip), shift(legF.middle), "thigh", true, WIDTH.thigh);
  add(shift(legF.middle), shift(legF.end), "shin", true, WIDTH.shin);
  add(shift(legF.end), shift(legF.tip), "foot", true, WIDTH.foot);
  add(hip, legN.middle, "thigh", false, WIDTH.thigh);
  add(legN.middle, legN.end, "shin", false, WIDTH.shin);
  add(legN.end, legN.tip, "foot", false, WIDTH.foot);
  add(hip, shoulder, "torso", false, WIDTH.torso);
  add(shoulder, neckTop, "neck", false, WIDTH.neck);
  add(shoulder, armN.middle, "upperArm", false, WIDTH.upperArm);
  add(armN.middle, armN.end, "forearm", false, WIDTH.forearm);

  return {
    joints: {
      hip, shoulder, head: headCenter,
      elbow: armN.middle, hand: armN.end, elbowFar: shift(armF.middle), handFar: shift(armF.end),
      knee: legN.middle, ankle: legN.end, toe: legN.tip, kneeFar: shift(legF.middle), ankleFar: shift(legF.end), toeFar: shift(legF.tip),
    },
    segments,
    head: { cx: headCenter.x, cy: headCenter.y, r: BODY.headRadius },
  };
}

// ─── Equipamiento ──────────────────────────────────────────────────────────────

/** Forma intermedia: las que llegan al suelo se completan después de ubicar la figura. */
type RawProp = PropShape & { toGround?: boolean };

function resolve(joints: Record<Anchor, Point>, ref: PointRef): Point {
  const base = joints[ref.at ?? "hip"];
  return { x: base.x + (ref.dx ?? 0), y: base.y + (ref.dy ?? 0) };
}

function buildProps(props: Prop[], joints: Record<Anchor, Point>): RawProp[] {
  const shapes: RawProp[] = [];
  for (const prop of props) {
    switch (prop.kind) {
      case "dumbbell": {
        const hands = prop.hands ?? "both";
        if (hands !== "near") shapes.push({ type: "circle", cx: joints.handFar.x, cy: joints.handFar.y, r: 4.6, tone: "metal", front: false, far: true, hub: true });
        if (hands !== "far") shapes.push({ type: "circle", cx: joints.hand.x, cy: joints.hand.y, r: 4.6, tone: "metal", front: true, hub: true });
        break;
      }
      case "kettlebell": {
        const hand = joints[prop.at ?? "hand"];
        shapes.push({ type: "line", x1: hand.x, y1: hand.y, x2: hand.x, y2: hand.y + 4, width: 2.4, tone: "metal", front: true });
        shapes.push({ type: "circle", cx: hand.x, cy: hand.y + 9.5, r: 6, tone: "metal", front: true });
        break;
      }
      case "barbell": {
        const at = joints[prop.at ?? "hand"];
        shapes.push({ type: "circle", cx: at.x + (prop.dx ?? 0), cy: at.y + (prop.dy ?? 0), r: 13, tone: "metal", front: true, hub: true });
        break;
      }
      case "bench": {
        const start = resolve(joints, prop.at);
        const angle = prop.angle ?? 0;
        const end = { x: start.x + Math.cos(rad(angle)) * prop.width, y: start.y - Math.sin(rad(angle)) * prop.width };
        const thickness = 5;
        // La almohadilla queda justo bajo la línea `at` → extremo (perpendicular a la inclinación).
        const normal = { x: Math.sin(rad(angle)) * (thickness / 2), y: Math.cos(rad(angle)) * (thickness / 2) };
        shapes.push({ type: "rect", cx: (start.x + end.x) / 2 + normal.x, cy: (start.y + end.y) / 2 + normal.y, w: prop.width, h: thickness, angle: -angle, tone: "pad", front: false });
        if (prop.legs !== false) {
          const inset = Math.min(8, prop.width * 0.18);
          const legA = { x: start.x + Math.cos(rad(angle)) * inset, y: start.y - Math.sin(rad(angle)) * inset + thickness };
          const legB = { x: end.x - Math.cos(rad(angle)) * inset, y: end.y + Math.sin(rad(angle)) * inset + thickness };
          shapes.push({ type: "line", x1: legA.x, y1: legA.y, x2: legA.x, y2: legA.y, width: 2.6, tone: "metal", front: false, toGround: true });
          shapes.push({ type: "line", x1: legB.x, y1: legB.y, x2: legB.x, y2: legB.y, width: 2.6, tone: "metal", front: false, toGround: true });
        }
        break;
      }
      case "block": {
        const at = resolve(joints, prop.at);
        const height = prop.height ?? 6;
        const angle = prop.angle ?? 0;
        if (prop.toGround) {
          // Bloque apoyado en el suelo: `at` es el centro de su cara superior.
          shapes.push({ type: "rect", cx: at.x, cy: at.y, w: prop.width, h: 0, angle: 0, tone: prop.tone ?? "prop", front: false, toGround: true });
        } else {
          shapes.push({ type: "rect", cx: at.x, cy: at.y, w: prop.width, h: height, angle: -angle, tone: prop.tone ?? "prop", front: false });
        }
        break;
      }
      case "line": {
        const from = resolve(joints, prop.from);
        const to = prop.to ? resolve(joints, prop.to) : from;
        shapes.push({ type: "line", x1: from.x, y1: from.y, x2: to.x, y2: to.y, width: prop.width ?? (prop.tone === "band" ? 2.2 : prop.tone === "cable" ? 1.4 : 3), tone: prop.tone, front: prop.tone === "band" || prop.tone === "cable", toGround: prop.toGround });
        break;
      }
      case "circle": {
        const at = resolve(joints, prop.at);
        shapes.push({ type: "circle", cx: at.x, cy: at.y, r: prop.r, tone: prop.tone, front: true });
        break;
      }
      case "bar": {
        const at = joints[prop.at ?? "hand"];
        shapes.push({ type: "line", x1: at.x - 16, y1: at.y - 9, x2: at.x + 16, y2: at.y - 9, width: 2.4, tone: "metal", front: false });
        shapes.push({ type: "line", x1: at.x, y1: at.y - 9, x2: at.x, y2: at.y, width: 2, tone: "metal", front: false });
        shapes.push({ type: "circle", cx: at.x, cy: at.y, r: 2.6, tone: "metal", front: true });
        break;
      }
      case "mat":
        break;
    }
  }
  return shapes;
}

// ─── Encuadre ──────────────────────────────────────────────────────────────────

interface Box { minX: number; maxX: number; minY: number; maxY: number }

function grow(box: Box, x: number, y: number, pad = 0) {
  box.minX = Math.min(box.minX, x - pad);
  box.maxX = Math.max(box.maxX, x + pad);
  box.minY = Math.min(box.minY, y - pad);
  box.maxY = Math.max(box.maxY, y + pad);
}

function bounds(skeleton: Skeleton, props: RawProp[]): Box {
  const box: Box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  for (const s of skeleton.segments) {
    grow(box, s.x1, s.y1, s.width / 2);
    grow(box, s.x2, s.y2, s.width / 2);
  }
  grow(box, skeleton.head.cx, skeleton.head.cy, skeleton.head.r);
  for (const p of props) {
    if (p.type === "circle") grow(box, p.cx, p.cy, p.r);
    else if (p.type === "line") {
      grow(box, p.x1, p.y1, p.width / 2);
      grow(box, p.x2, p.y2, p.width / 2);
    } else if (!p.toGround) {
      const cos = Math.abs(Math.cos(rad(p.angle)));
      const sin = Math.abs(Math.sin(rad(p.angle)));
      const hx = (p.w / 2) * cos + (p.h / 2) * sin;
      const hy = (p.w / 2) * sin + (p.h / 2) * cos;
      grow(box, p.cx - hx, p.cy - hy);
      grow(box, p.cx + hx, p.cy + hy);
    } else {
      grow(box, p.cx - p.w / 2, p.cy);
      grow(box, p.cx + p.w / 2, p.cy);
    }
  }
  return box;
}

function arrowShape(from: Point, angle: number, length: number, scale: number, map: (p: Point) => Point): ArrowShape {
  const start = map(from);
  const end = { x: start.x + Math.sin(rad(angle)) * length * scale, y: start.y + Math.cos(rad(angle)) * length * scale };
  const size = 4.2;
  const left = step(end, angle + 150, size);
  const right = step(end, angle - 150, size);
  return { x1: start.x, y1: start.y, x2: end.x, y2: end.y, head: `M${left.x.toFixed(2)},${left.y.toFixed(2)} L${end.x.toFixed(2)},${end.y.toFixed(2)} L${right.x.toFixed(2)},${right.y.toFixed(2)}` };
}

/** Calcula las dos viñetas (inicio y final) con la misma escala, apoyadas en el suelo y centradas. */
export function layoutIllustration(spec: IllustrationSpec): [PanelLayout, PanelLayout] {
  const view = spec.view ?? "side";
  const built = [spec.start, spec.end].map((pose) => {
    const skeleton = buildSkeleton(pose, view);
    const props = buildProps(pose.props ?? [], skeleton.joints);
    return { pose, skeleton, props, box: bounds(skeleton, props) };
  });

  const availableW = PANEL.width - PANEL.padX * 2;
  const availableH = PANEL.ground - PANEL.padTop;
  // `lift` está en unidades del cuerpo y se escala junto con la figura.
  const scale = Math.min(PANEL.maxScale, ...built.map(({ box, pose }) => (
    Math.min(availableW / (box.maxX - box.minX), availableH / (box.maxY - box.minY + (pose.lift ?? 0)))
  )));

  return built.map(({ pose, skeleton, props, box }) => {
    const tx = PANEL.width / 2 - ((box.minX + box.maxX) / 2) * scale;
    const ty = PANEL.ground - (box.maxY + (pose.lift ?? 0)) * scale;
    const map = (p: Point): Point => ({ x: p.x * scale + tx, y: p.y * scale + ty });

    const segments = skeleton.segments.map((s) => {
      const a = map({ x: s.x1, y: s.y1 });
      const b = map({ x: s.x2, y: s.y2 });
      return { ...s, x1: a.x, y1: a.y, x2: b.x, y2: b.y, width: s.width * scale };
    });
    const headCenter = map({ x: skeleton.head.cx, y: skeleton.head.cy });

    const shapes: PropShape[] = [];
    if ((pose.props ?? []).some((p) => p.kind === "mat")) {
      const left = box.minX * scale + tx - 4;
      const right = box.maxX * scale + tx + 4;
      shapes.push({ type: "rect", cx: (left + right) / 2, cy: PANEL.ground - 1.2, w: right - left, h: 2.4, angle: 0, tone: "pad", front: false });
    }
    for (const p of props) {
      if (p.type === "circle") {
        const c = map({ x: p.cx, y: p.cy });
        shapes.push({ ...p, cx: c.x, cy: c.y, r: p.r * scale });
      } else if (p.type === "line") {
        const a = map({ x: p.x1, y: p.y1 });
        const b = p.toGround ? { x: a.x, y: PANEL.ground } : map({ x: p.x2, y: p.y2 });
        shapes.push({ type: "line", x1: a.x, y1: a.y, x2: b.x, y2: b.y, width: p.width * scale, tone: p.tone, front: p.front });
      } else if (p.toGround) {
        const top = map({ x: p.cx, y: p.cy });
        const h = Math.max(0, PANEL.ground - top.y);
        shapes.push({ type: "rect", cx: top.x, cy: top.y + h / 2, w: p.w * scale, h, angle: 0, tone: p.tone, front: false });
      } else {
        const c = map({ x: p.cx, y: p.cy });
        shapes.push({ type: "rect", cx: c.x, cy: c.y, w: p.w * scale, h: p.h * scale, angle: p.angle, tone: p.tone, front: p.front });
      }
    }

    const arrows = (pose.arrows ?? []).map((arrow) => arrowShape(resolve(skeleton.joints, arrow.at), arrow.angle, arrow.length ?? 12, scale, map));
    return { segments, head: { cx: headCenter.x, cy: headCenter.y, r: skeleton.head.r * scale }, props: shapes, arrows, ground: PANEL.ground };
  }) as [PanelLayout, PanelLayout];
}

/** Segmentos que se destacan según los músculos principales del ejercicio. */
export function highlightedParts(primary: MuscleGroup[]): Set<BodyPart> {
  const parts = new Set<BodyPart>();
  for (const muscle of primary) {
    if (["quads", "hamstrings", "glutes", "adductors"].includes(muscle)) parts.add("thigh");
    if (muscle === "calves") parts.add("shin");
    if (["chest", "back", "lats", "traps", "abs", "obliques", "lowerBack"].includes(muscle)) parts.add("torso");
    if (["shoulders", "biceps", "triceps"].includes(muscle)) parts.add("upperArm");
    if (muscle === "forearms") parts.add("forearm");
  }
  return parts;
}
