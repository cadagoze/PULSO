import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { fitnessTests } from "@/data/fitness-test";
import { compareTests, deltaLabel, fitnessScore, focusFor, isImprovement, levelLabels, scoreLevel, testResults, valueLabel, type FitnessTestEntry } from "@/lib/fitness-test";
import { cn, formatShortDate } from "@/lib/utils";

/** Cinco tramos, encendidos hasta el nivel. */
export function LevelMeter({ level }: { level: number }) {
  return (
    <span className="ft-meter" role="img" aria-label={`Nivel ${level} de 5: ${levelLabels[level - 1]}`}>
      {[1, 2, 3, 4, 5].map((step) => <i key={step} className={cn(step <= level && "is-on")} />)}
    </span>
  );
}

/** Resultado de un test: puntaje PULSO, cada prueba con su nivel y cambio, y qué trabajar. */
export function TestReport({ entry, previous }: { entry: FitnessTestEntry; previous: FitnessTestEntry | null }) {
  const results = testResults(entry);
  const score = fitnessScore(results);
  const comparison = previous ? compareTests(entry, previous) : null;
  const focus = focusFor(results);
  const scoreDelta = comparison?.scoreDelta ?? null;

  return (
    <div className="ft-report">
      <section className="ft-score" aria-label="Puntaje PULSO">
        <p className="meta">Puntaje PULSO</p>
        <p className="ft-score-num"><span className="num-display">{score ?? "—"}</span><small>/100</small></p>
        <p className="ft-score-level">
          <strong>{score === null ? "Sin referencia" : levelLabels[scoreLevel(score) - 1]}</strong>
          {scoreDelta !== null && previous && (
            <span className={cn("ft-delta", scoreDelta > 0 && "is-up", scoreDelta < 0 && "is-down")}>
              {scoreDelta > 0 ? "+" : scoreDelta < 0 ? "−" : "±"}{Math.abs(scoreDelta)} desde el {formatShortDate(previous.date)}
            </span>
          )}
        </p>
        {!previous && <p className="ft-score-note">Tu punto de partida. Repite el test en 4 semanas y mira cuánto mejoras.</p>}
      </section>

      <ul className="ft-results">
        {results.map((item) => {
          const delta = comparison?.deltas[item.test.id];
          return (
            <li key={item.test.id} className="ft-result">
              <div className="ft-result-head">
                <strong>{item.test.title}</strong>
                <span className="ft-result-value num">{valueLabel(item.test.id, item.value)}</span>
              </div>
              {item.level ? <LevelMeter level={item.level} /> : null}
              <div className="ft-result-foot">
                <small>{item.level ? levelLabels[item.level - 1] : "Sin referencia con rodillas apoyadas: se compara contigo."}</small>
                {delta !== undefined && (
                  <small className={cn("ft-delta", delta !== 0 && (isImprovement(item.test.id, delta) ? "is-up" : "is-down"))}>{deltaLabel(item.test.id, delta)}</small>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {focus && (
        <section className="ft-focus" aria-labelledby={`ft-focus-${entry.id}`}>
          <p className="meta">Tu punto a mejorar</p>
          <strong id={`ft-focus-${entry.id}`}>{focus.test.focus.area}</strong>
          <p>Súmale una o dos sesiones por semana y vuelve a medirte en 4 semanas.</p>
          <ButtonLink href={focus.test.focus.href} variant="secondary" size="s">{focus.test.focus.label}<ArrowRight size={15} aria-hidden="true" /></ButtonLink>
        </section>
      )}
    </div>
  );
}

/** De dónde salen las referencias, en una línea por prueba. */
export function TestReferences() {
  return (
    <details className="ft-refs">
      <summary>Sobre las referencias</summary>
      <p>Cada prueba se compara con personas de tu edad. Es una guía orientativa, no una evaluación médica: lo más valioso es compararte contigo cada 4 semanas.</p>
      <ul>
        {fitnessTests.map((test) => <li key={test.id}><b>{test.title}:</b> {test.source}.</li>)}
      </ul>
    </details>
  );
}
