"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { Calculator, ChevronRight, Plus, SlidersHorizontal, Undo2 } from "lucide-react";
import { Button, PageHeader, Sheet } from "@/components/ui";
import { DayBalance } from "@/components/content/day-balance";
import { DayProgress } from "@/components/content/day-progress";
import { HabitRows } from "@/components/content/habit-rows";
import { MealForm } from "@/components/content/meal-form";
import { buildSummary, isLogged, type MealDetail } from "@/components/content/meal-log";
import { MealRows } from "@/components/content/meal-rows";
import { CalorieAdjust } from "@/components/nutrition/calorie-adjust";
import { CalorieSummary } from "@/components/nutrition/calorie-summary";
import { DayGapCard } from "@/components/nutrition/day-gap-card";
import { EntryEditor } from "@/components/nutrition/entry-editor";
import { FoodPicker, mealNames } from "@/components/nutrition/food-picker";
import { MealDiary, measureLabel } from "@/components/nutrition/meal-diary";
import { NutritionPlan } from "@/components/nutrition/nutrition-plan";
import { NutritionSetup } from "@/components/nutrition/nutrition-setup";
import { SaveMealForm } from "@/components/nutrition/save-meal-form";
import { TodaySummary } from "@/components/nutrition/today-summary";
import { TrainingEnergy } from "@/components/nutrition/training-energy";
import { useFoodDiary, type Added, type PickedFood } from "@/components/nutrition/use-food-diary";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { WeeklyReviewCard } from "@/components/nutrition/weekly-review";
import { Toast, useToast } from "@/components/ui/toast";
import { useSheet } from "@/components/ui/use-sheet";
import { foods } from "@/data/foods";
import { habits } from "@/data/mock-data";
import { dayGap, type FoodIdea } from "@/lib/day-gap";
import { activityLevels, formatKcal, mealSlots, nutritionTargets, recentFoods, savedMealsFor, suggestedMealSlot, suggestedNutritionProfile, usualGrams, usualPortions } from "@/lib/nutrition";
import { useHabits, useMeals, useNutritionProfile, useProfile, useSettings, useWeights, useWorkouts } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { useDayMeals, useLatestWeight, useWeeklyReview } from "@/lib/use-nutrition";
import { checkInPatch } from "@/lib/weekly-review";
import { formatLongDate, formatShortDate, localDateKey } from "@/lib/utils";
import type { FoodEntry, MealSlot, NutritionProfile, SavedMeal } from "@/types";

const DAY_DONE = "Día completo: todo al día";
const slotLabel = (slot: MealSlot) => mealSlots.find((item) => item.value === slot)?.label ?? "Comida";

/**
 * Comidas, simple por defecto: comidas registradas, proteína, agua y hábitos. Calorías y macros son un
 * modo que se pide («Quiero controlar calorías y macros»). Con antecedente de TCA, registro por saciedad
 * sin números. Repetir, buscar y escanear aparecen al registrar. La página compone; el diario de
 * alimentos vive en useFoodDiary y cada hoja en useSheet.
 */
