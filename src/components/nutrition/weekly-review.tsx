import { Check, Scale } from "lucide-react";
import { Button, NumberMetric } from "@/components/ui";
import { WeightLogButton } from "@/components/progress/weight-sheet";
import { formatKcal } from "@/lib/nutrition";
import { MIN_SPAN_DAYS, MIN_WEIGH_INS, type WeeklyReview, type WeightTrend } from "@/lib/weekly-review";
import { cn } from "@/lib/utils";

type Ready = Extract<WeeklyReview, { status: "ready" }>;

const kg = (value: number) => Math.abs(value).toLocaleString("es-CL", { maximumFractionDigits: 2 });

function observedText(value: number) {
  if (Math.abs(value) < 0.05) return "tu peso se mantiene estable";
  return value < 0 ? `bajas ${kg(value)} kg por semana` : `subes ${kg(value)} kg por semana`;
}

function plannedText(value: number) {
  if (Math.abs(value) < 0.05) return "mantenerte";
  return value < 0 ? `bajar ${kg(value)} kg por semana` : `subir ${kg(value)} kg por semana`;
}

const headlines: Record<Ready["verdict"], string> = {
  "on-track": "Vas según lo planeado",
  lower: "Conviene comer un poco menos",
  raise: "Conviene comer un poco más",
  floor: "Ya estás en tu mínimo seguro",
  adherence: "Primero, acércate a tu objetivo",
};

/**
 * Revisión semanal: tendencia del peso frente al plan y la propuesta de calorías para la próxima
 * semana. Si faltan pesajes, explica cuántos y deja registrar uno.
 */
export function WeeklyReviewCard({ review, onAnswer }: { review: WeeklyReview; onAnswer: (apply: boolean) => void }) {
  if (review.status === "collecting") return <Collecting weighIns={review.weighIns} spanDays={review.spanDays} />;
  if (review.status !== "ready") return null;
  const { verdict, currentKcal, suggestedKcal, change, intakeAvg, loggedDays } = review;
  const adjusting = verdict === "lower" || verdict === "raise";

  return (
    <section id="revision" className="cnt-section nut-review-wrap" aria-labelledby="nut-review-title">
      <div className="cnt-head">
        <h2 className="meta">Revisión semanal</h2>
        <span className="cnt-hint">Según tus pesajes de 3 semanas</span>
      </div>
      <div className={cn("nut-review", `is-${verdict}`)}>
        <div className="nut-review-head">
          <h3 id="nut-review-title" className="title-m">{headlines[verdict]}</h3>
          <p>Según tus pesajes, {observedText(review.observedKgWeek)}; tu plan apunta a {plannedText(review.plannedKgWeek)}.</p>
        </div>
        <TrendChart trend={review.trend} />
        <div className="nut-review-proposal">
          <NumberMetric
            size="l"
            value={formatKcal(suggestedKcal)}
            unit="kcal"
            label={adjusting ? `al día · ${change > 0 ? "+" : "−"}${formatKcal(Math.abs(change))} respecto de hoy` : "al día · sin cambios"}
          />
          <p className="nut-note muted">
            {adjusting && <>{verdict === "raise" && review.observedKgWeek < 0 && "Bajar tan rápido puede costarte músculo y energía. "}Te proponemos pasar de <b className="num">{formatKcal(currentKcal)}</b> a <b className="num">{formatKcal(suggestedKcal)}</b> kcal. Ajustamos de a poco, como máximo 200 kcal por semana, porque el peso varía con el agua y la sal.</>}
            {verdict === "on-track" && <>Mantén <b className="num">{formatKcal(currentKcal)}</b> kcal al día. Volvemos a revisar en una semana.</>}
            {verdict === "floor" && <>No bajamos de <b className="num">{formatKcal(review.floorKcal)}</b> kcal, tu mínimo seguro. Para avanzar, suma pasos o una sesión de intervalos a la semana.</>}
            {verdict === "adherence" && intakeAvg !== null && <>En los <b className="num">{loggedDays}</b> días que registraste completos comiste en promedio <b className="num">{formatKcal(intakeAvg)}</b> kcal, unas <b className="num">{formatKcal(intakeAvg - currentKcal)}</b> más que tu objetivo. Antes de bajar calorías, intenta acercarte a <b className="num">{formatKcal(currentKcal)}</b>.</>}
          </p>
          {verdict !== "adherence" && (
            <p className="nut-review-intake subtle">
              {intakeAvg !== null
                ? <>Registraste <span className="num">{loggedDays}</span> días completos: promedio <span className="num">{formatKcal(intakeAvg)}</span> kcal.</>
                : "Supone que comes cerca de tu objetivo. Registrar tus comidas hace la revisión más precisa."}
            </p>
          )}
        </div>
        <div className="nut-review-actions">
          {adjusting ? (
            <>
              <Button block onClick={() => onAnswer(true)}><Check size={18} />Aplicar {formatKcal(suggestedKcal)} kcal</Button>
              <Button variant="secondary" block onClick={() => onAnswer(false)}>Mantener {formatKcal(currentKcal)}</Button>
            </>
          ) : (
            <Button block onClick={() => onAnswer(false)}><Check size={18} />Entendido</Button>
          )}
        </div>
      </div>
    </section>
  );
}

