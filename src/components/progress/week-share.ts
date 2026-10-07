import { isotype } from "@/components/brand/isotype";
import { volumeLabel, type Unit } from "@/components/progress/format";
import type { WeekRecap } from "@/lib/week-recap";
import { formatShortDate, toDisplayWeight } from "@/lib/utils";

/** Qué partes opcionales van en lo compartido (el entrenamiento va siempre). */
export interface ShareParts { nutrition: boolean; water: boolean; weight: boolean }

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const plural = (count: number, one: string, many: string) => `${count.toLocaleString("es-CL")} ${count === 1 ? one : many}`;

/** Cambio de peso con signo: «−0,6 kg», «+0,4 kg». */
export function signedWeight(kg: number, unit: Unit) {
  const value = toDisplayWeight(Math.abs(kg), unit).toLocaleString("es-CL", { maximumFractionDigits: 1 });
  return `${kg < 0 ? "−" : kg > 0 ? "+" : ""}${value} ${unit}`;
}

/** Las líneas opcionales, iguales en la imagen y en el texto. */
export function extraLines(recap: WeekRecap, unit: Unit, parts: ShareParts) {
  const lines: Array<{ label: string; value: string }> = [];
  if (parts.nutrition && recap.nutrition) lines.push({ label: "Nutrición", value: `${recap.nutrition.kcal.toLocaleString("es-CL")} kcal · ${recap.nutrition.protein} g proteína al día` });
  if (parts.water && recap.water) lines.push({ label: "Agua", value: `meta cumplida ${recap.water.met} de ${plural(recap.water.days, "día", "días")}` });
  if (parts.weight && recap.weight) lines.push({ label: "Peso", value: `${signedWeight(recap.weight.change, unit)} en la semana` });
  return lines;
}

/** Versión en texto (para compartir sin imagen o copiar). */
export function recapText(recap: WeekRecap, unit: Unit, parts: ShareParts) {
  const lines = [`Mi semana en PULSO · ${formatShortDate(recap.start)} – ${formatShortDate(recap.end)}`];
  lines.push(`${plural(recap.sessions, "entrenamiento", "entrenamientos")} (meta: ${recap.goal})${recap.minutes ? ` · ${recap.minutes.toLocaleString("es-CL")} min` : ""}`);
  const lift = [recap.volume > 0 ? `${volumeLabel(recap.volume, unit)} levantados` : "", recap.prs > 0 ? plural(recap.prs, "récord", "récords") : ""].filter(Boolean);
  if (lift.length) lines.push(lift.join(" · "));
  if (recap.streak > 0) lines.push(`Racha: ${plural(recap.streak, "semana", "semanas")} cumpliendo la meta`);
  for (const line of extraLines(recap, unit, parts)) lines.push(`${line.label}: ${line.value}`);
  lines.push("Tu salud en movimiento.");
  return lines.join("\n");
}

const W = 1080;
const H = 1350;
const P = 88;

/**
 * La semana como imagen vertical (1080 × 1350, formato de publicación): fondo carbón con el brillo
 * del color de acento, títulos condensados en mayúsculas y los días entrenados marcados.
 */