export default function NutritionPage() {
  const now = useNow();
  const [meals, setMeals] = useMeals();
  const [checked, setChecked] = useHabits();
  const [profile, setProfile] = useNutritionProfile();
  const [, setWeights] = useWeights();
  const latestWeight = useLatestWeight();
  const review = useWeeklyReview(now);
  const [settings] = useSettings();
  const [assessment] = useProfile();
  const [workouts] = useWorkouts();
  const day = useDayMeals(now);
  const diary = useFoodDiary(now);
  const { toast, show: showToast, hide: hideToast } = useToast(2500);
  const mealSheet = useSheet<{ id: string; editing: boolean }>();
  const setup = useSheet();
  const picker = useSheet<MealSlot>();
  const editor = useSheet<FoodEntry>();
  const adjust = useSheet();
  const saving = useSheet<MealSlot>();
  const planSheet = useSheet();
  // Última comida o hábito marcado por saciedad en esta visita: sólo esa fila anima su check.
  const [fresh, setFresh] = useState<string | null>(null);
  // Comida elegida dentro del buscador (si se cambió la que lo abrió).
  const [mealChoice, setMealChoice] = useState<MealSlot | null>(null);

  const today = localDateKey(new Date(now));
  const { targets, safe, counting } = day;
  const measure = counting ? "kcal" : "protein";
  const gap = counting && targets ? dayGap({ targets, totals: diary.totals, now: new Date(now), catalog: [...diary.customFoods, ...foods], history: diary.log }) : null;
  const sheetMeal = mealSheet.data ? meals.find((meal) => meal.id === mealSheet.data?.id) : undefined;
  const logged = meals.filter(isLogged).length;
  const habitsDone = habits.filter((habit) => checked.includes(habit.id)).length;

  // ─── Registro de alimentos (simple y con calorías) ────────────────────
  /** Aviso tras agregar: la meta de proteína al cumplirse; si no, lo que sumaste. */
  function announce(added: Added | null, label: string, delay = 0) {
    if (!added) return;
    const goal = day.protein?.goal;
    const before = diary.totals.protein;
    if (goal && before < goal && before + added.protein >= goal) showToast("Meta de proteína cumplida", { delay });
    else showToast(counting ? `${label} · +${formatKcal(added.kcal)} kcal` : `${label} · +${Math.round(added.protein)} g de proteína`, { delay });
  }

  function openPicker(meal: MealSlot) {
    setMealChoice(null);
    picker.show(meal);
    hideToast();
  }

  /**
   * Lo elegido en el buscador, de una vez, y si se pidió también una comida guardada o lo de ayer.
   * El aviso nombra la comida y cuántos alimentos se sumaron.
   */
  function addPicked(meal: MealSlot, items: PickedFood[], extra: { saved?: SavedMeal; yesterday?: boolean } = {}) {
    picker.close();
    const added = diary.addFoods(meal, items, extra);
    const label = !items.length && extra.saved ? extra.saved.name
      : !items.length && extra.yesterday ? `${slotLabel(meal)} repetido`
        : added && added.count > 1 ? `${mealNames[meal]} · ${added.count} alimentos` : mealNames[meal];
    announce(added, label, 260);
  }

  function addSaved(meal: MealSlot, saved: SavedMeal) {
    picker.close();
    announce(diary.addSavedMeal(meal, saved), saved.name, 260);
  }

  function repeat(meal: MealSlot, delay = 0) {
    announce(diary.repeatYesterday(meal), `${slotLabel(meal)} repetido`, delay);
  }

  function addIdea(idea: FoodIdea) {
    if (!gap) return;
    hideToast();
    announce(diary.addFood(idea.food, gap.meal, { portions: idea.portions }), slotLabel(gap.meal));
  }

  function openEntry(entry: FoodEntry) {
    editor.show(entry);
    hideToast();
  }

  function saveEntry(amount: { portions: number; grams?: number }) {
    if (!editor.data) return;
    diary.updateEntry(editor.data.id, amount);
    editor.close();
  }

  function deleteEntry() {
    if (!editor.data) return;
    diary.removeEntry(editor.data.id);
    editor.close();
    showToast("Alimento quitado", { icon: <Undo2 size={17} />, delay: 260 });
  }

  function openSaveMeal(meal: MealSlot) {
    saving.show(meal);
    hideToast();
  }

  function storeSavedMeal(name: string) {
    if (!saving.data) return;
    const saved = diary.saveMeal(saving.data, name);
    saving.close();
    if (saved) showToast(`Guardada · ${saved.name}`, { delay: 260 });
  }

  // ─── Registro por saciedad (antecedente de TCA) ───────────────────────
  function openMeal(id: string) {
    const meal = meals.find((item) => item.id === id);
    if (!meal) return;
    mealSheet.show({ id, editing: isLogged(meal) });
    hideToast();
  }

  function saveMeal(detail: MealDetail) {
    if (!sheetMeal) return;
    const { id } = sheetMeal;
    const first = !isLogged(sheetMeal);
    setMeals((items) => items.map((item) => (item.id === id ? { ...item, status: "Registrada", summary: buildSummary(detail) } : item)));
    mealSheet.close();
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
    mealSheet.close();
    setFresh(null);
    showToast("Registro quitado", { icon: <Undo2 size={17} /> });
  }

  function toggleHabit(id: number) {
    const on = !checked.includes(id);
    setChecked((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
    setFresh(on ? `habit:${id}` : null);
    if (on && habitsDone + 1 === habits.length) showToast(safe && logged === meals.length ? DAY_DONE : `${habits.length} de ${habits.length} hábitos cumplidos`);
  }

  // ─── Plan y calorías ──────────────────────────────────────────────────
  function openSetup() {
    setup.show(true);
    hideToast();
  }

  function saveSetup(next: NutritionProfile, weightKg: number) {
    setProfile(next);
    if (latestWeight === null || Math.abs(latestWeight - weightKg) >= 0.05) {
      setWeights((current) => [...current.filter((entry) => entry.date !== today), { date: today, label: formatShortDate(today), weight: weightKg }].sort((a, b) => a.date.localeCompare(b.date)));
    }
    setup.close();
    showToast("Tu plan quedó listo", { delay: 260 });
  }

  function updateProfile(patch: Partial<NutritionProfile>) {
    if (!profile) return;
    setProfile({ ...profile, ...patch, updatedAt: new Date().toISOString() });
  }

  /** «Quiero controlar calorías y macros»: con tu plan ya hecho se activa al tiro; si no, se calcula primero. */
  function enableCounting() {
    if (profile && targets) {
      updateProfile({ mode: "count" });
      showToast("Ahora cuentas calorías y macros");
    } else {
      openSetup();
    }
  }

  /** Respuesta a la revisión semanal: aplicar la propuesta o mantener el objetivo. */
  function answerReview(apply: boolean) {
    if (!profile || review.status !== "ready") return;
    updateProfile(checkInPatch(profile, review, apply, today));
    showToast(apply && review.change !== 0 ? `Objetivo actualizado · ${formatKcal(review.suggestedKcal)} kcal al día` : `Revisión guardada · seguimos con ${formatKcal(review.currentKcal)} kcal`);
  }

  /**
   * «Añadir comida»: el registro de esa comida o la que corresponde ahora (el desayuno, hasta el mediodía
   * si aún no lo anotas); en el buscador se puede cambiar. Por saciedad, la próxima sin registrar.
   */
  function startAdding(slot?: MealSlot) {
    if (!safe) {
      openPicker(slot ?? suggestedMealSlot(new Date(), diary.todayEntries.map((entry) => entry.meal)));
      return;
    }
    const next = (slot ? meals.find((meal) => meal.id === slot) : undefined) ?? meals.find((meal) => !isLogged(meal)) ?? meals[0];
    if (next) openMeal(next.id);
  }

  // Accesos desde Inicio: «?registrar=almuerzo» abre esa comida (sin valor, la de esta hora) y «?calcular», el cálculo.
  const openFromLink = useEffectEvent(() => {
    // Las secciones se montan tras hidratar: el salto a «#revision» o «#habitos» se hace aquí.
    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "start" });
    const params = new URLSearchParams(window.location.search);
    if (!params.has("registrar") && !params.has("calcular")) return;
    window.history.replaceState(null, "", window.location.pathname);
    if (params.has("calcular")) {
      if (!safe) openSetup();
      return;
    }
    const slot = params.get("registrar");
    startAdding(mealSlots.find((item) => item.value === slot)?.value);
  });

  const ready = now !== 0;
  useEffect(() => {
    if (!ready) return;
    const frame = window.requestAnimationFrame(openFromLink);
    return () => window.cancelAnimationFrame(frame);
  }, [ready]);

  if (!ready) return <div className="page cnt-page" aria-busy="true"><div className="nut-skeleton" /></div>;

  const subtitle = safe
    ? "Reconoce tu energía y saciedad, sin números."
    : counting
      ? "Lo que comes hoy: calorías, proteína y hábitos para entrenar bien."
      : "Lo que comes hoy: comidas, proteína y agua. Las calorías, sólo si quieres contarlas.";
  const pickerMeal = mealChoice ?? picker.data;
  const yesterdayInPicker = pickerMeal ? diary.yesterdayEntries.filter((entry) => entry.meal === pickerMeal) : [];
  const canRepeat = Boolean(pickerMeal) && yesterdayInPicker.length > 0 && !diary.todayEntries.some((entry) => entry.meal === pickerMeal);

  return (
    <div className="page cnt-page cnt-split nut-page">
      <div className="cnt-lead">
        <PageHeader meta={formatLongDate(new Date(now))} title="Comidas" subtitle={subtitle} />
        {safe
          ? <DayProgress meals={meals} habitsDone={habitsDone} habitsTotal={habits.length} />
          : counting && targets
            ? <CalorieSummary targets={targets} totals={diary.totals} />
            : <TodaySummary done={day.done} onPick={(slot) => startAdding(slot)} protein={day.protein} water={day.water} />}
        <Button size="l" block onClick={() => startAdding()}><Plus size={18} />Añadir comida</Button>
        {(safe || counting) && <WaterTracker className="nut-water" glasses={day.water.glasses} goal={day.water.goal} onChange={day.water.change} />}
      </div>

      <div className="cnt-main">
        <section className="cnt-section" aria-labelledby="nut-meals-title">
          <div className="cnt-head">
            <h2 id="nut-meals-title" className="meta">Comidas</h2>
            <span className="cnt-hint">{safe ? "Toca para registrar o editar" : "Toca un alimento para editarlo"}</span>
          </div>
          {safe
            ? <MealRows meals={meals} fresh={fresh} onOpen={openMeal} />
            : <MealDiary measure={measure} entries={diary.todayEntries} yesterday={diary.yesterdayEntries} saved={diary.savedMeals} fresh={diary.fresh} onAdd={openPicker} onEdit={openEntry} onRepeat={(meal) => repeat(meal)} onSave={openSaveMeal} onUseSaved={addSaved} />}
        </section>
        {gap && <DayGapCard gap={gap} onAdd={addIdea} />}
        {counting && review.status === "ready" && review.due && <WeeklyReviewCard review={review} onAnswer={answerReview} />}

        <section id="habitos" className="cnt-section" aria-labelledby="cnt-habits-title">
          <div className="cnt-head">
            <h2 id="cnt-habits-title" className="meta">Hábitos</h2>
            <span className="cnt-hint">Se reinician cada día</span>
          </div>
          <HabitRows checked={checked} fresh={fresh} onToggle={toggleHabit} />
        </section>

        {counting && review.status === "collecting" && <WeeklyReviewCard review={review} onAnswer={answerReview} />}
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
        {safe && <DayBalance meals={meals} />}
        {safe && profile && targets && <NutritionPlan profile={profile} targets={targets} today={today} onEdit={openSetup} onAdjust={() => adjust.show(true)} onModeChange={(mode) => updateProfile({ mode })} />}
        {!safe && (
          <section className="cnt-section" aria-label="Tu plan de alimentación">
            <div className="list nut-plan-rows">
              {profile && targets && (
                <button type="button" className="list-row" onClick={() => planSheet.show(true)}>
                  <span className="icon-tile" aria-hidden="true"><SlidersHorizontal size={19} /></span>
                  <span className="grow">
                    <strong>Tu plan</strong>
                    <small className="num">{counting ? `${formatKcal(targets.kcal)} kcal y ${targets.protein} g de proteína al día` : `${targets.protein} g de proteína al día`}</small>
                  </span>
                  <ChevronRight size={18} className="subtle" aria-hidden="true" />
                </button>
              )}
              {!counting && (
                <button type="button" className="list-row" onClick={enableCounting}>
                  <span className="icon-tile" aria-hidden="true"><Calculator size={19} /></span>
                  <span className="grow">
                    <strong>Quiero controlar calorías y macros</strong>
                    <small>{profile && targets ? "Activa el conteo con tu plan actual." : "Calculamos tu objetivo con tu edad, estatura y peso."}</small>
                  </span>
                  <ChevronRight size={18} className="subtle" aria-hidden="true" />
                </button>
              )}
            </div>
          </section>
        )}
      </div>

      <Sheet open={mealSheet.open} onClose={mealSheet.close} eyebrow={mealSheet.data?.editing ? "Editar registro" : "Registrar comida"} title={sheetMeal ? `${sheetMeal.name} · ${sheetMeal.time}` : undefined}>
        {mealSheet.data && sheetMeal && <MealForm key={mealSheet.key} meal={sheetMeal} editing={mealSheet.data.editing} onSave={saveMeal} onClear={clearMeal} />}
      </Sheet>

      <Sheet open={setup.open} onClose={setup.close} eyebrow="Calorías y macros" title="Calcula tu objetivo">
        {setup.key > 0 && (
          <NutritionSetup
            key={setup.key}
            initial={profile ?? suggestedNutritionProfile({ activities: assessment?.activities, goals: assessment?.goals, sex: assessment?.sex }, new Date(now))}
            weightKg={latestWeight}
            unit={settings.unit}
            onSave={saveSetup}
          />
        )}
      </Sheet>

      <Sheet open={picker.open} onClose={picker.close} eyebrow="Registrar" title="Agregar alimentos" className="nut-picker-sheet">
        {pickerMeal && (
          <FoodPicker
            key={picker.key}
            measure={measure}
            meal={pickerMeal}
            onMealChange={setMealChoice}
            repeat={canRepeat ? { detail: measureLabel(measure, yesterdayInPicker), onRepeat: (picked) => addPicked(pickerMeal, picked, { yesterday: true }) } : null}
            customFoods={diary.customFoods}
            recent={recentFoods(diary.log)}
            savedMeals={savedMealsFor(diary.savedMeals, pickerMeal)}
            usualPortions={usualPortions(diary.log)}
            usualGrams={usualGrams(diary.log)}
            onAdd={(picked) => addPicked(pickerMeal, picked)}
            onAddSaved={(saved, picked) => addPicked(pickerMeal, picked, { saved })}
            onDeleteSaved={diary.deleteSavedMeal}
          />
        )}
      </Sheet>

      <Sheet open={saving.open} onClose={saving.close} eyebrow={saving.data ? slotLabel(saving.data) : undefined} title="Guardar comida">
        {saving.data && (
          <SaveMealForm
            key={saving.key}
            entries={diary.todayEntries.filter((entry) => entry.meal === saving.data)}
            defaultName={`Mi ${slotLabel(saving.data).toLowerCase()}`}
            existingNames={diary.savedMeals.map((item) => item.name)}
            onSave={storeSavedMeal}
          />
        )}
      </Sheet>

      <Sheet open={editor.open} onClose={editor.close} eyebrow={editor.data ? slotLabel(editor.data.meal) : undefined} title="Editar alimento">
        {editor.data && <EntryEditor key={editor.data.id} entry={editor.data} onSave={saveEntry} onDelete={deleteEntry} />}
      </Sheet>

      <Sheet open={planSheet.open} onClose={planSheet.close} eyebrow="Comidas" title="Tu plan">
        {profile && targets && (
          <NutritionPlan
            profile={profile}
            targets={targets}
            today={today}
            onEdit={() => { planSheet.close(); openSetup(); }}
            onAdjust={() => { planSheet.close(); adjust.show(true); }}
            onModeChange={(mode) => updateProfile({ mode })}
          />
        )}
      </Sheet>

      <Sheet open={adjust.open} onClose={adjust.close} eyebrow="Tu plan" title="Ajustar calorías">
        {profile && latestWeight && adjust.key > 0 && (
          <CalorieAdjust
            key={adjust.key}
            profile={profile}
            weightKg={latestWeight}
            onSave={(customKcal) => {
              updateProfile({ customKcal });
              adjust.close();
              showToast(customKcal ? `Objetivo fijado en ${formatKcal(customKcal)} kcal` : "Volviste al cálculo automático", { delay: 260 });
            }}
          />
        )}
      </Sheet>

      <Toast toast={toast} />
    </div>
  );
}
