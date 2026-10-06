import type { MuscleGroup } from "@/types";

type Shape = { muscle?: MuscleGroup; d: string };

/** Siluetas simplificadas (lado izquierdo; el derecho se dibuja en espejo). viewBox 100×210. */
const front: Shape[] = [
  { d: "M50 3a9.5 11 0 1 1 0 22a9.5 11 0 1 1 0-22Z" },
  { d: "M45.5 24h4.5v7h-5.5Z" },
  { muscle: "traps", d: "M41 31q4.5-3.5 9-2.5v3.5q-4.5-.5-9 1.5Z" },
  { muscle: "shoulders", d: "M34 31q-9 0-11.5 10.5q-.5 6 2.5 9q3.5-6.5 10-11q2.5-5-1-8.5Z" },
  { muscle: "chest", d: "M36.5 35.5q6.5-3 13.5-1v16.5q-7.5 3.5-14 -.5q-2.5-7 .5-15Z" },
  { muscle: "biceps", d: "M23.5 52q-3.5 7-2.5 14.5q3.5 2.5 7 -1q2-7.5 1.5-15q-3.5-1.5-6 1.5Z" },
  { muscle: "forearms", d: "M20.5 69q-3.5 10-3.5 20.5q3 2.5 6 0q4-9.5 4-19.5q-3-3-6.5-1Z" },
  { d: "M18 92.5a3.6 5 0 1 1 0 10a3.6 5 0 1 1 0-10Z" },
  { muscle: "abs", d: "M42.5 55q4-1 7.5 0v37q-4 1.5-7.5-1.5q-1.5-18 0-35.5Z" },
  { muscle: "obliques", d: "M36.5 54.5q3.5.5 5 3.5v30q-3-2-5.5-9.5q-1.5-12 .5-24Z" },
  { d: "M35.5 91.5q14.5 5 29 0l-.5 8q-14 4-28 0Z" },
  { muscle: "quads", d: "M36.5 99q6-2.5 10.5.5q1.5 19.5-1 39q-5 3-9 0q-4-20-.5-39.5Z" },
  { muscle: "adductors", d: "M47.2 100q2.3.8 2.8 4.5l-.5 21q-2-1-2.8-7q.3-9.5.5-18.5Z" },
  { d: "M37.5 140.5q4-1.5 8 0v6q-4 1.5-8 0Z" },
  { muscle: "calves", d: "M37.5 148q5-2 8 1q1.5 16.5-1 33q-3 2.5-5.5 0q-3.5-17-1.5-34Z" },
  { d: "M38.5 184q3.5-1 6 0l1 8q-4 2-8 0Z" },
];

const back: Shape[] = [
  { d: "M50 3a9.5 11 0 1 1 0 22a9.5 11 0 1 1 0-22Z" },
  { d: "M45.5 24h4.5v6h-5.5Z" },
  { muscle: "traps", d: "M50 26.5l-7 3.5q-5 2.5-6 6q7 1.5 13 14Z" },
  { muscle: "shoulders", d: "M34 31q-9 0-11.5 10.5q-.5 6 2.5 9q3.5-6.5 10-11q2.5-5-1-8.5Z" },
  { muscle: "back", d: "M41 37.5q5 2 9 12.5v8.5q-6-3-10-11Z" },
  { muscle: "lats", d: "M36 40q3.5 6.5 13 18.5v12q-7 2-12-8q-4-11-1-22.5Z" },
  { muscle: "triceps", d: "M23.5 52q-3.5 7-2.5 14.5q3.5 2.5 7 -1q2-7.5 1.5-15q-3.5-1.5-6 1.5Z" },
  { muscle: "forearms", d: "M20.5 69q-3.5 10-3.5 20.5q3 2.5 6 0q4-9.5 4-19.5q-3-3-6.5-1Z" },
  { d: "M18 92.5a3.6 5 0 1 1 0 10a3.6 5 0 1 1 0-10Z" },
  { muscle: "lowerBack", d: "M42.5 72.5q4-1 7.5 0v18q-4 .5-7.5-1.5q-1-8.5 0-16.5Z" },
  { muscle: "obliques", d: "M37 65q3 4 5 8v16q-3-1.5-5.5-8q-1.5-8 .5-16Z" },
  { muscle: "glutes", d: "M36 92q7.5-3.5 14 1v15.5q-7.5 5-13.5.5q-3-8.5-.5-17Z" },
  { muscle: "hamstrings", d: "M36.5 112q6 1.5 10.5 0q1.5 13.5-1 28q-5 3-9 0q-3-14-.5-28Z" },
  { muscle: "adductors", d: "M47.5 112q2 1 2.5 4l-.5 13q-1.8-1-2.3-6Z" },
  { d: "M37.5 141.5q4-1.5 8 0v5q-4 1.5-8 0Z" },
  { muscle: "calves", d: "M37 148q6-2.5 9.5 2q1.5 11-2 22q-3 3-6 0q-3.5-12-1.5-24Z" },
  { d: "M38.5 175q3.5-1 6 0l1 17q-4 2-8 0Z" },
];