export async function recapImage(recap: WeekRecap, unit: Unit, parts: ShareParts): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sin canvas");
  const css = getComputedStyle(document.documentElement);
  const display = css.getPropertyValue("--font-archivo").trim() || "system-ui, sans-serif";
  const body = css.getPropertyValue("--font-geist").trim() || "system-ui, sans-serif";
  const accent = css.getPropertyValue("--accent").trim() || "#ff351f";
  const accentBright = css.getPropertyValue("--accent-bright").trim() || "#ff7a2f";
  const accentInk = css.getPropertyValue("--accent-ink").trim() || "#0a0a0a";
  await Promise.all([document.fonts.load(`800 100px ${display}`), document.fonts.load(`600 30px ${body}`)]).catch(() => undefined);

  const font = (weight: number, size: number, family: string, stretch: CanvasFontStretch = "normal", spacing = 0) => {
    ctx.font = `${weight} ${size}px ${family}`;
    if ("fontStretch" in ctx) ctx.fontStretch = stretch;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing}px`;
  };
  /** Achica el texto hasta que quepa en el ancho. */
  const fit = (value: string, weight: number, size: number, family: string, maxWidth: number, stretch: CanvasFontStretch = "normal") => {
    let current = size;
    font(weight, current, family, stretch);
    while (ctx.measureText(value).width > maxWidth && current > 16) {
      current -= 4;
      font(weight, current, family, stretch);
    }
    return current;
  };
  const muted = "rgba(255, 255, 255, .58)";

  // Fondo y brillo del acento.
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, W, H);
  const glow = (x: number, y: number, radius: number, alpha: number) => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, accent);
    gradient.addColorStop(1, "transparent");
    ctx.globalAlpha = alpha;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  };
  glow(W * 0.92, H * 0.05, 760, 0.42);
  glow(W * 0.05, H * 0.98, 620, 0.12);

  // Marca (isotipo con el gradiente y «PULSO» ancho, como el logo) y semana.
  const markW = 52;
  const markTop = 118 - (markW * isotype.ratio) / 2;
  ctx.save();
  ctx.translate(P, markTop);
  ctx.scale(markW / 100, markW / 100);
  const brandFill = ctx.createLinearGradient(0, 0, 100, 88);
  brandFill.addColorStop(0, accent);
  brandFill.addColorStop(1, accentBright);
  ctx.fillStyle = brandFill;
  for (const d of isotype.paths) ctx.fill(new Path2D(d));
  ctx.restore();
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fff";
  font(800, 38, display, "expanded", 1.5);
  ctx.textAlign = "left";
  ctx.fillText("PULSO", P + markW + 18, 132);
  ctx.fillStyle = muted;
  font(600, 25, body, "normal", 3);
  ctx.textAlign = "right";
  ctx.fillText(recap.label.toUpperCase(), W - P, 128);
  ctx.textAlign = "left";

  // Título.
  ctx.fillStyle = "#fff";
  fit("MI SEMANA", 800, 176, display, W - 2 * P, "condensed");
  ctx.fillText("MI SEMANA", P - 4, 318);
  if (recap.current) {
    ctx.fillStyle = accent;
    font(700, 25, body, "normal", 4);
    ctx.fillText("EN CURSO", P, 368);
  }

  // Entrenamientos en grande y la meta.
  ctx.fillStyle = accent;
  font(800, 320, display, "condensed");
  const big = String(recap.sessions);
  ctx.fillText(big, P - 8, 650);
  const x = P + ctx.measureText(big).width + 34;
  ctx.fillStyle = "#fff";
  fit(recap.sessions === 1 ? "ENTRENAMIENTO" : "ENTRENAMIENTOS", 800, 64, display, W - P - x, "condensed");
  ctx.fillText(recap.sessions === 1 ? "ENTRENAMIENTO" : "ENTRENAMIENTOS", x, 530);
  const met = recap.sessions >= recap.goal;
  const left = recap.goal - recap.sessions;
  const goalLine = met ? `Meta de ${recap.goal} cumplida` : recap.current ? `Meta: ${recap.goal} · ${left === 1 ? "falta 1" : `faltan ${left}`}` : `Meta: ${recap.goal}`;
  ctx.fillStyle = met ? accent : muted;
  fit(goalLine, 600, 34, body, W - P - x);
  ctx.fillText(goalLine, x, 588);

  // Días de la semana.
  const gap = 18;
  const size = (W - 2 * P - gap * 6) / 7;
  const cy = 780;
  recap.days.forEach((day, index) => {
    const cx = P + size / 2 + index * (size + gap);
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    if (day.trained) {
      ctx.fillStyle = accent;
      ctx.fill();
    } else {
      ctx.setLineDash(day.future ? [8, 10] : []);
      ctx.lineWidth = 3;
      ctx.strokeStyle = day.future ? "rgba(255, 255, 255, .16)" : "rgba(255, 255, 255, .26)";
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = day.trained ? accentInk : day.future ? "rgba(255, 255, 255, .3)" : muted;
    font(800, 40, display, "condensed");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(DAY_LETTERS[index], cx, cy + 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  });

  // Cifras.
  const stats: Array<{ label: string; value: string; unit?: string }> = [
    { label: "VOLUMEN", ...splitUnit(recap.volume > 0 ? volumeLabel(recap.volume, unit) : "—") },
    { label: "MINUTOS", value: recap.minutes.toLocaleString("es-CL"), unit: "min" },
    { label: "RÉCORDS", value: String(recap.prs) },
    { label: "RACHA", value: String(recap.streak), unit: recap.streak === 1 ? "semana" : "semanas" },
  ];
  const extras = extraLines(recap, unit, parts);
  const compact = extras.length > 0;
  const column = (W - 2 * P - 40) / 2;
  const top = compact ? 885 : 940;
  const rowHeight = compact ? 120 : 150;
  const valueOffset = compact ? 68 : 90;
  stats.forEach((stat, index) => {
    const sx = P + (index % 2) * (column + 40);
    const sy = top + Math.floor(index / 2) * rowHeight;
    ctx.fillStyle = muted;
    font(600, 23, body, "normal", 3);
    ctx.fillText(stat.label, sx, sy);
    ctx.fillStyle = "#fff";
    font(800, compact ? 64 : 84, display, "condensed");
    ctx.fillText(stat.value, sx, sy + valueOffset);
    if (stat.unit) {
      const width = ctx.measureText(stat.value).width;
      ctx.fillStyle = muted;
      font(600, 28, body);
      ctx.fillText(stat.unit, sx + width + 12, sy + valueOffset);
    }
  });

  // Nutrición, agua y peso (si se eligieron), desde el pie hacia arriba.
  if (extras.length) {
    const step = 44;
    let y = H - 118 - (extras.length - 1) * step;
    ctx.fillStyle = "rgba(255, 255, 255, .12)";
    ctx.fillRect(P, y - 44, W - 2 * P, 2);
    for (const line of extras) {
      ctx.fillStyle = muted;
      font(600, 22, body, "normal", 3);
      ctx.fillText(line.label.toUpperCase(), P, y + 8);
      ctx.fillStyle = "#fff";
      const value = line.value.charAt(0).toUpperCase() + line.value.slice(1);
      fit(value, 600, 30, body, W - 2 * P - 230);
      ctx.fillText(value, P + 230, y + 8);
      y += step;
    }
  }

  // Pie.
  ctx.fillStyle = "rgba(255, 255, 255, .42)";
  font(600, 24, body, "normal", 1);
  ctx.fillText("Tu salud en movimiento.", P, H - 52);

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Sin imagen"))), "image/png"));
}

/** «12,4 t» → valor «12,4» y unidad «t». */
function splitUnit(label: string) {
  const match = label.match(/^([\d.,]+)\s+(.+)$/);
  return match ? { value: match[1], unit: match[2] } : { value: label };
}

