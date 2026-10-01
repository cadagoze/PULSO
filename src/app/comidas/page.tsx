"use client";

import { useNow } from "@/lib/use-now";
import { useRef, useState } from "react";
import { Check, Leaf, Pencil, Plus, Sparkles } from "lucide-react";
import { PageHeader, ProgressRing, Sheet } from "@/components/ui";
import { useMeals } from "@/lib/store";
import { formatLongDate } from "@/lib/utils";
import type { Meal } from "@/types";

const groups = ["Proteína", "Verduras", "Fruta", "Carbohidrato", "Bebida"];

const satietyLabels: Record<number, string> = {
  1: "Con hambre",
  2: "Algo de hambre",
  3: "Bien",
  4: "Satisfecho/a",
  5: "Muy lleno/a",
};

interface MealDetail {
  groups: string[];
  satiety: number | null;
  note: string;
}

/** El resumen guarda "Grupo · Grupo · Saciedad 4/5 — nota" para seguir siendo legible como texto. */
function parseSummary(summary?: string): MealDetail {
  if (!summary) return { groups: [], satiety: null, note: "" };
  const [main, ...noteParts] = summary.split(" — ");
  let satiety: number | null = null;
  const items: string[] = [];
  for (const part of main.split(" · ").map((item) => item.trim()).filter(Boolean)) {
    const match = /^Saciedad (\d)\/5$/.exec(part);
    if (match) satiety = Number(match[1]);
    else items.push(part);
  }
  return { groups: items, satiety, note: noteParts.join(" — ").trim() };
}

function buildSummary(detail: MealDetail) {
  const main = [...detail.groups, ...(detail.satiety ? [`Saciedad ${detail.satiety}/5`] : [])].join(" · ");
  const note = detail.note.trim().replace(/\s+/g, " ");
  return note ? `${main} — ${note}` : main;
}

function suggestionFor(next: Meal | undefined) {
  if (next?.id === "once") return { title: "Una once que evite el picoteo nocturno", detail: "Combina yogur natural o huevo con fruta y pan integral. La proteína ayuda a llegar con menos hambre a la cena." };
  if (next?.id === "cena") return { title: "Cierra el día con una cena simple", detail: "Usa medio plato de verduras, una porción de proteína y agrega carbohidrato si aún tienes hambre." };
  if (next) return { title: "Empieza con proteína y algo fresco", detail: "Una porción de proteína y una fruta o verdura te ayudan a sostener la energía hasta la próxima comida." };
  return { title: "Tu registro de hoy está completo", detail: "No necesitas compensar ni comer perfecto. Observa qué combinación te dio mejor energía y saciedad." };
}

