"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Bookmark, Check, PenLine, Plus, RotateCcw, ScanBarcode, Search, Trash2, X, Zap } from "lucide-react";
import { Button, MetaLine, NumberMetric } from "@/components/ui";
import { AmountInput, initialAmount, resolveAmount, type Amount } from "@/components/nutrition/amount-input";
import { BarcodeScanner } from "@/components/nutrition/barcode-scanner";
import type { PickedFood } from "@/components/nutrition/use-food-diary";
import { barcodeFoodId } from "@/lib/barcode";
import { foodCategoryLabels, foods, mealSuggestions } from "@/data/foods";
import { amountLabel, formatKcal, mealSlots, searchFoods } from "@/lib/nutrition";
import { measureLabel, type Measure } from "@/components/nutrition/meal-diary";
import { cn } from "@/lib/utils";
import type { FoodCategory, FoodEntry, FoodItem, MealSlot, SavedMeal } from "@/types";

type View = "list" | "detail" | "custom" | "quick" | "scan";
const categories = Object.keys(foodCategoryLabels) as FoodCategory[];
const parse = (value: string) => Number(value.trim().replace(",", ".") || 0);

/** Cada comida en singular, para elegirla y en los botones («Agregar a Colación»). */
export const mealNames: Record<MealSlot, string> = { desayuno: "Desayuno", almuerzo: "Almuerzo", once: "Once", cena: "Cena", colacion: "Colación" };
const mealFor: Record<MealSlot, string> = { desayuno: "Para el desayuno", almuerzo: "Para el almuerzo", once: "Para la once", cena: "Para la cena", colacion: "Para una colación" };

/**
 * Registrar comida: arriba se elige a cuál (por defecto, la de la hora) y abajo, de lo más rápido a lo
 * más largo: repetir lo de ayer, tus comidas guardadas, recientes, lo típico de esa comida y, al buscar
 * o elegir una categoría, todo el catálogo (sin tildes y con sinónimos) o el código de barras. Con «+»
 * se eligen varios alimentos y se agregan de una vez; tocar uno abre su cantidad (porciones o gramos)
 * con proteína (o calorías, si las cuentas) en vivo. También permite crear alimentos propios y, si
 * cuentas calorías, anotar calorías rápidas.
 */
