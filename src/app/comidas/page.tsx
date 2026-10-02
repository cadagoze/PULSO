"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import { PageHeader, Sheet } from "@/components/ui";
import { DayBalance } from "@/components/content/day-balance";
import { DayProgress } from "@/components/content/day-progress";
import { HabitRows } from "@/components/content/habit-rows";
import { MealForm } from "@/components/content/meal-form";
import { MealIdea } from "@/components/content/meal-idea";
import { buildSummary, isLogged, type MealDetail } from "@/components/content/meal-log";
import { MealRows } from "@/components/content/meal-rows";
import { Toast, useToast } from "@/components/ui/toast";
import { habits } from "@/data/mock-data";
import { useHabits, useMeals } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { formatLongDate } from "@/lib/utils";

/** Comida abierta en la hoja. Se conserva al cerrar para que el contenido no desaparezca mientras baja. */
type SheetState = { id: string; editing: boolean; token: number };

const DAY_DONE = "Día completo: todo al día";

export default function MealsPage() {
  const now = useNow();
  const [meals, setMeals] = useMeals();
  const [checked, setChecked] = useHabits();
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Última fila marcada en esta visita: sólo ella anima su check (las que ya venían hechas no).
  const [fresh, setFresh] = useState<string | null>(null);
  const { toast, show: showToast, hide: hideToast } = useToast(2500);

  const sheetMeal = sheet ? meals.find((meal) => meal.id === sheet.id) : undefined;
  const logged = meals.filter(isLogged).length;
  const habitsDone = habits.filter((habit) => checked.includes(habit.id)).length;

  function openMeal(id: string) {
    const meal = meals.find((item) => item.id === id);
    if (!meal) return;
    setSheet({ id, editing: isLogged(meal), token: Date.now() });
    setSheetOpen(true);
    hideToast();
  }

  function saveMeal(detail: MealDetail) {
    if (!sheetMeal) return;
    const { id } = sheetMeal;
    const first = !isLogged(sheetMeal);
    setMeals((items) => items.map((item) => (item.id === id ? { ...item, status: "Registrada", summary: buildSummary(detail) } : item)));
    setSheetOpen(false);
    if (!first) {
      showToast("Comida guardada");
      return;
    }
    setFresh(`meal:${id}`);
    const allMeals = logged + 1 === meals.length;
    showToast(!allMeals ? "Comida guardada" : habitsDone === habits.length ? DAY_DONE : `${meals.length} de ${meals.length} comidas registradas`);
  }

  function clearMeal() {
    if (!sheetMeal) return;
    const { id } = sheetMeal;
    setMeals((items) => items.map((item) => (item.id === id ? { ...item, status: "Pendiente", summary: undefined } : item)));
    setSheetOpen(false);
    setFresh(null);
    showToast("Registro quitado", { icon: <Undo2 size={17} /> });
  }

  function toggleHabit(id: number) {
    const on = !checked.includes(id);
    setChecked((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
    setFresh(on ? `habit:${id}` : null);
    if (on && habitsDone + 1 === habits.length) showToast(logged === meals.length ? DAY_DONE : `${habits.length} de ${habits.length} hábitos cumplidos`);
  }

  return (
    <div className="page cnt-page cnt-split">
      <div className="cnt-lead">
        <PageHeader
          backHref="/perfil"
          meta={now ? formatLongDate(new Date(now)) : "Hoy"}
          title="Comidas y hábitos"
          subtitle="Reconoce patrones de energía y saciedad sin contar calorías."
        />
        <DayProgress meals={meals} habitsDone={habitsDone} habitsTotal={habits.length} />
      </div>

      <div className="cnt-main">
        <section className="cnt-section" aria-labelledby="cnt-meals-title">
          <div className="cnt-head">
            <h2 id="cnt-meals-title" className="meta">Comidas</h2>
            <span className="cnt-hint">Toca para registrar o editar</span>
          </div>
          <MealRows meals={meals} fresh={fresh} onOpen={openMeal} />
        </section>

        <section className="cnt-section" aria-labelledby="cnt-habits-title">
          <div className="cnt-head">
            <h2 id="cnt-habits-title" className="meta">Hábitos</h2>
            <span className="cnt-hint">Se reinician cada día</span>
          </div>
          <HabitRows checked={checked} fresh={fresh} onToggle={toggleHabit} />
        </section>

        <MealIdea next={meals.find((meal) => !isLogged(meal))} />
        <DayBalance meals={meals} />
      </div>

      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        eyebrow={sheet?.editing ? "Editar registro" : "Registrar comida"}
        title={sheetMeal ? `${sheetMeal.name} · ${sheetMeal.time}` : undefined}
      >
        {sheet && sheetMeal && <MealForm key={sheet.token} meal={sheetMeal} editing={sheet.editing} onSave={saveMeal} onClear={clearMeal} />}
      </Sheet>

      <Toast toast={toast} />
    </div>
  );
}
