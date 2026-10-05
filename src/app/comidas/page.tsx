"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { Undo2 } from "lucide-react";
import { PageHeader, Sheet } from "@/components/ui";
import { DayBalance } from "@/components/content/day-balance";
import { DayProgress } from "@/components/content/day-progress";
import { HabitRows } from "@/components/content/habit-rows";
import { MealForm } from "@/components/content/meal-form";
import { MealIdea } from "@/components/content/meal-idea";
import { buildSummary, isLogged, type MealDetail } from "@/components/content/meal-log";
import { MealRows } from "@/components/content/meal-rows";
import { CalorieAdjust } from "@/components/nutrition/calorie-adjust";
import { CalorieSummary } from "@/components/nutrition/calorie-summary";
import { EntryEditor } from "@/components/nutrition/entry-editor";
import { FoodPicker } from "@/components/nutrition/food-picker";
import { MealDiary } from "@/components/nutrition/meal-diary";
import { NutritionPlan } from "@/components/nutrition/nutrition-plan";
import { NutritionSetup } from "@/components/nutrition/nutrition-setup";
import { SetupPrompt } from "@/components/nutrition/setup-prompt";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { TrainingEnergy } from "@/components/nutrition/training-energy";
import { Toast, useToast } from "@/components/ui/toast";
import { habits } from "@/data/mock-data";
import { activityLevels, entryFromFood, entryTotals, formatKcal, mealSlotAt, mealSlots, nutritionTargets, pruneHistory, recentFoods, suggestedNutritionProfile } from "@/lib/nutrition";
import { useCustomFoods, useFoodLog, useHabits, useMeals, useNutritionProfile, useProfile, useSettings, useWeights, useWorkouts } from "@/lib/store";
import { newId } from "@/lib/training";
import { useNow } from "@/lib/use-now";
import { useLatestWeight, useWaterToday } from "@/lib/use-nutrition";
import { formatLongDate, formatShortDate, localDateKey } from "@/lib/utils";
import type { FoodEntry, FoodItem, MealSlot, NutritionProfile } from "@/types";

/** Comida abierta en la hoja. Se conserva al cerrar para que el contenido no desaparezca mientras baja. */
type SheetState = { id: string; editing: boolean; token: number };

const DAY_DONE = "Día completo: todo al día";
const slotLabel = (slot: MealSlot) => mealSlots.find((item) => item.value === slot)?.label ?? "Comida";

