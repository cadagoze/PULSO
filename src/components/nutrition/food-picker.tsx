"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Bookmark, ChevronRight, PenLine, Plus, ScanBarcode, Search, Trash2, X, Zap } from "lucide-react";
import { Button, MetaLine, NumberMetric } from "@/components/ui";
import { AmountInput, initialAmount, resolveAmount, type Amount } from "@/components/nutrition/amount-input";
import { BarcodeScanner } from "@/components/nutrition/barcode-scanner";
import { barcodeFoodId } from "@/lib/barcode";
import { foodCategoryLabels, foods } from "@/data/foods";
import { amountLabel, entryTotals, formatKcal } from "@/lib/nutrition";
import { cn, normalizeText } from "@/lib/utils";
import type { FoodCategory, FoodEntry, FoodItem, SavedMeal } from "@/types";

type View = "list" | "detail" | "custom" | "quick" | "scan";
const categories = Object.keys(foodCategoryLabels) as FoodCategory[];
const parse = (value: string) => Number(value.trim().replace(",", ".") || 0);

/**
 * Buscador para registrar un alimento en una comida: recientes, categorías, búsqueda sin tildes y
 * código de barras; luego porciones o gramos con calorías y macros en vivo. También permite crear
 * alimentos propios y anotar calorías rápidas.
 */
export function FoodPicker({ mealLabel, customFoods, recent, savedMeals, usualPortions, usualGrams, onPick, onCreate, onPickSaved, onDeleteSaved }: {
  mealLabel: string;
  customFoods: FoodItem[];
  recent: FoodEntry[];
  savedMeals: SavedMeal[];
  /** Última porción usada de cada alimento (se propone al elegirlo). */
  usualPortions: Record<string, number>;
  /** Gramos de la última vez, si se registró en gramos. */
  usualGrams: Record<string, number>;
  onPick: (food: FoodItem, portions: number, grams?: number) => void;
  /** Alimento nuevo (creado o escaneado): se guarda en «Mis alimentos» y se registra. */
  onCreate: (food: FoodItem, portions: number, grams?: number) => void;
  onPickSaved: (saved: SavedMeal) => void;
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

  const catalog = useMemo(() => [...customFoods, ...foods], [customFoods]);
  const results = useMemo(() => {
    const words = normalizeText(query).split(/\s+/).filter(Boolean);
    return catalog.filter((food) => (!category || food.category === category) && words.every((word) => normalizeText(food.name).includes(word))).slice(0, 80);
  }, [catalog, category, query]);
  const recentFoods = recent.map((entry) => catalog.find((food) => food.id === entry.foodId)).filter((food): food is FoodItem => Boolean(food));
  const showRecent = !query.trim() && !category && recentFoods.length > 0;

  function choose(food: FoodItem) {
    setSelected(food);
    setAmount(initialAmount(food.portion, { portions: usualPortions[food.id], grams: usualGrams[food.id] }));
    setView("detail");
  }

  if (view === "detail" && selected) {
    const resolved = resolveAmount(amount, selected.portion);
    const factor = resolved?.portions ?? 0;
    const scanned = selected.id.startsWith("off-");
    const isNew = !catalog.some((food) => food.id === selected.id);
    const usual = usualPortions[selected.id] !== undefined ? "como la última vez" : undefined;
    return (
      <div className="nut-picker">
        <button type="button" className="link-button nut-back" onClick={() => setView(scanned && isNew ? "scan" : "list")}><ArrowLeft size={15} />Volver</button>
        <div className="nut-detail-head">
          <p className="meta">{scanned ? "Código de barras" : foodCategoryLabels[selected.category]}</p>
          <h3 className="title-m">{selected.name}</h3>
          <p className="muted">Porción: {selected.portion}</p>
        </div>
        <AmountInput portion={selected.portion} value={amount} onChange={setAmount} hint={usual} />
        <div className="nut-detail-values">
          <NumberMetric size="l" value={formatKcal(selected.kcal * factor)} unit="kcal" />
          <MetaLine items={[`${Math.round(selected.protein * factor)} g proteína`, `${Math.round(selected.carbs * factor)} g carbohidratos`, `${Math.round(selected.fat * factor)} g grasa`]} />
        </div>
        {scanned && isNew && <p className="scan-source">Datos de Open Food Facts: revisa que coincidan con la etiqueta. Queda guardado en «Mis alimentos».</p>}
        <Button size="l" block disabled={!resolved} onClick={() => resolved && (isNew ? onCreate : onPick)(selected, resolved.portions, resolved.grams)}><Plus size={18} />Agregar a {mealLabel}{resolved?.grams ? ` · ${amountLabel({ grams: resolved.grams, portions: resolved.portions, portion: selected.portion })}` : ""}</Button>
      </div>
    );
  }

  if (view === "custom" || view === "quick") {
    return <CustomFoodForm quick={view === "quick"} barcode={view === "custom" ? barcode : null} mealLabel={mealLabel} onBack={() => setView(barcode ? "scan" : "list")} onSave={onCreate} />;
  }

  if (view === "scan") {
    return <BarcodeScanner known={customFoods} onBack={() => setView("list")} onFound={choose} onCreate={(code) => { setBarcode(code); setView("custom"); }} />;
  }

  return (
    <div className="nut-picker">
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

      {!query.trim() && !category && savedMeals.length > 0 && (
        <section className="nut-results">
          <div className="nut-results-head">
            <h4 className="meta">Tus comidas</h4>
            <button type="button" className="link-button" onClick={() => setEditingSaved((value) => !value)}>{editingSaved ? "Listo" : "Editar"}</button>
          </div>
          <ul className="nut-food-list">
            {savedMeals.map((saved) => (
              <li key={saved.id} className="nut-saved-row">
                <button type="button" className="nut-food" disabled={editingSaved} onClick={() => onPickSaved(saved)}>
                  <span className="nut-saved-icon" aria-hidden="true"><Bookmark size={15} /></span>
                  <span className="grow">
                    <span className="nut-item-name">{saved.name}</span>
                    <small>{saved.items.length} {saved.items.length === 1 ? "alimento" : "alimentos"} · {saved.items.map((item) => item.name).join(", ")}</small>
                  </span>
                  <span className="num nut-item-kcal">{formatKcal(entryTotals(saved.items).kcal)}</span>
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
          <FoodList items={recentFoods} onChoose={choose} />
        </section>
      )}
      <section className="nut-results">
        {showRecent && <h4 className="meta">Todos los alimentos</h4>}
        {results.length ? <FoodList items={results} onChoose={choose} /> : <p className="muted nut-empty">No encontramos «{query}». Puedes crearlo como alimento propio.</p>}
      </section>

      <div className="nut-picker-actions">
        <Button variant="secondary" onClick={() => { setBarcode(null); setView("custom"); }}><PenLine size={16} />Crear alimento</Button>
        <Button variant="secondary" onClick={() => { setBarcode(null); setView("quick"); }}><Zap size={16} />Calorías rápidas</Button>
      </div>
    </div>
  );
}

function FoodList({ items, onChoose }: { items: FoodItem[]; onChoose: (food: FoodItem) => void }) {
  return (
    <ul className="nut-food-list">
      {items.map((food) => (
        <li key={food.id}>
          <button type="button" className="nut-food" onClick={() => onChoose(food)}>
            <span className="grow">
              <span className="nut-item-name">{food.name}</span>
              <small>{food.portion}</small>
            </span>
            <span className="num nut-item-kcal">{formatKcal(food.kcal)}</span>
            <ChevronRight size={16} className="subtle" aria-hidden="true" />
          </button>
        </li>
      ))}
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
