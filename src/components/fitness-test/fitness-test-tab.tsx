"use client";

import { ArrowRight, Trash2 } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { Toast, useToast } from "@/components/ui/toast";
import { fitnessTests } from "@/data/fitness-test";
import { confirmAction } from "@/lib/confirm";
import { fitnessScore, levelLabels, scoreLevel, sortTests, testResults, testStatus, type FitnessTestEntry } from "@/lib/fitness-test";
import { useFitnessTests } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { formatShortDate, localDateKey } from "@/lib/utils";
import { TestReferences, TestReport } from "./test-report";

/** Progreso → Test físico: el último resultado con su comparación, cuándo toca el próximo y el historial. */
export function FitnessTestTab() {
  const now = useNow();
  const [tests, setTests] = useFitnessTests();
  const { toast, show } = useToast();
  if (!now) return <div className="prog-skeleton prog-skeleton-chart" aria-hidden="true" />;
  const status = testStatus(tests, localDateKey(new Date(now)));

  if (!status.last) {
    return (
      <div className="prog-stack ft-tab">
        <section className="ft-start">
          <p className="meta">Tu punto de partida</p>
          <h2 className="ft-start-title">Mide tu condición física en 12 minutos</h2>
          <p className="muted">Cuatro pruebas sencillas, con temporizador y voz. Repítelas cada 4 semanas y verás tu avance en números, aunque la balanza no se mueva.</p>
          <ol className="ft-plan">
            {fitnessTests.map((test, index) => (
              <li key={test.id} className="ft-plan-item">
                <span className="ft-plan-num num" aria-hidden="true">{index + 1}</span>
                <span className="grow"><strong>{test.title}</strong><small>{test.measure}</small></span>
              </li>
            ))}
          </ol>
          <ButtonLink href="/entrenar/test" size="l" block>Hacer mi primer test<ArrowRight size={18} aria-hidden="true" /></ButtonLink>
        </section>
        <TestReferences />
      </div>
    );
  }

  const history = sortTests(tests).reverse();

  async function remove(entry: FitnessTestEntry) {
    if (!(await confirmAction({ title: "¿Borrar este test?", message: `El test del ${formatShortDate(entry.date)} se borra de tu historial.`, confirmLabel: "Borrar", danger: true }))) return;
    setTests((items) => items.filter((item) => item.id !== entry.id));
    show("Test borrado");
  }

  return (
    <div className="prog-stack ft-tab">
      <section className={status.due ? "ft-next is-due" : "ft-next"} aria-label="Próximo test">
        <span className="grow">
          <strong>{status.due ? "Toca repetir tu test" : `Próximo test: ${formatShortDate(status.nextDate)}`}</strong>
          <small>{status.due ? "Pasaron 4 semanas: mira cuánto mejoraste." : `En ${status.daysLeft} ${status.daysLeft === 1 ? "día" : "días"}. Mientras, a entrenar.`}</small>
        </span>
        <ButtonLink href="/entrenar/test" size="s" variant={status.due ? "primary" : "secondary"}>{status.due ? "Hacer el test" : "Hacerlo ahora"}</ButtonLink>
      </section>

      <section className="section" aria-labelledby="ft-last-title">
        <h2 id="ft-last-title" className="meta">Último test · {formatShortDate(status.last.date)}</h2>
        <TestReport entry={status.last} previous={status.previous} />
      </section>

      <section className="section" aria-labelledby="ft-history-title">
        <h2 id="ft-history-title" className="meta">Historial</h2>
        <ul className="ft-history">
          {history.map((entry) => {
            const score = fitnessScore(testResults(entry));
            return (
              <li key={entry.id} className="ft-history-row">
                <span className="grow">
                  <strong>{formatShortDate(entry.date)}</strong>
                  <small>{Object.keys(entry.results).length} de {fitnessTests.length} pruebas</small>
                </span>
                <span className="ft-history-score"><b className="num">{score ?? "—"}</b>{score !== null && <small>{levelLabels[scoreLevel(score) - 1]}</small>}</span>
                <button type="button" className="icon-button" onClick={() => void remove(entry)} aria-label={`Borrar el test del ${formatShortDate(entry.date)}`}><Trash2 size={17} /></button>
              </li>
            );
          })}
        </ul>
      </section>

      <TestReferences />
      <Toast toast={toast} />
    </div>
  );
}
