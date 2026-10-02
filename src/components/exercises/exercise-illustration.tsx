import { highlightedParts, layoutIllustration, PANEL } from "@/lib/illustration";
import type { BodyPart, IllustrationSpec, PanelLayout, PropShape, SegmentShape } from "@/lib/illustration";
import { cn } from "@/lib/utils";
import type { MuscleGroup } from "@/types";

const f = (value: number) => Math.round(value * 100) / 100;

function Segment({ segment, accent }: { segment: SegmentShape; accent: boolean }) {
  return (
    <line
      className={cn("ill-seg", segment.far ? "far" : "near", accent && "accent")}
      x1={f(segment.x1)} y1={f(segment.y1)} x2={f(segment.x2)} y2={f(segment.y2)}
      strokeWidth={f(segment.width)}
    />
  );
}

function Prop({ shape }: { shape: PropShape }) {
  if (shape.type === "line") {
    return <line className={`ill-line tone-${shape.tone}`} x1={f(shape.x1)} y1={f(shape.y1)} x2={f(shape.x2)} y2={f(shape.y2)} strokeWidth={f(shape.width)} />;
  }
  if (shape.type === "circle") {
    return (
      <g className={shape.far ? "ill-far" : undefined}>
        <circle className={`ill-fill tone-${shape.tone}`} cx={f(shape.cx)} cy={f(shape.cy)} r={f(shape.r)} />
        {shape.hub && <circle className="ill-hub" cx={f(shape.cx)} cy={f(shape.cy)} r={f(shape.r * 0.3)} />}
      </g>
    );
  }
  return (
    <rect
      className={`ill-fill tone-${shape.tone}`}
      x={f(shape.cx - shape.w / 2)} y={f(shape.cy - shape.h / 2)} width={f(shape.w)} height={f(Math.max(shape.h, 0.1))}
      rx={f(Math.min(2.2, shape.h / 2))}
      transform={shape.angle ? `rotate(${f(shape.angle)} ${f(shape.cx)} ${f(shape.cy)})` : undefined}
    />
  );
}

function Panel({ layout, highlight }: { layout: PanelLayout; highlight: Set<BodyPart> }) {
  const farSegments = layout.segments.filter((segment) => segment.far);
  const nearSegments = layout.segments.filter((segment) => !segment.far);
  const neck = nearSegments.findIndex((segment) => segment.part === "neck");
  const beforeHead = nearSegments.slice(0, neck + 1);
  const afterHead = nearSegments.slice(neck + 1);
  const backProps = layout.props.filter((shape) => !shape.front && !(shape.type === "circle" && shape.far));
  const farProps = layout.props.filter((shape) => shape.type === "circle" && shape.far);
  const frontProps = layout.props.filter((shape) => shape.front && !(shape.type === "circle" && shape.far));
  return (
    <>
      <line className="ill-ground" x1={6} y1={layout.ground + 1} x2={PANEL.width - 6} y2={layout.ground + 1} />
      {backProps.map((shape, index) => <Prop key={`b${index}`} shape={shape} />)}
      {farSegments.map((segment, index) => <Segment key={`f${index}`} segment={segment} accent={highlight.has(segment.part)} />)}
      {farProps.map((shape, index) => <Prop key={`fp${index}`} shape={shape} />)}
      {beforeHead.map((segment, index) => <Segment key={`n${index}`} segment={segment} accent={highlight.has(segment.part)} />)}
      <circle className="ill-head" cx={f(layout.head.cx)} cy={f(layout.head.cy)} r={f(layout.head.r)} />
      {afterHead.map((segment, index) => <Segment key={`a${index}`} segment={segment} accent={highlight.has(segment.part)} />)}
      {frontProps.map((shape, index) => <Prop key={`p${index}`} shape={shape} />)}
      {layout.arrows.map((arrow, index) => (
        <g key={`arrow${index}`} className="ill-arrow">
          <line x1={f(arrow.x1)} y1={f(arrow.y1)} x2={f(arrow.x2)} y2={f(arrow.y2)} />
          <path d={arrow.head} />
        </g>
      ))}
    </>
  );
}

/**
 * Ilustración del ejercicio en dos viñetas (inicio → final), dibujada a partir de poses.
 * Los segmentos que trabajan (según los músculos principales) se destacan en lima.
 */
export function ExerciseIllustration({ spec, primary = [], panels = "both", labels = false, title, className }: {
  spec: IllustrationSpec;
  primary?: MuscleGroup[];
  panels?: "both" | "start" | "end";
  labels?: boolean;
  title?: string;
  className?: string;
}) {
  const layouts = layoutIllustration(spec);
  const highlight = highlightedParts(primary);
  const shown = panels === "both" ? [0, 1] : panels === "start" ? [0] : [1];
  return (
    <svg className={cn("ill", className)} viewBox={`0 0 ${PANEL.width * shown.length} ${PANEL.height}`} role="img" aria-label={title}>
      {shown.map((index, position) => (
        <g key={index} transform={position ? `translate(${PANEL.width * position} 0)` : undefined}>
          <Panel layout={layouts[index]} highlight={highlight} />
          {labels && <text className="ill-label" x={8} y={13}>{index === 0 ? "INICIO" : "FINAL"}</text>}
        </g>
      ))}
      {shown.length === 2 && <line className="ill-divider" x1={PANEL.width} y1={14} x2={PANEL.width} y2={PANEL.height - 14} />}
    </svg>
  );
}