export type MuscleMapMode = "highlight" | "heat" | "recovery";

export interface MuscleMapProps {
  /** highlight: primarios y secundarios · heat: intensidad 0–1 · recovery: 0–100 (%). */
  mode?: MuscleMapMode;
  primary?: MuscleGroup[];
  secondary?: MuscleGroup[];
  values?: Partial<Record<MuscleGroup, number>>;
  views?: Array<"front" | "back">;
  captions?: boolean;
  className?: string;
  label?: string;
}

function recoveryColor(value: number) {
  if (value >= 85) return "var(--accent)";
  if (value >= 60) return "color-mix(in srgb, var(--accent) 55%, var(--warning))";
  if (value >= 35) return "var(--warning)";
  return "var(--danger)";
}

function fillFor(muscle: MuscleGroup | undefined, props: MuscleMapProps) {
  if (!muscle) return "var(--surface-3)";
  const { mode = "highlight", primary = [], secondary = [], values = {} } = props;
  if (mode === "highlight") {
    if (primary.includes(muscle)) return "var(--accent-text)";
    if (secondary.includes(muscle)) return "color-mix(in srgb, var(--accent) 70%, var(--map-base))";
    return "var(--map-base)";
  }
  const value = values[muscle];
  if (value === undefined) return "var(--map-base)";
  if (mode === "recovery") return recoveryColor(value);
  if (value <= 0) return "var(--map-base)";
  return `color-mix(in srgb, var(--accent-text) ${Math.round(25 + Math.min(1, value) * 75)}%, var(--map-base))`;
}

function Figure({ shapes, props, title }: { shapes: Shape[]; props: MuscleMapProps; title: string }) {
  return (
    <svg viewBox="0 0 100 210" role="img" aria-label={title}>
      {[false, true].map((mirrored) => (
        <g key={String(mirrored)} transform={mirrored ? "matrix(-1 0 0 1 100 0)" : undefined}>
          {shapes.map((shape, index) => (
            <path key={index} d={shape.d} className={shape.muscle ? "m-shape" : "m-shape m-neutral"} style={shape.muscle ? { fill: fillFor(shape.muscle, props) } : undefined} />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function MuscleMap(props: MuscleMapProps) {
  const views = props.views ?? ["front", "back"];
  return (
    <div className={`muscle-map ${props.className ?? ""}`} aria-label={props.label}>
      {views.map((view) => (
        <figure key={view}>
          <Figure shapes={view === "front" ? front : back} props={props} title={view === "front" ? "Vista frontal" : "Vista posterior"} />
          {props.captions !== false && <figcaption>{view === "front" ? "Frente" : "Espalda"}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

export function RecoveryLegend() {
  return (
    <div className="muscle-legend" aria-hidden="true">
      <span><i style={{ background: "var(--accent)" }} />Recuperado</span>
      <span><i style={{ background: "var(--warning)" }} />Parcial</span>
      <span><i style={{ background: "var(--danger)" }} />Fatigado</span>
    </div>
  );
}