/** Pesajes (puntos) y recta de tendencia de las últimas semanas. */
function TrendChart({ trend }: { trend: WeightTrend }) {
  const width = 320;
  const height = 96;
  const pad = 10;
  const days = (date: string) => new Date(`${date}T12:00:00`).getTime() / 86_400_000;
  const start = days(trend.points[0].date);
  const span = Math.max(1, days(trend.points[trend.points.length - 1].date) - start);
  const values = [...trend.points.map((point) => point.weight), trend.from.weight, trend.to.weight];
  const min = Math.min(...values) - 0.2;
  const max = Math.max(...values) + 0.2;
  const x = (date: string) => pad + ((days(date) - start) / span) * (width - pad * 2);
  const y = (weight: number) => pad + ((max - weight) / (max - min)) * (height - pad * 2);
  const first = trend.points[0];
  const last = trend.points[trend.points.length - 1];
  return (
    <figure className="nut-review-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Peso de ${first.weight} a ${last.weight} kg; tendencia ${trend.kgPerWeek} kg por semana`}>
        <line className="nut-review-trend" x1={x(trend.from.date)} y1={y(trend.from.weight)} x2={x(trend.to.date)} y2={y(trend.to.weight)} />
        {trend.points.map((point) => <circle key={point.date} className="nut-review-point" cx={x(point.date)} cy={y(point.weight)} r={4} />)}
      </svg>
      <figcaption className="nut-review-scale">
        <span className="num">{first.weight.toLocaleString("es-CL")} kg</span>
        <span className="num">{last.weight.toLocaleString("es-CL")} kg</span>
      </figcaption>
    </figure>
  );
}

/** Aún faltan pesajes: cuántos y desde cuándo, con el botón para registrar uno. */
function Collecting({ weighIns, spanDays }: { weighIns: number; spanDays: number }) {
  const missing = Math.max(0, MIN_WEIGH_INS - weighIns);
  return (
    <section className="cnt-section" aria-labelledby="nut-review-collect-title">
      <div className="cnt-head">
        <h2 className="meta">Revisión semanal</h2>
      </div>
      <div className="nut-review nut-review-collect">
        <span className="icon-tile" aria-hidden="true"><Scale size={19} /></span>
        <div className="grow">
          <h3 id="nut-review-collect-title">Pésate para ajustar tus calorías</h3>
          <p>
            Con {MIN_WEIGH_INS} pesajes en al menos {MIN_SPAN_DAYS} días comparamos tu progreso real con el plan y ajustamos tus calorías.{" "}
            {missing > 0
              ? <>Te {missing === 1 ? "falta" : "faltan"} <b className="num">{missing}</b> {missing === 1 ? "pesaje" : "pesajes"}.</>
              : <>Faltan <b className="num">{MIN_SPAN_DAYS - spanDays}</b> días para tener un período suficiente.</>}
          </p>
          <div className="nut-review-dots" aria-hidden="true">
            {Array.from({ length: MIN_WEIGH_INS }, (_, index) => <span key={index} className={cn(index < weighIns && "is-done")} />)}
          </div>
          <p className="subtle nut-review-tip">Pésate en ayunas y a la misma hora.</p>
          <WeightLogButton variant="primary" label="Registrar peso" />
        </div>
      </div>
    </section>
  );
}
