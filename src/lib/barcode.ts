import type { FoodItem } from "@/types";

/**
 * Productos envasados por código de barras con Open Food Facts (base abierta y gratuita). Los valores
 * vienen por 100 g; si el producto informa su porción, se usa esa porción.
 */

interface OffProduct {
  product_name?: string;
  product_name_es?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  serving_quantity_unit?: string;
  nutriments?: Record<string, number | string | undefined>;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Id de un alimento con código de barras (de Open Food Facts o creado a mano tras escanearlo). */
export const barcodeFoodId = (code: string) => `off-${code}`;

export function foodFromOpenFoodFacts(code: string, product: OffProduct): FoodItem | null {
  const n = product.nutriments ?? {};
  const num = (key: string) => {
    const value = Number(n[key]);
    return Number.isFinite(value) ? value : 0;
  };
  const kcal100 = num("energy-kcal_100g") || num("energy_100g") / 4.184;
  if (!kcal100) return null;
  const name = (product.product_name_es || product.product_name || "").trim();
  if (!name) return null;
  // La marca sólo si el nombre no la trae ya («Coca-Cola Original» no necesita «COCA-COLA SERVICES»).
  const brand = product.brands?.split(",")[0]?.trim();
  const brandWord = brand?.split(/\s+/)[0]?.toLowerCase();
  const showBrand = brand && brandWord && brand.length <= 24 && !name.toLowerCase().includes(brandWord);
  const serving = Number(product.serving_quantity);
  const grams = Number.isFinite(serving) && serving > 0 && serving < 1000 ? serving : 100;
  const unit = (product.serving_quantity_unit ?? product.serving_size ?? "").toLowerCase().includes("ml") ? "ml" : "g";
  const factor = grams / 100;
  return {
    id: barcodeFoodId(code),
    name: showBrand ? `${name} · ${brand}` : name,
    portion: grams === 100 ? `100 ${unit}` : `1 porción (${round1(grams)} ${unit})`,
    kcal: Math.round(kcal100 * factor),
    protein: round1(num("proteins_100g") * factor),
    carbs: round1(num("carbohydrates_100g") * factor),
    fat: round1(num("fat_100g") * factor),
    category: "propios",
  };
}

export type LookupResult = { status: "found"; food: FoodItem } | { status: "missing" } | { status: "error" };

/** Busca un código de barras (EAN/UPC). */
export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<LookupResult> {
  const clean = code.replace(/\D/g, "");
  if (clean.length < 8) return { status: "missing" };
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=product_name,product_name_es,brands,serving_size,serving_quantity,serving_quantity_unit,nutriments`, { signal });
    if (response.status === 404) return { status: "missing" };
    if (!response.ok) return { status: "error" };
    const data = (await response.json()) as { status?: number; product?: OffProduct };
    if (data.status !== 1 || !data.product) return { status: "missing" };
    const food = foodFromOpenFoodFacts(clean, data.product);
    return food ? { status: "found", food } : { status: "missing" };
  } catch {
    return { status: "error" };
  }
}

type Detector = { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> };

/** Lector de códigos: el nativo del navegador si existe; si no (iPhone), ZXing servido desde /wasm. */
export async function createBarcodeDetector(): Promise<Detector> {
  const formats = ["ean_13", "ean_8", "upc_a", "upc_e"];
  const native = (globalThis as { BarcodeDetector?: new (options: { formats: string[] }) => Detector }).BarcodeDetector;
  if (native) {
    try {
      return new native({ formats });
    } catch {
      // Algunos navegadores lo exponen sin soportar estos formatos: se usa ZXing.
    }
  }
  const { BarcodeDetector, prepareZXingModule } = await import("barcode-detector/ponyfill");
  prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? "/wasm/zxing_reader.wasm" : prefix + path) } });
  return new BarcodeDetector({ formats: formats as ("ean_13" | "ean_8" | "upc_a" | "upc_e")[] });
}