export default function NutritionPage() {
  const now = useNow();
  const [meals, setMeals] = useMeals();
  const [checked, setChecked] = useHabits();
  const [profile, setProfile] = useNutritionProfile();
  const [log, setLog] = useFoodLog();
  const [customFoods, setCustomFoods] = useCustomFoods();
  const [, setWeights] = useWeights();
  const latestWeight = useLatestWeight();
  const water = useWaterToday(now);
  const [settings] = useSettings();
  const [assessment] = useProfile();
  const [workouts] = useWorkouts();
  const { toast, show: showToast, hide: hideToast } = useToast(2500);

  // Hojas: el estado se conserva al cerrar para que el contenido no se vacíe mientras baja.
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [setup, setSetup] = useState({ open: false, token: 0 });
  const [picker, setPicker] = useState<{ meal: MealSlot; token: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [adjust, setAdjust] = useState({ open: false, token: 0 });
  // Última fila marcada en esta visita: sólo ella anima su check (las que ya venían hechas no).
  const [fresh, setFresh] = useState<string | null>(null);

  const today = localDateKey(new Date(now));
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDateKey(yesterdayDate);
  const targets = profile && latestWeight ? nutritionTargets(profile, latestWeight, new Date(now)) : null;
  const counting = Boolean(profile && targets && profile.mode === "count");
  const todayEntries = log.filter((entry) => entry.date === today);
  const yesterdayEntries = log.filter((entry) => entry.date === yesterday);
  const totals = entryTotals(todayEntries);

  const sheetMeal = sheet ? meals.find((meal) => meal.id === sheet.id) : undefined;
  const logged = meals.filter(isLogged).length;
  const habitsDone = habits.filter((habit) => checked.includes(habit.id)).length;

  // ─── Registro por saciedad (modo sin contar) ──────────────────────────
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
    if (on && habitsDone + 1 === habits.length) showToast(!counting && logged === meals.length ? DAY_DONE : `${habits.length} de ${habits.length} hábitos cumplidos`);
  }

  // ─── Plan y calorías ──────────────────────────────────────────────────
  function openSetup() {
    setSetup((current) => ({ open: true, token: current.token + 1 }));
    hideToast();
  }

  function saveSetup(next: NutritionProfile, weightKg: number) {
    setProfile(next);
    if (latestWeight === null || Math.abs(latestWeight - weightKg) >= 0.05) {
      setWeights((current) => [...current.filter((entry) => entry.date !== today), { date: today, label: formatShortDate(today), weight: weightKg }].sort((a, b) => a.date.localeCompare(b.date)));
    }
    setSetup((current) => ({ ...current, open: false }));
    showToast("Tu plan quedó listo", { delay: 260 });
  }

  function updateProfile(patch: Partial<NutritionProfile>) {
    if (!profile) return;
    setProfile({ ...profile, ...patch, updatedAt: new Date().toISOString() });
  }

  // ─── Registro de alimentos ────────────────────────────────────────────
  function openPicker(meal: MealSlot) {
    setPicker({ meal, token: Date.now() });
    setPickerOpen(true);
    hideToast();
  }

  function addFood(food: FoodItem, portions: number) {
    if (!picker || !targets) return;
    const id = newId("comida");
    const entry = entryFromFood(food, { id, date: today, meal: picker.meal, portions });
    setLog((current) => pruneHistory([...current, entry], today));
    setPickerOpen(false);
    setFresh(id);
    const protein = totals.protein + food.protein * portions;
    const proteinMet = totals.protein < targets.protein && protein >= targets.protein;
    showToast(proteinMet ? "Meta de proteína cumplida" : `${slotLabel(picker.meal)} · +${formatKcal(food.kcal * portions)} kcal`, { delay: 260 });
  }

  function createFood(food: FoodItem, portions: number) {
    if (food.id !== "rapido") setCustomFoods((current) => [food, ...current].slice(0, 200));
    addFood(food, portions);
  }

  function openEntry(entry: FoodEntry) {
    setEditing(entry);
    setEditorOpen(true);
    hideToast();
  }

  function saveEntry(portions: number) {
    if (!editing) return;
    setLog((current) => current.map((entry) => (entry.id === editing.id ? { ...entry, portions } : entry)));
    setEditorOpen(false);
  }

  function deleteEntry() {
    if (!editing) return;
    setLog((current) => current.filter((entry) => entry.id !== editing.id));
    setEditorOpen(false);
    showToast("Alimento quitado", { icon: <Undo2 size={17} />, delay: 260 });
  }

  function repeatMeal(meal: MealSlot) {
    const copies = yesterdayEntries.filter((entry) => entry.meal === meal).map((entry) => ({ ...entry, id: newId("comida"), date: today }));
    if (!copies.length) return;
    setLog((current) => pruneHistory([...current, ...copies], today));
    setFresh(copies[0].id);
    showToast(`${slotLabel(meal)} repetido · ${formatKcal(entryTotals(copies).kcal)} kcal`);
  }

  // Accesos desde Inicio: «?registrar» abre el registro de la comida de esta hora y «?calcular», el cálculo.
  const openFromLink = useEffectEvent(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("registrar") && !params.has("calcular")) return;
    window.history.replaceState(null, "", window.location.pathname);
    if (params.has("calcular") || !profile || !targets) openSetup();
    else if (counting) openPicker(mealSlotAt(new Date()));
    else {
      const next = meals.find((meal) => !isLogged(meal));
      if (next) openMeal(next.id);
    }
  });
  const ready = now !== 0;
  useEffect(() => {
    if (!ready) return;
    const frame = window.requestAnimationFrame(openFromLink);
    return () => window.cancelAnimationFrame(frame);
  }, [ready]);

  if (!ready) return <div className="page cnt-page" aria-busy="true"><div className="nut-skeleton" /></div>;

  const subtitle = counting
    ? "Tus calorías y macros de hoy, para entrenar con energía."
    : profile
      ? "Reconoce patrones de energía y saciedad, sin contar calorías."
      : "Calcula cuánto comer según tu objetivo y registra tu día.";

  return (
    <div className="page cnt-page cnt-split nut-page">
      <div className="cnt-lead">
        <PageHeader meta={formatLongDate(new Date(now))} title="Nutrición" subtitle={subtitle} />
        {!targets && <SetupPrompt onStart={openSetup} missingWeight={Boolean(profile)} />}
        {counting && targets ? <CalorieSummary targets={targets} totals={totals} /> : <DayProgress meals={meals} habitsDone={habitsDone} habitsTotal={habits.length} />}
        <WaterTracker className="nut-water" glasses={water.glasses} goal={water.goal} onChange={water.change} />
      </div>

      <div className="cnt-main">
        {counting ? (
          <section className="cnt-section" aria-labelledby="nut-meals-title">
            <div className="cnt-head">
              <h2 id="nut-meals-title" className="meta">Comidas</h2>
              <span className="cnt-hint">Toca un alimento para editarlo</span>
            </div>
            <MealDiary entries={todayEntries} yesterday={yesterdayEntries} fresh={fresh} onAdd={openPicker} onEdit={openEntry} onRepeat={repeatMeal} />
          </section>
        ) : (
          <section className="cnt-section" aria-labelledby="cnt-meals-title">
            <div className="cnt-head">
              <h2 id="cnt-meals-title" className="meta">Comidas</h2>
              <span className="cnt-hint">Toca para registrar o editar</span>
            </div>
            <MealRows meals={meals} fresh={fresh} onOpen={openMeal} />
          </section>
        )}

        <section id="habitos" className="cnt-section" aria-labelledby="cnt-habits-title">
          <div className="cnt-head">
            <h2 id="cnt-habits-title" className="meta">Hábitos</h2>
            <span className="cnt-hint">Se reinician cada día</span>
          </div>
          <HabitRows checked={checked} fresh={fresh} onToggle={toggleHabit} />
        </section>

        {!counting && <MealIdea next={meals.find((meal) => !isLogged(meal))} />}
        {counting && profile && latestWeight && (
          <TrainingEnergy
            profile={profile}
            workouts={workouts}
            weightKg={latestWeight}
            now={now}
            onUseActivity={(activity) => {
              updateProfile({ activity });
              showToast(`Actividad «${activityLevels.find((level) => level.value === activity)?.label}» · ${formatKcal(nutritionTargets({ ...profile, activity }, latestWeight, new Date(now)).kcal)} kcal al día`);
            }}
          />
        )}
        {profile && targets && (
          <NutritionPlan
            profile={profile}
            targets={targets}
            onEdit={openSetup}
            onAdjust={() => setAdjust((current) => ({ open: true, token: current.token + 1 }))}
            onModeChange={(mode) => updateProfile({ mode })}
          />
        )}
        {!counting && <DayBalance meals={meals} />}
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} eyebrow={sheet?.editing ? "Editar registro" : "Registrar comida"} title={sheetMeal ? `${sheetMeal.name} · ${sheetMeal.time}` : undefined}>
        {sheet && sheetMeal && <MealForm key={sheet.token} meal={sheetMeal} editing={sheet.editing} onSave={saveMeal} onClear={clearMeal} />}
      </Sheet>

      <Sheet open={setup.open} onClose={() => setSetup((current) => ({ ...current, open: false }))} eyebrow="Tus calorías" title="Calcula tu objetivo">
        {setup.token > 0 && (
          <NutritionSetup
            key={setup.token}
            initial={profile ?? suggestedNutritionProfile({ activities: assessment?.activities, goals: assessment?.goals }, new Date(now))}
            weightKg={latestWeight}
            unit={settings.unit}
            onSave={saveSetup}
          />
        )}
      </Sheet>

      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)} eyebrow="Registrar alimento" title={picker ? slotLabel(picker.meal) : undefined} className="nut-picker-sheet">
        {picker && <FoodPicker key={picker.token} mealLabel={slotLabel(picker.meal)} customFoods={customFoods} recent={recentFoods(log)} onPick={addFood} onCreate={createFood} />}
      </Sheet>

      <Sheet open={editorOpen} onClose={() => setEditorOpen(false)} eyebrow={editing ? slotLabel(editing.meal) : undefined} title="Editar alimento">
        {editing && <EntryEditor key={editing.id} entry={editing} onSave={saveEntry} onDelete={deleteEntry} />}
      </Sheet>

      <Sheet open={adjust.open} onClose={() => setAdjust((current) => ({ ...current, open: false }))} eyebrow="Tu plan" title="Ajustar calorías">
        {profile && latestWeight && adjust.token > 0 && (
          <CalorieAdjust
            key={adjust.token}
            profile={profile}
            weightKg={latestWeight}
            onSave={(customKcal) => {
              updateProfile({ customKcal });
              setAdjust((current) => ({ ...current, open: false }));
              showToast(customKcal ? `Objetivo fijado en ${formatKcal(customKcal)} kcal` : "Volviste al cálculo automático", { delay: 260 });
            }}
          />
        )}
      </Sheet>

      <Toast toast={toast} />
    </div>
  );
}
