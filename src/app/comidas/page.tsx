"use client";

import { useState } from "react";
import { Check, ChevronDown, Leaf, Plus, Sparkles, Utensils, X } from "lucide-react";
import { meals as initialMeals } from "@/data/mock-data";
import { PageHeader, PrimaryButton, ProgressBar, SectionHeader } from "@/components/ui";
import { usePersistentState } from "@/lib/use-persistent-state";

const groups = ["Proteína", "Verduras", "Fruta", "Carbohidrato", "Bebida"];

export default function MealsPage() {
  const [meals, setMeals] = usePersistentState("pulso:meals", initialMeals);
  const [openMeal, setOpenMeal] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [satiety, setSatiety] = useState(3);
  const [saved, setSaved] = useState(false);
  const completed = meals.filter((meal) => meal.status === "Registrada").length;
  function saveMeal() {
    if (!openMeal || selected.length === 0) return;
    setMeals((items) => items.map((item) => item.id === openMeal ? { ...item, status: "Registrada", summary: selected.join(" · ") } : item));
    setSaved(true); setTimeout(() => setSaved(false), 2500); setOpenMeal(null); setSelected([]);
  }
  return (
    <div className="page-stack">
      <PageHeader eyebrow="VIERNES, 31 DE JULIO" title="Comidas" subtitle="Registra lo esencial, sin contar cada detalle." />
      <section className="nutrition-summary"><div className="nutrition-icon"><Utensils size={22} /></div><div><span>Resumen de hoy</span><strong>{completed} de 4 comidas</strong><ProgressBar value={completed * 25} purple /></div><b>{completed * 25}%</b></section>
      <section><SectionHeader title="Tu día" /><div className="meal-list">{meals.map((meal) => <article className="meal-row" key={meal.id}><div className={`meal-status ${meal.status === "Registrada" ? "done" : ""}`}>{meal.status === "Registrada" ? <Check size={17} /> : <Utensils size={17} />}</div><div><h3>{meal.name}<span>{meal.time}</span></h3>{meal.summary ? <p>{meal.summary}</p> : <p>Aún no registrada</p>}</div><button onClick={() => setOpenMeal(meal.id)} className="icon-button" aria-label={`Registrar ${meal.name}`}>{meal.status === "Registrada" ? <ChevronDown size={18} /> : <Plus size={18} />}</button></article>)}</div></section>
      <aside className="food-suggestion"><div><Sparkles size={21} /></div><span>SUGERENCIA PARA TU PRÓXIMA COMIDA</span><p>Incluye una fuente de proteína y verduras para aumentar la saciedad.</p><small><Leaf size={14} /> Una idea simple para sentirte bien</small></aside>
      {openMeal && <div className="modal-backdrop" onMouseDown={() => setOpenMeal(null)}><section className="sheet-modal" role="dialog" aria-modal="true" aria-labelledby="meal-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-handle" /><header><div><span>REGISTRAR COMIDA</span><h2 id="meal-title">{meals.find((meal) => meal.id === openMeal)?.name}</h2></div><button className="icon-button" onClick={() => setOpenMeal(null)} aria-label="Cerrar"><X size={20} /></button></header><p className="field-label">¿Qué incluyó?</p><div className="food-options">{groups.map((group) => <button key={group} onClick={() => setSelected((items) => items.includes(group) ? items.filter((item) => item !== group) : [...items, group])} className={selected.includes(group) ? "selected" : ""} aria-pressed={selected.includes(group)}>{selected.includes(group) && <Check size={15} />}{group}</button>)}</div><label className="field-label">Saciedad <span>{satiety}/5</span><input type="range" min="1" max="5" value={satiety} onChange={(event) => setSatiety(Number(event.target.value))} /></label><label className="field-label">Nota opcional<textarea placeholder="¿Cómo te sentiste después de comer?" /></label><PrimaryButton onClick={saveMeal} disabled={selected.length === 0}>Guardar comida</PrimaryButton></section></div>}
      {saved && <div className="toast"><Check size={17} /> Comida guardada</div>}
    </div>
  );
}