export function FoodPicker({ measure, meal, onMealChange, repeat, customFoods, recent, savedMeals, usualPortions, usualGrams, onAdd, onAddSaved, onDeleteSaved }: {
  measure: Measure;
  /** Comida a la que se agrega; se puede cambiar arriba. */
  meal: MealSlot;
  onMealChange: (meal: MealSlot) => void;
  /** Lo de ayer en esta comida, para repetirlo con un toque (null si no hay). También agrega lo elegido. */
  repeat: { detail: string; onRepeat: (picked: PickedFood[]) => void } | null;
  customFoods: FoodItem[];
  recent: FoodEntry[];
  savedMeals: SavedMeal[];
  /** Última porción usada de cada alimento (se propone al elegirlo). */
  usualPortions: Record<string, number>;
  /** Gramos de la última vez, si se registró en gramos. */
  usualGrams: Record<string, number>;
  /** Uno o varios alimentos de una vez (los nuevos quedan en «Mis alimentos»). */
  onAdd: (picked: PickedFood[]) => void;
  /** Una comida guardada, junto con lo elegido hasta ahora. */
  onAddSaved: (saved: SavedMeal, picked: PickedFood[]) => void;
  onDeleteSaved: (id: string) => void;
}) {
  const [view, setView] = useState<View>("list");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FoodCategory | null>(null);
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [amount, setAmount] = useState<Amount>(() => initialAmount(""));
  const [editingSaved, setEditingSaved] = useState(false);
  // Código escaneado que no está en la base: el alimento creado a mano queda con ese código.
  const [barcode, setBarcode] = useState<string | null>(null);
  // Lo elegido para agregar de una vez (con «+» en la lista o «Elegir otro alimento» en la cantidad).
  const [picked, setPicked] = useState<PickedFood[]>([]);
  const mealName = mealNames[meal];

  const catalog = useMemo(() => [...customFoods, ...foods], [customFoods]);
  const results = useMemo(() => searchFoods(catalog, query, category), [catalog, category, query]);
  const recentFoods = recent.map((entry) => catalog.find((food) => food.id === entry.foodId)).filter((food): food is FoodItem => Boolean(food));
  const suggestions = mealSuggestions[meal]
    .map((id) => catalog.find((food) => food.id === id))
    .filter((food): food is FoodItem => Boolean(food) && !recentFoods.some((item) => item.id === food?.id));
  const browsing = Boolean(query.trim() || category);
  const showRecent = !browsing && recentFoods.length > 0;
  const pickedOf = (id: string) => picked.find((item) => item.food.id === id);
  const isNewFood = (food: FoodItem) => !catalog.some((item) => item.id === food.id);

  /** Cantidad propuesta: la de la última vez (en porciones o gramos) o una porción. */
  function usualAmount(food: FoodItem) {
    return initialAmount(food.portion, { portions: usualPortions[food.id], grams: usualGrams[food.id] });
  }

  function toggle(food: FoodItem) {
    if (pickedOf(food.id)) {
      setPicked((current) => current.filter((item) => item.food.id !== food.id));
      return;
    }
    const resolved = resolveAmount(usualAmount(food), food.portion) ?? { portions: 1 };
    setPicked((current) => [...current, { food, ...resolved, isNew: isNewFood(food) }]);
  }

  function choose(food: FoodItem) {
    const existing = pickedOf(food.id);
    setSelected(food);
    setAmount(existing ? initialAmount(food.portion, { portions: existing.portions, grams: existing.grams }) : usualAmount(food));
    setView("detail");
  }

  /** Lo elegido con este alimento puesto (o con su cantidad nueva, si ya estaba). */
  function withItem(item: PickedFood) {
    return pickedOf(item.food.id) ? picked.map((current) => (current.food.id === item.food.id ? item : current)) : [...picked, item];
  }

  if (view === "detail" && selected) {
    const resolved = resolveAmount(amount, selected.portion);
    const factor = resolved?.portions ?? 0;
    const scanned = selected.id.startsWith("off-");
    const isNew = isNewFood(selected);
    const existing = pickedOf(selected.id);
    const item: PickedFood | null = resolved ? { food: selected, ...resolved, isNew } : null;
    const others = picked.filter((current) => current.food.id !== selected.id).length;
    const usual = usualPortions[selected.id] !== undefined ? "como la última vez" : undefined;
    return (
      <div className="nut-picker">
        <button type="button" className="link-button nut-back" onClick={() => setView(scanned && isNew && !existing ? "scan" : "list")}><ArrowLeft size={15} />Volver</button>
        <div className="nut-detail-head">
          <p className="meta">{scanned ? "Código de barras" : foodCategoryLabels[selected.category]}</p>
          <h3 className="title-m">{selected.name}</h3>
          <p className="muted">Porción: {selected.portion}</p>
        </div>
        <AmountInput portion={selected.portion} value={amount} onChange={setAmount} hint={usual} />
        <div className="nut-detail-values">
          {measure === "kcal" ? (
            <>
              <NumberMetric size="l" value={formatKcal(selected.kcal * factor)} unit="kcal" animate={false} />
              <MetaLine items={[`${Math.round(selected.protein * factor)} g proteína`, `${Math.round(selected.carbs * factor)} g carbohidratos`, `${Math.round(selected.fat * factor)} g grasa`]} />
            </>
          ) : (
            <NumberMetric size="l" value={Math.round(selected.protein * factor)} unit="g" label="de proteína" animate={false} />
          )}
        </div>
        {scanned && isNew && <p className="scan-source">Datos de Open Food Facts: revisa que coincidan con la etiqueta. Queda guardado en «Mis alimentos».</p>}
        <div className="nut-detail-actions">
          <Button size="l" block disabled={!item} onClick={() => item && onAdd(withItem(item))}>
            <Plus size={18} />
            {others ? `Agregar ${others + 1} a ${mealName}` : `Agregar a ${mealName}${resolved?.grams ? ` · ${amountLabel({ grams: resolved.grams, portions: resolved.portions, portion: selected.portion })}` : ""}`}
          </Button>
          <Button variant="secondary" size="l" block disabled={!item} onClick={() => { if (!item) return; setPicked(withItem(item)); setQuery(""); setView("list"); }}>
            {existing ? "Guardar cantidad" : <><Plus size={17} />Elegir otro alimento</>}
          </Button>
          {existing && <button type="button" className="link-button nut-unpick" onClick={() => { setPicked((current) => current.filter((entry) => entry.food.id !== selected.id)); setView("list"); }}>Quitar de lo elegido</button>}
        </div>
      </div>
    );
  }

  if (view === "custom" || view === "quick") {
    return <CustomFoodForm quick={view === "quick"} barcode={view === "custom" ? barcode : null} mealLabel={mealName} onBack={() => setView(barcode ? "scan" : "list")} onSave={(food) => onAdd([...picked, { food, portions: 1, isNew: true }])} />;
  }

  if (view === "scan") {
    return <BarcodeScanner known={customFoods} onBack={() => setView("list")} onFound={choose} onCreate={(code) => { setBarcode(code); setView("custom"); }} />;
  }

  const total = picked.reduce((sum, item) => sum + (measure === "kcal" ? item.food.kcal : item.food.protein) * item.portions, 0);

  return (
    <div className="nut-picker">
      <div className="scroll-x nut-meals" role="radiogroup" aria-label="¿A qué comida?">
        {mealSlots.map(({ value }) => (
          <button key={value} type="button" role="radio" aria-checked={meal === value} className="chip" onClick={() => onMealChange(value)}>{mealNames[value]}</button>
        ))}
      </div>
      <div className="nut-search">
        <label className="picker-search">
          <Search size={18} aria-hidden="true" />
          <input type="search" name="pulso-buscar-alimento" inputMode="search" enterKeyHint="search" autoComplete="off" autoCorrect="off" spellCheck={false} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca un alimento" aria-label="Buscar alimento" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Borrar búsqueda"><X size={16} /></button>}
        </label>
        <button type="button" className="nut-scan-button" onClick={() => { setBarcode(null); setView("scan"); }} aria-label="Escanear código de barras"><ScanBarcode size={21} /></button>
      </div>
      <div className="scroll-x nut-cats" role="group" aria-label="Categorías">
        <button type="button" className="chip" aria-pressed={category === null} onClick={() => setCategory(null)}>Todos</button>
        {categories.filter((key) => key !== "propios" || customFoods.length > 0).map((key) => (
          <button key={key} type="button" className="chip" aria-pressed={category === key} onClick={() => setCategory(category === key ? null : key)}>{foodCategoryLabels[key]}</button>
        ))}
      </div>

      {!browsing && repeat && (
        <button type="button" className="nut-repeat nut-repeat-yesterday" onClick={() => repeat.onRepeat(picked)}>
          <RotateCcw size={15} aria-hidden="true" />
          Repetir {mealName.toLowerCase()} de ayer · <span className="num">{repeat.detail}</span>
        </button>
      )}
      {!browsing && savedMeals.length > 0 && (
        <section className="nut-results">
          <div className="nut-results-head">
            <h4 className="meta">Tus comidas</h4>
            <button type="button" className="link-button" onClick={() => setEditingSaved((value) => !value)}>{editingSaved ? "Listo" : "Editar"}</button>
          </div>
          <ul className="nut-food-list">
            {savedMeals.map((saved) => (
              <li key={saved.id} className="nut-saved-row">
                <button type="button" className="nut-food" disabled={editingSaved} onClick={() => onAddSaved(saved, picked)}>
                  <span className="nut-saved-icon" aria-hidden="true"><Bookmark size={15} /></span>
                  <span className="grow">
                    <span className="nut-item-name">{saved.name}</span>
                    <small>{saved.items.length} {saved.items.length === 1 ? "alimento" : "alimentos"} · {saved.items.map((item) => item.name).join(", ")}</small>
                  </span>
                  <span className="num nut-item-kcal">{measureLabel(measure, saved.items)}</span>
                  {!editingSaved && <Plus size={16} className="subtle" aria-hidden="true" />}
                </button>
                {editingSaved && (
                  <button type="button" className="btn-icon small nut-saved-delete" onClick={() => onDeleteSaved(saved.id)} aria-label={`Eliminar ${saved.name}`}><Trash2 size={16} /></button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {showRecent && (
        <section className="nut-results">
          <h4 className="meta">Recientes</h4>
          <FoodList items={recentFoods} measure={measure} picked={picked} onChoose={choose} onToggle={toggle} />
        </section>
      )}
      {!browsing && suggestions.length > 0 && (
        <section className="nut-results">
          <h4 className="meta">{mealFor[meal]}</h4>
          <FoodList items={suggestions} measure={measure} picked={picked} onChoose={choose} onToggle={toggle} />
        </section>
      )}
      {browsing ? (
        <section className="nut-results">
          {results.length
            ? <FoodList items={results} measure={measure} picked={picked} onChoose={choose} onToggle={toggle} />
            : <p className="muted nut-empty">No encontramos «{query}». Puedes crearlo como alimento propio.</p>}
        </section>
      ) : (
        <p className="muted nut-empty">Busca entre <span className="num">{catalog.length}</span> alimentos, elige una categoría o escanea un código de barras.</p>
      )}

      {picked.length > 0 ? (
        <div className="nut-tray">
          <p className="nut-tray-sum">
            <b><span className="num">{picked.length}</span> {picked.length === 1 ? "elegido" : "elegidos"}</b> · <span className="num">{measure === "kcal" ? `${formatKcal(total)} kcal` : `${Math.round(total)} g de proteína`}</span>
          </p>
          <div className="scroll-x nut-tray-items" role="group" aria-label="Lo elegido: toca uno para cambiar su cantidad">
            {picked.map((item) => (
              <button key={item.food.id} type="button" className="chip nut-tray-chip" onClick={() => choose(item.food)}>
                {item.food.name}
                {(item.grams || item.portions !== 1) && <span className="num">{item.grams ? amountLabel({ grams: item.grams, portions: item.portions, portion: item.food.portion }) : `× ${item.portions.toLocaleString("es-CL")}`}</span>}
              </button>
            ))}
          </div>
          <Button size="l" block onClick={() => onAdd(picked)}><Plus size={18} />Agregar a {mealName}</Button>
        </div>
      ) : (
        <div className="nut-picker-actions">
          <Button variant="secondary" onClick={() => { setBarcode(null); setView("custom"); }}><PenLine size={16} />Crear alimento</Button>
          {measure === "kcal" && <Button variant="secondary" onClick={() => { setBarcode(null); setView("quick"); }}><Zap size={16} />Calorías rápidas</Button>}
        </div>
      )}
    </div>
  );
}

/** Alimentos del catálogo: tocar uno abre su cantidad; «+» lo suma a lo elegido sin salir de la lista. */
function FoodList({ items, measure, picked, onChoose, onToggle }: { items: FoodItem[]; measure: Measure; picked: PickedFood[]; onChoose: (food: FoodItem) => void; onToggle: (food: FoodItem) => void }) {
  return (
    <ul className="nut-food-list">
      {items.map((food) => {
        const chosen = picked.find((item) => item.food.id === food.id);
        const factor = chosen?.portions ?? 1;
        return (
          <li key={food.id} className={cn("nut-food-row", chosen && "is-picked")}>
            <button type="button" className="nut-food" onClick={() => onChoose(food)}>
              <span className="grow">
                <span className="nut-item-name">{food.name}</span>
                <small>{chosen ? amountLabel({ grams: chosen.grams, portions: chosen.portions, portion: food.portion }) : food.portion}</small>
              </span>
              <span className="num nut-item-kcal">{measure === "kcal" ? formatKcal(food.kcal * factor) : `${Math.round(food.protein * factor)} g`}</span>
            </button>
            <button type="button" className="nut-pick" aria-pressed={Boolean(chosen)} aria-label={chosen ? `Quitar ${food.name} de lo elegido` : `Elegir ${food.name}`} onClick={() => onToggle(food)}>
              {chosen ? <Check size={17} strokeWidth={2.6} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Alimento propio (queda guardado, con su código si se escaneó) o calorías rápidas (sólo para este registro). */
function CustomFoodForm({ quick, barcode, mealLabel, onBack, onSave }: { quick: boolean; barcode: string | null; mealLabel: string; onBack: () => void; onSave: (food: FoodItem, portions: number) => void }) {
  const [name, setName] = useState("");
  const [portion, setPortion] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const kcalValue = parse(kcal);
  const valid = (quick || name.trim().length > 1) && kcal.trim() !== "" && Number.isFinite(kcalValue) && kcalValue > 0 && kcalValue <= 5000;

  function save() {
    if (!valid) return;
    const id = quick ? "rapido" : barcode ? barcodeFoodId(barcode) : `propio-${Date.now().toString(36)}`;
    onSave({
      id,
      name: name.trim() || "Calorías rápidas",
      portion: portion.trim() || (quick ? "Registro rápido" : "1 porción"),
      kcal: Math.round(kcalValue),
      protein: Math.max(0, parse(protein)),
      carbs: Math.max(0, parse(carbs)),
      fat: Math.max(0, parse(fat)),
      category: "propios",
    }, 1);
  }

  return (
    <div className="nut-picker nut-custom">
      <button type="button" className="link-button nut-back" onClick={onBack}><ArrowLeft size={15} />Volver</button>
      <div className="nut-detail-head">
        <h3 className="title-m">{quick ? "Calorías rápidas" : "Crear alimento"}</h3>
        <p className="muted">{quick ? "Anota sólo las calorías cuando no encuentres el alimento." : barcode ? <>Copia los datos de la etiqueta. Queda guardado con el código <span className="num">{barcode}</span>: la próxima vez que lo escanees, aparece directo.</> : "Queda guardado en «Mis alimentos» para la próxima vez."}</p>
      </div>
      <label className="field">
        {quick ? "Descripción (opcional)" : "Nombre"}
        <input name="pulso-alimento-nombre" autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} placeholder={quick ? "Ej.: almuerzo en el trabajo" : "Ej.: Pan amasado"} maxLength={60} />
      </label>
      {!quick && (
        <label className="field">
          Porción
          <input name="pulso-alimento-porcion" autoComplete="off" value={portion} onChange={(event) => setPortion(event.target.value)} placeholder="Ej.: 1 unidad (120 g)" maxLength={40} />
        </label>
      )}
      <div className={cn("nut-quad", quick && "is-quick")}>
        <label className="field">Calorías<input inputMode="numeric" value={kcal} onChange={(event) => setKcal(event.target.value)} placeholder="kcal" /></label>
        <label className="field">Proteína (g)<input inputMode="decimal" value={protein} onChange={(event) => setProtein(event.target.value)} placeholder="0" /></label>
        <label className="field">Carbohidratos (g)<input inputMode="decimal" value={carbs} onChange={(event) => setCarbs(event.target.value)} placeholder="0" /></label>
        <label className="field">Grasa (g)<input inputMode="decimal" value={fat} onChange={(event) => setFat(event.target.value)} placeholder="0" /></label>
      </div>
      <Button size="l" block disabled={!valid} onClick={save}><Plus size={18} />{quick ? `Agregar a ${mealLabel}` : `Guardar y agregar a ${mealLabel}`}</Button>
    </div>
  );
}