function DaySummary({ meals }: { meals: Meal[] }) {
  const registered = meals.filter((meal) => meal.status === "Registrada");
  const details = registered.map((meal) => parseSummary(meal.summary));
  const rated = details.map((detail) => detail.satiety).filter((value): value is number => value !== null);
  const average = rated.length ? rated.reduce((total, value) => total + value, 0) / rated.length : null;
  const percent = meals.length ? (registered.length / meals.length) * 100 : 0;

  return (
    <section className="card card-l cnt-summary" aria-label="Resumen de hoy">
      <ProgressRing value={percent} size={104} label={`${registered.length} de ${meals.length} comidas registradas`}>
        <b className="num cnt-ring-value">{registered.length}<small>/{meals.length}</small></b>
        <span className="cnt-ring-label">comidas</span>
      </ProgressRing>
      <div className="cnt-summary-copy">
        <p className="eyebrow">Resumen de hoy</p>
        <h2>{registered.length === meals.length ? "Día completo" : registered.length === 0 ? "Aún sin registros" : "Vas bien encaminado"}</h2>
        <dl className="cnt-summary-stats">
          <div>
            <dt>Saciedad media</dt>
            <dd className="num">{average === null ? "—" : average.toLocaleString("es-CL", { maximumFractionDigits: 1 })}<small>/5</small></dd>
          </div>
          <div>
            <dt>Con verduras</dt>
            <dd className="num">{details.filter((detail) => detail.groups.includes("Verduras")).length}<small>/{meals.length}</small></dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function GroupBalance({ meals }: { meals: Meal[] }) {
  const registered = meals.filter((meal) => meal.status === "Registrada").map((meal) => parseSummary(meal.summary));
  if (!registered.length) return null;
  return (
    <section className="section">
      <div className="section-head">
        <h2>Equilibrio del día</h2>
        <span className="subtle cnt-count">en <span className="num">{registered.length}</span> {registered.length === 1 ? "comida" : "comidas"}</span>
      </div>
      <ul className="card cnt-balance">
        {groups.map((group) => {
          const count = registered.filter((detail) => detail.groups.includes(group)).length;
          return (
            <li key={group}>
              <span>{group}</span>
              <span className="cnt-balance-track" aria-hidden="true">
                <i style={{ width: `${(count / registered.length) * 100}%` }} />
              </span>
              <b className="num">{count}</b>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function MealRow({ meal, onOpen }: { meal: Meal; onOpen: () => void }) {
  const done = meal.status === "Registrada";
  const detail = parseSummary(meal.summary);
  return (
    <li className={`cnt-meal ${done ? "is-done" : ""}`}>
      <span className="cnt-meal-time num">{meal.time}</span>
      <span className="cnt-meal-dot" aria-hidden="true">{done && <Check size={13} strokeWidth={3} />}</span>
      <div className="cnt-meal-body">
        <div className="cnt-meal-head">
          <h3>{meal.name}</h3>
          <span className={`badge ${done ? "" : "badge-muted"}`}>{meal.status}</span>
        </div>
        {done ? (
          <>
            <div className="cnt-meal-tags">
              {detail.groups.map((group) => <span key={group}>{group}</span>)}
              {detail.satiety !== null && <span className="cnt-meal-satiety">Saciedad <b className="num">{detail.satiety}/5</b></span>}
            </div>
            {detail.note && <p className="cnt-meal-note">{detail.note}</p>}
          </>
        ) : (
          <p className="cnt-meal-note">Aún no registrada</p>
        )}
      </div>
      <button type="button" className="btn-icon cnt-meal-action" onClick={onOpen} aria-label={done ? `Editar ${meal.name}` : `Registrar ${meal.name}`}>
        {done ? <Pencil size={16} /> : <Plus size={18} />}
      </button>
    </li>
  );
}

function MealForm({ meal, onSave }: { meal: Meal; onSave: (detail: MealDetail) => void }) {
  const initial = parseSummary(meal.summary);
  const [selected, setSelected] = useState<string[]>(initial.groups);
  const [satiety, setSatiety] = useState(initial.satiety ?? 3);
  const [note, setNote] = useState(initial.note);

  function toggle(group: string) {
    setSelected((items) => (items.includes(group) ? items.filter((item) => item !== group) : [...items, group]));
  }

  return (
    <form
      className="cnt-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (selected.length) onSave({ groups: groups.filter((group) => selected.includes(group)), satiety, note });
      }}
    >
      <fieldset className="cnt-fieldset">
        <legend>¿Qué incluyó?</legend>
        <div className="chips">
          {groups.map((group) => (
            <button key={group} type="button" className="chip" aria-pressed={selected.includes(group)} onClick={() => toggle(group)}>
              {selected.includes(group) && <Check size={14} />}
              {group}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="field cnt-satiety">
        <span className="spread">
          <span>Saciedad</span>
          <span className="cnt-satiety-value"><b className="num">{satiety}/5</b> · {satietyLabels[satiety]}</span>
        </span>
        <input type="range" min={1} max={5} step={1} value={satiety} onChange={(event) => setSatiety(Number(event.target.value))} aria-valuetext={`${satiety} de 5, ${satietyLabels[satiety]}`} />
        <span className="cnt-satiety-scale" aria-hidden="true"><span>Con hambre</span><span>Muy lleno/a</span></span>
      </label>
      <label className="field">
        Nota opcional
        <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={140} placeholder="¿Cómo te sentiste después de comer?" />
      </label>
      <button type="submit" className="btn btn-primary btn-block" disabled={selected.length === 0}>
        Guardar comida
      </button>
    </form>
  );
}

export default function MealsPage() {
  const [meals, setMeals] = useMeals();
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const toastTimer = useRef<number | null>(null);
  const now = useNow();
  const openMeal = meals.find((meal) => meal.id === openId) ?? null;
  const nextMeal = meals.find((meal) => meal.status === "Pendiente");
  const suggestion = suggestionFor(nextMeal);

  function saveMeal(detail: MealDetail) {
    if (!openId) return;
    setMeals((items) => items.map((item) => (item.id === openId ? { ...item, status: "Registrada", summary: buildSummary(detail) } : item)));
    setOpenId(null);
    setToast(true);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(false), 2500);
  }

  return (
    <div className="page cnt-page">
      <PageHeader
        backHref="/perfil"
        eyebrow={now ? formatLongDate(new Date(now)) : "Hoy"}
        title="Comidas"
        subtitle="Reconoce patrones de energía y saciedad sin contar calorías."
      />

      <div className="cnt-meals-layout">
        <div className="cnt-meals-main">
          <DaySummary meals={meals} />
          <section className="section">
            <div className="section-head"><h2>Tu día</h2></div>
            <ol className="cnt-timeline">
              {meals.map((meal) => <MealRow key={meal.id} meal={meal} onOpen={() => setOpenId(meal.id)} />)}
            </ol>
          </section>
        </div>
        <div className="cnt-meals-side">
          <aside className="card card-l cnt-suggestion">
            <span className="cnt-suggestion-icon"><Sparkles size={20} /></span>
            <p className="eyebrow">{nextMeal ? `Idea para ${nextMeal.name.toLocaleLowerCase("es-CL")}` : "Lectura de tu día"}</p>
            <h2>{suggestion.title}</h2>
            <p className="cnt-suggestion-detail"><Leaf size={15} /> {suggestion.detail}</p>
          </aside>
          <GroupBalance meals={meals} />
        </div>
      </div>

      <Sheet open={openMeal !== null} onClose={() => setOpenId(null)} eyebrow="Registrar comida" title={openMeal ? `${openMeal.name} · ${openMeal.time}` : undefined}>
        {openMeal && <MealForm key={openMeal.id} meal={openMeal} onSave={saveMeal} />}
      </Sheet>

      {toast && (
        <div className="toast" role="status">
          <Check size={17} /> Comida guardada
        </div>
      )}
    </div>
  );
}
